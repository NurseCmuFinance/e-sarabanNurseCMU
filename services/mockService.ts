
import { supabase } from '../supabaseClient';
import { Document, DocStatus, Profile, UserRole, DocumentLog, DashboardStats, MasterData, DocPriority, ChatSession, ChatMessage, DataSourceConfig, RunningConfig, PermissionType, NotificationConfig, StorageConfig } from '../types';

const checkConnection = () => {
    if (!supabase) throw new Error("⚠️ ยังไม่ได้เชื่อมต่อ Supabase!");
};

const getErrorMessage = (error: any): string => {
    if (!error) return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
    if (typeof error === 'string') return error;
    if (error.error_description) return String(error.error_description);
    if (error.message) {
        if (error.message === 'Invalid login credentials') return "บัญชีผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
        if (error.message.includes('column "priority"')) return "ฟิลด์ความเร่งด่วนยังไม่มีในฐานข้อมูล (ระบบข้ามให้อัตโนมัติแล้ว)";
        if (error.message.includes('column "registration_date"')) return "ฟิลด์วันที่ลงทะเบียนยังไม่มีในฐานข้อมูล (ระบบข้ามให้อัตโนมัติแล้ว)";
        if (error.message.includes('Could not find the table')) return `ระบบฐานข้อมูลยังไม่พร้อม: ไม่พบตาราง ${error.message.split(' ').pop()}`;
        return String(error.message);
    }
    if (error.code && error.message) return `Error ${error.code}: ${error.message}`;
    try { return JSON.stringify(error); } catch (e) { return String(error); }
};

const handleSupabaseResponse = <T>(data: T | null, error: any, defaultValue: T): T => {
    if (error) {
        const isTableMissing = error.code === 'PGRST204' || (error.message && error.message.includes('Could not find the table'));
        if (isTableMissing) {
            console.warn("Graceful Fallback: Table missing in Supabase. Returning empty data.", error.message);
            return defaultValue;
        }
        // Graceful fallback for missing columns in select
        if (error.code === 'PGRST301' || (error.message && error.message.includes('column') && error.message.includes('does not exist'))) {
             console.warn("Column missing in Supabase. Returning default data.", error.message);
             return defaultValue;
        }
        // Graceful fallback for Failed to fetch (Supabase paused or network error)
        if (error.message === 'Failed to fetch' || error.message === 'TypeError: Failed to fetch') {
             console.warn("Network error or Supabase paused. Returning default data.", error.message);
             return defaultValue;
        }
        throw new Error(getErrorMessage(error));
    }
    return (data || defaultValue) as T;
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// Use * to avoid errors if specific columns don't exist yet
const DB_COLUMNS = '*';
const LIST_DB_COLUMNS = 'id, book_no, book_year, external_book_no, doc_date, registration_date, from_origin, to_recipient_id, recipient_name, subject, status, priority, remark, is_cancelled, tracking_code, created_at, updated_at, sender_type, creator_id';

const cleanPayload = (data: any) => {
    // Keep status here because updateDocument needs it, but createDocument will strip it manually
    const { priority, registration_date, file, ...clean } = data;
    // We retain special fields in caller or fix it here if needed
    return clean;
};

// --- Notification Logic ---
const DEFAULT_NOTI_CONFIG: NotificationConfig = {
    emailEnabled: true,
    emailSubjectTemplate: 'แจ้งเตือนเอกสารใหม่: {{subject}}',
    emailBodyTemplate: 'เรียน {{recipient_name}},\n\nมีเอกสารใหม่ส่งถึงท่าน\n\nเรื่อง: {{subject}}\nเลขรับ: {{book_no}}/{{book_year}}\nจาก: {{from_origin}}\nความเร่งด่วน: {{priority}}\n\nรายละเอียด/หมายเหตุ: {{remark}}\n\nกรุณาเข้าสู่ระบบเพื่อดำเนินการ: {{app_url}}\n\nขอบคุณครับ',
    gmailClientId: '445120403671-qq9fnj4fm3njitlrloujedqk4ckm1ah5.apps.googleusercontent.com',
    gmailClientSecret: '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',
    lineEnabled: false,
    lineChannelAccessToken: '',
    lineChannelSecret: ''
};

// In a real app, this would be in a DB table. Using LocalStorage for this mock to persist across reloads.
export const getNotificationConfig = async (): Promise<NotificationConfig> => {
    const stored = localStorage.getItem('esaraban_noti_config');
    return stored ? { ...DEFAULT_NOTI_CONFIG, ...JSON.parse(stored) } : DEFAULT_NOTI_CONFIG;
};

export const saveNotificationConfig = async (config: NotificationConfig) => {
    localStorage.setItem('esaraban_noti_config', JSON.stringify(config));
    return true;
};

// --- Storage Logic ---
const DEFAULT_STORAGE_CONFIG: StorageConfig = {
    provider: 'local',
    googleDriveEnabled: false
};

export const getStorageConfig = async (): Promise<StorageConfig> => {
    const stored = localStorage.getItem('esaraban_storage_config');
    return stored ? { ...DEFAULT_STORAGE_CONFIG, ...JSON.parse(stored) } : DEFAULT_STORAGE_CONFIG;
};

export const saveStorageConfig = async (config: StorageConfig) => {
    localStorage.setItem('esaraban_storage_config', JSON.stringify(config));
    return true;
};

// Helper to encode string to Base64Url (Safe for UTF-8/Thai)
const utf8_to_b64 = (str: string) => {
    return window.btoa(unescape(encodeURIComponent(str)));
};

// ฟังก์ชันใหม่: ต่ออายุ Token อัตโนมัติ
const refreshGmailToken = async (config: NotificationConfig): Promise<string | null> => {
    if (!config.gmailRefreshToken || !config.gmailClientId || !config.gmailClientSecret) {
        console.warn("Missing credentials for refresh");
        return null;
    }

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: config.gmailClientId,
                client_secret: config.gmailClientSecret,
                refresh_token: config.gmailRefreshToken,
                grant_type: 'refresh_token',
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Token Refresh Failed: ${err.error_description || err.error}`);
        }

        const data = await response.json();
        
        // Update Local Config
        const newConfig = {
            ...config,
            gmailAccessToken: data.access_token,
            gmailTokenExpiry: Date.now() + (data.expires_in * 1000)
        };
        await saveNotificationConfig(newConfig);
        console.log("Gmail Token Refreshed Successfully");
        
        return data.access_token;
    } catch (e) {
        console.error("Auto-refresh failed:", e);
        return null;
    }
};

const sendGmail = async (to: string, subject: string, body: string, accessToken: string) => {
    // Construct Raw Email (MIME)
    const emailLines = [
        `To: ${to}`,
        `Subject: =?UTF-8?B?${utf8_to_b64(subject)}?=`, // Encode Subject for UTF-8
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "",
        body
    ];
    const email = emailLines.join("\r\n");
    const base64EncodedEmail = utf8_to_b64(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            raw: base64EncodedEmail
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        // ถ้า Error 401 (Unauthorized) อาจแปลว่า Token หมดอายุจริงๆ
        if (response.status === 401) throw new Error("TOKEN_EXPIRED");
        throw new Error(`Gmail API Error: ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
};

const sendEmailNotification = async (doc: Document, recipientId: string, trigger: 'new' | 'update' | 'forward') => {
    try {
        let config = await getNotificationConfig();
        if (!config.emailEnabled) return;

        // Fetch Recipient Email
        const { data: recipient } = await supabase!.from('profiles').select('email, full_name').eq('id', recipientId).single();
        if (!recipient || !recipient.email) {
            console.warn("Notification skipped: Recipient has no email.");
            return;
        }

        // Replace placeholders
        let subject = config.emailSubjectTemplate;
        let body = config.emailBodyTemplate;
        
        const replacements: Record<string, string> = {
            '{{subject}}': doc.subject || '-',
            '{{book_no}}': doc.book_no ? String(doc.book_no) : '-',
            '{{book_year}}': String(doc.book_year),
            '{{recipient_name}}': recipient.full_name || '-',
            '{{from_origin}}': doc.from_origin || '-',
            '{{priority}}': doc.priority || '-',
            '{{tracking_code}}': doc.tracking_code || '-',
            '{{remark}}': doc.remark || '-',
            '{{app_url}}': window.location.origin
        };

        Object.keys(replacements).forEach(key => {
            const val = replacements[key];
            subject = subject.replace(new RegExp(key, 'g'), val);
            body = body.replace(new RegExp(key, 'g'), val);
        });

        // 1. Try sending via Gmail API if configured
        if (config.gmailClientId) {
            let token = config.gmailAccessToken;
            
            // Check expiry and refresh if needed BEFORE sending
            const isExpired = config.gmailTokenExpiry && Date.now() > (config.gmailTokenExpiry - 60000); // Buffer 1 min
            
            if (isExpired && config.gmailRefreshToken) {
                const newToken = await refreshGmailToken(config);
                if (newToken) token = newToken;
            }

            if (token) {
                try {
                    await sendGmail(recipient.email, subject, body, token);
                    const event = new CustomEvent('esaraban-toast', { 
                        detail: { type: 'success', message: `📧 ส่งอีเมลผ่าน Gmail สำเร็จ!\nถึง: ${recipient.email}` } 
                    });
                    window.dispatchEvent(event);
                    return; // Exit success
                } catch (err: any) {
                    // Retry logic for 401
                    if (err.message === "TOKEN_EXPIRED" && config.gmailRefreshToken) {
                        console.log("Token expired during send, forcing refresh...");
                        const newToken = await refreshGmailToken(config);
                        if (newToken) {
                            await sendGmail(recipient.email, subject, body, newToken);
                            const event = new CustomEvent('esaraban-toast', { 
                                detail: { type: 'success', message: `📧 ส่งอีเมลสำเร็จ (Auto-Refreshed)` } 
                            });
                            window.dispatchEvent(event);
                            return;
                        }
                    }
                    throw err; // Rethrow if not handled
                }
            } else if (config.gmailRefreshToken) {
                 // Try one last refresh if we have RT but no AT
                 const newToken = await refreshGmailToken(config);
                 if (newToken) {
                    await sendGmail(recipient.email, subject, body, newToken);
                    return;
                 }
            }
        }

        // 2. Fallback to Simulation
        console.log(`%c[EMAIL SIMULATION] To: ${recipient.email}`, 'color: green; font-weight: bold');
        console.log(`Subject: ${subject}`);
        console.log(`Body: \n${body}`);

        const event = new CustomEvent('esaraban-toast', { 
            detail: { 
                type: 'info', 
                message: `📧 [จำลอง] ระบบส่งอีเมล (Simulation Mode)\nถึง: ${recipient.full_name}\n(ไม่ได้เชื่อมต่อ Gmail API)` 
            } 
        });
        window.dispatchEvent(event);
        
    } catch (e: any) {
        console.error("Failed to send notification:", e);
        const event = new CustomEvent('esaraban-toast', { 
            detail: { type: 'error', message: `ส่งอีเมลไม่สำเร็จ: ${e.message}` } 
        });
        window.dispatchEvent(event);
    }
};

export const addLog = async (docId: string, action: string, actor: Profile, details: string) => {
    checkConnection();
    try {
        await supabase!.from('document_logs').insert({
            document_id: docId,
            action,
            actor_id: actor.id,
            actor_name: actor.full_name,
            details,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("Log Error (likely missing table):", e);
    }
};

export const loginUser = async (username: string, password: string): Promise<Profile> => {
    checkConnection();
    let emailToUse = username;
    if (!username.includes('@')) {
        const { data: profileSearch } = await supabase!.from('profiles').select('email').eq('username', username).maybeSingle();
        emailToUse = profileSearch?.email || `${username.toLowerCase()}@esaraban.com`;
    }
    
    const { data: authData, error: authError } = await supabase!.auth.signInWithPassword({ email: emailToUse.toLowerCase(), password });
    if (authError) {
        throw new Error(getErrorMessage(authError));
    }

    const { data: profile, error: profileError } = await supabase!.from('profiles').select('*').eq('id', authData.user.id).single();
    if (profileError || !profile) throw new Error(getErrorMessage(profileError || "ไม่พบข้อมูลโปรไฟล์"));
    if (profile.is_locked) throw new Error("บัญชีนี้ถูกระงับการใช้งาน");
    if (profile.is_approved === false) throw new Error("รอผู้ดูแลระบบอนุมัติบัญชีเข้าใช้งาน");

    return { ...profile, email: profile.email || authData.user.email } as Profile;
};

export const updateUserPassword = async (newPassword: string) => {
    checkConnection();
    const { error } = await supabase!.auth.updateUser({ password: newPassword });
    if (error) throw new Error(`เปลี่ยนรหัสผ่านไม่สำเร็จ: ${getErrorMessage(error)}`);
    return true;
};

// --- Google Drive Helper Functions ---

const fileToBase64DataOnly = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = error => reject(error);
    });
};

const refreshGoogleDriveToken = async (config: StorageConfig): Promise<string | null> => {
    if (!config.googleDriveRefreshToken || !config.googleDriveClientId || !config.googleDriveClientSecret) {
        console.warn("Missing credentials for Google Drive token refresh");
        return null;
    }

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: config.googleDriveClientId,
                client_secret: config.googleDriveClientSecret,
                refresh_token: config.googleDriveRefreshToken,
                grant_type: 'refresh_token',
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Google Drive Refresh Failed: ${err.error_description || err.error}`);
        }

        const data = await response.json();
        
        localStorage.setItem('esaraban_gd_access_token', data.access_token);
        localStorage.setItem('esaraban_gd_token_expiry', String(Date.now() + (data.expires_in * 1000)));
        console.log("Google Drive Token Refreshed Successfully");
        
        return data.access_token;
    } catch (e) {
        console.error("Google Drive auto-refresh failed:", e);
        return null;
    }
};

const getGoogleDriveAccessToken = async (config: StorageConfig): Promise<string | null> => {
    const token = localStorage.getItem('esaraban_gd_access_token');
    const expiry = localStorage.getItem('esaraban_gd_token_expiry');
    const isExpired = expiry ? Date.now() > (parseInt(expiry) - 60000) : true; // 1 min buffer
    
    if (!isExpired && token) {
        return token;
    }
    return await refreshGoogleDriveToken(config);
};

const uploadFileToGD = async (file: File, config: StorageConfig, accessToken: string): Promise<string> => {
    const metadata = {
        name: `${Date.now()}_${file.name}`,
        parents: config.googleDriveFolderId ? [config.googleDriveFolderId] : []
    };
    
    const boundary = 'foo_bar_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    
    const fileBase64 = await fileToBase64DataOnly(file);
    
    const multipartBody = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${file.type || 'application/octet-stream'}\r\n` +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        fileBase64 +
        closeDelimiter;
        
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`GD Upload Failed: ${err.error?.message || response.statusText}`);
    }
    
    const result = await response.json();
    const fileId = result.id;
    
    // Set permission to anyone with link as reader
    try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                role: 'reader',
                type: 'anyone'
            })
        });
    } catch (permissionError) {
        console.warn("Failed to set Google Drive permission to anyone:", permissionError);
    }
    
    return result.webViewLink || `https://drive.google.com/uc?id=${fileId}&export=download`;
};

export const getUploadUrl = async (file: File): Promise<string> => {
    try {
        const storageConfig = await getStorageConfig();
        if (storageConfig.googleDriveEnabled && storageConfig.googleDriveRefreshToken) {
            const accessToken = await getGoogleDriveAccessToken(storageConfig);
            if (accessToken) {
                const gdUrl = await uploadFileToGD(file, storageConfig, accessToken);
                const event = new CustomEvent('esaraban-toast', { 
                    detail: { type: 'success', message: `📁 อัปโหลดไฟล์ขึ้น Google Drive สำเร็จ!\n(ประหยัดพื้นที่ฐานข้อมูล)` } 
                });
                window.dispatchEvent(event);
                return gdUrl;
            }
        }
    } catch (e: any) {
        console.error("Google Drive Upload failed, falling back to local base64:", e);
        const event = new CustomEvent('esaraban-toast', { 
            detail: { type: 'info', message: `⚠️ อัปโหลด Google Drive ล้มเหลว: ${e.message || e}\n(ระบบจัดเก็บไฟล์ในฐานข้อมูลชั่วคราวแทน)` } 
        });
        window.dispatchEvent(event);
    }
    return await fileToBase64(file);
};

export const createDocument = async (data: any, actor: Profile) => {
    checkConnection();
    const { file, status: _ignoredStatus, ...formFields } = data;
    const year = new Date().getFullYear() + 543;
    let nextNo = 1;

    try {
        const { data: latestDocs } = await supabase!.from('documents')
            .select('book_no')
            .eq('book_year', year)
            .not('book_no', 'is', null)
            .order('book_no', { ascending: false })
            .limit(1);
        
        if (latestDocs && latestDocs.length > 0) nextNo = (latestDocs[0].book_no || 0) + 1;
        
        let fileUrl = data.attachment_url || null;
        if (file) { fileUrl = await getUploadUrl(file); }

        const initialStatus = actor.role === UserRole.USER ? DocStatus.PENDING_VERIFY : DocStatus.PENDING_ACCEPT;

        const payload = { 
            ...cleanPayload(formFields),
            priority: data.priority,
            registration_date: data.registration_date || new Date().toISOString().split('T')[0],
            attachment_url: fileUrl, 
            book_no: nextNo, 
            book_year: year, 
            status: initialStatus,
            tracking_code: `TH-${year}-${nextNo}-${Math.random().toString(36).substring(2,6).toUpperCase()}`,
            created_at: new Date().toISOString(), 
            updated_at: new Date().toISOString(),
            creator_id: actor.id
        };

        // Try insert with all fields
        let { data: saved, error } = await supabase!.from('documents').insert(payload).select(DB_COLUMNS).single();
        
        // Handle missing columns gracefully by retrying without them
        if (error) {
             console.warn("Insert failed, trying fallback...", error.message);
             const fallbackPayload = { ...payload };
             if (error.message.includes('priority')) delete (fallbackPayload as any).priority;
             if (error.message.includes('registration_date')) delete (fallbackPayload as any).registration_date;
             
             const retry = await supabase!.from('documents').insert(fallbackPayload).select(DB_COLUMNS).single();
             saved = retry.data;
             error = retry.error;
         }

        if (error) throw new Error(getErrorMessage(error));

        const logAction = initialStatus === DocStatus.PENDING_VERIFY ? 'ยื่นเรื่อง (รอตรวจสอบ)' : 'ลงทะเบียนรับหนังสือ';
        await addLog(saved.id, logAction, actor, `สร้างเอกสารใหม่ เลขที่ ${nextNo}/${year}`);

        // --- Trigger Notification ---
        if (initialStatus === DocStatus.PENDING_ACCEPT && saved.to_recipient_id) {
            sendEmailNotification(saved, saved.to_recipient_id, 'new');
        }

        return saved;
    } catch (err: any) {
        throw new Error(getErrorMessage(err));
    }
};

export const updateDocument = async (id: string, data: any) => {
    checkConnection();
    
    // Fetch old data to check for recipient change
    const { data: oldDoc } = await supabase!.from('documents').select('to_recipient_id').eq('id', id).single();

    const { file, ...formFields } = data;
    let fileUrl = data.attachment_url;
    if (file instanceof File) { fileUrl = await getUploadUrl(file); }

    const payload = { 
        ...cleanPayload(formFields), 
        priority: data.priority,
        registration_date: data.registration_date,
        attachment_url: fileUrl,
        updated_at: new Date().toISOString() 
    };

    // Logic 1: If recipient has changed, auto-update status to PENDING_ACCEPT
    if (oldDoc && data.to_recipient_id && oldDoc.to_recipient_id !== data.to_recipient_id) {
        payload.status = DocStatus.PENDING_ACCEPT;
    }

    let { error } = await supabase!.from('documents').update(payload).eq('id', id);

    // Handle missing columns
    if (error) {
        console.warn("Update failed, trying fallback...", error.message);
        const fallbackPayload = { ...payload };
        if (error.message.includes('priority')) delete (fallbackPayload as any).priority;
        if (error.message.includes('registration_date')) delete (fallbackPayload as any).registration_date;
        
        const retry = await supabase!.from('documents').update(fallbackPayload).eq('id', id);
        error = retry.error;
    }

    if (error) throw new Error(`อัปเดตข้อมูลไม่สำเร็จ: ${getErrorMessage(error)}`);

    // --- Trigger Notification if Recipient Changed ---
    if (oldDoc && data.to_recipient_id && oldDoc.to_recipient_id !== data.to_recipient_id) {
        // Fetch full doc for template
        const { data: fullDoc } = await supabase!.from('documents').select('*').eq('id', id).single();
        if (fullDoc) {
            sendEmailNotification(fullDoc as Document, data.to_recipient_id, 'update');
        }
    }
};

export const uploadApprovedFile = async (docId: string, file: File, actor: Profile) => {
    checkConnection();
    try {
        const fileUrl = await getUploadUrl(file);
        const { error } = await supabase!.from('documents').update({ 
            status: DocStatus.APPROVED, 
            approved_attachment_url: fileUrl,
            updated_at: new Date().toISOString() 
        }).eq('id', docId);
        if (error) throw new Error(getErrorMessage(error));
        await addLog(docId, 'อนุมัติหนังสือ', actor, "อนุมัติพร้อมไฟล์แนบที่ลงนามแล้ว");
    } catch (err: any) {
        throw new Error(`อนุมัติไม่สำเร็จ: ${getErrorMessage(err)}`);
    }
};

export const getDocuments = async (userId: string, role: UserRole): Promise<Document[]> => {
    checkConnection();
    let q = supabase!.from('documents').select(LIST_DB_COLUMNS); 
    
    if (role === UserRole.USER) {
        q = q.eq('creator_id', userId);
    } else if (role === UserRole.STAFF) {
        q = q.or(`to_recipient_id.eq.${userId},creator_id.eq.${userId}`);
    }

    const { data, error } = await q.order('created_at', { ascending: false });
    let docs = handleSupabaseResponse<Document[]>(data, error, []);

    if (role === UserRole.STAFF) {
        docs = docs.filter(d => {
            if (d.status === DocStatus.PENDING_VERIFY && d.creator_id !== userId) return false;
            return true;
        });
    }

    return docs;
};

export const getDocumentById = async (id: string) => {
    checkConnection();
    const { data, error } = await supabase!.from('documents').select(DB_COLUMNS).eq('id', id).single();
    if (error) throw new Error(getErrorMessage(error));
    return data as Document;
};

export const getDocumentByTrackingCode = async (code: string) => {
    checkConnection();
    const { data, error } = await supabase!.from('documents').select(DB_COLUMNS).eq('tracking_code', code).single();
    if (error) throw new Error(getErrorMessage(error));
    return data as Document;
};

export const getPublicDocument = async (code: string) => {
    checkConnection();
    const { data, error } = await supabase!.from('documents')
        .select(DB_COLUMNS)
        .or(`tracking_code.eq.${code},external_book_no.eq.${code}`)
        .maybeSingle();

    if (error) throw new Error(getErrorMessage(error));
    return data as Document | null;
};

export const updateDocumentStatus = async (docId: string, status: DocStatus, actor: Profile, remark: string = '') => {
    checkConnection();
    const { error } = await supabase!.from('documents').update({ status, updated_at: new Date().toISOString() }).eq('id', docId);
    if (error) throw new Error(`เปลี่ยนสถานะไม่สำเร็จ: ${getErrorMessage(error)}`);
    
    let action = 'อัปเดตสถานะ';
    if (status === DocStatus.REGISTERED) action = 'รับเข้าสารบรรณ';
    else if (status === DocStatus.RETURNED) action = 'ตีกลับหนังสือ';
    else if (status === DocStatus.CANCELLED) action = 'ยกเลิกหนังสือ';
    else if (status === DocStatus.PENDING_ACCEPT) action = 'ตรวจสอบแล้ว/ส่งต่อ';
    
    await addLog(docId, action, actor, remark || `เปลี่ยนสถานะเป็น ${action}`);
};

export const updateProfile = async (id: string, data: Partial<Profile>) => {
    checkConnection();
    const { error } = await supabase!.from('profiles').update(data).eq('id', id);
    if (error) throw new Error(getErrorMessage(error));
};

export const registerExternalUser = async (data: any) => {
    checkConnection();
    const { error: signUpError, data: authData } = await supabase!.auth.signUp({ email: data.email, password: data.password });
    if (signUpError) throw new Error(getErrorMessage(signUpError));
    if (authData.user) {
        const { error: insertError } = await supabase!.from('profiles').insert({ 
            id: authData.user.id, 
            username: data.username, 
            full_name: data.full_name, 
            email: data.email, 
            role: UserRole.USER, 
            is_approved: false 
        });
        if (insertError) throw new Error(getErrorMessage(insertError));
    }
};

export const getUsers = async (): Promise<Profile[]> => {
    checkConnection();
    const { data, error } = await supabase!.from('profiles').select('*'); 
    return handleSupabaseResponse<Profile[]>(data, error, []);
};

export const getPendingUsers = async (): Promise<Profile[]> => {
    checkConnection();
    const { data, error } = await supabase!.from('profiles').select('*').eq('is_approved', false);
    return handleSupabaseResponse<Profile[]>(data, error, []);
};

export const approveUser = async (id: string) => {
    checkConnection();
    const { error } = await supabase!.from('profiles').update({ is_approved: true }).eq('id', id);
    if (error) throw new Error(getErrorMessage(error));
};

export const unlockUser = async (userId: string) => {
    checkConnection();
    const { error } = await supabase!.from('profiles').update({ is_locked: false, login_attempts: 0 }).eq('id', userId);
    if (error) throw new Error(getErrorMessage(error));
};

export const logoutUser = async () => { if (supabase) await supabase.auth.signOut(); };

export const saveUser = async (user: any) => {
    checkConnection();
    const { id, password, ...data } = user;
    
    if (id) {
        // 1. Update Profile Data if provided
        if (Object.keys(data).length > 0) {
            const { error } = await supabase!.from('profiles').update(data).eq('id', id);
            if (error) throw new Error(getErrorMessage(error));
        }
        
        // 2. Update Password/Email in Auth via RPC if provided
        if (password || data.email) {
             // Call RPC
             const { data: success, error } = await supabase!.rpc('admin_update_user', { 
                target_user_id: id, 
                new_password: password || null,
                new_email: data.email || null
            });
            
            if (error) {
                if (error.code === '42883' || error.message?.includes('function not found')) {
                    throw new Error("ระบบไม่พบฟังก์ชัน 'admin_update_user' กรุณารัน SQL Script ใน supabase_schema.sql เพื่อติดตั้งฟังก์ชันใหม่");
                }
                throw new Error(`บันทึกข้อมูลเข้าสู่ระบบไม่สำเร็จ: ${getErrorMessage(error)}`);
            }
            
            if (success === false) {
                throw new Error("ไม่พบข้อมูลผู้ใช้งานในระบบ Auth (Zombie Profile) - กรุณาลบและสร้างใหม่");
            }
        }
    } else {
        // Create new user
        const emailToReg = data.email || `${data.username.toLowerCase()}@esaraban.com`;
        const { data: authData, error: signUpError } = await supabase!.auth.signUp({ email: emailToReg, password });
        if (signUpError) throw new Error(getErrorMessage(signUpError));
        if (authData.user) {
            const { error: insertError } = await supabase!.from('profiles').insert({ id: authData.user.id, ...data, email: emailToReg, is_approved: true });
            if (insertError) throw new Error(getErrorMessage(insertError));
        }
    }
};

export const deleteUser = async (id: string) => {
    checkConnection();
    const { error } = await supabase!.from('profiles').delete().eq('id', id);
    if (error) throw new Error(getErrorMessage(error));
};

export const getRolePermissions = async (): Promise<Record<UserRole, PermissionType[]>> => {
    return {
        [UserRole.ADMIN]: ['VIEW_DASHBOARD', 'REGISTER_DOC', 'SEARCH_DOC', 'MANAGE_USERS', 'MANAGE_SETTINGS', 'VIEW_REPORTS', 'MANAGE_MASTER_DATA', 'SCAN_QR', 'MANAGE_NOTIFICATIONS'],
        [UserRole.STAFF]: ['VIEW_DASHBOARD', 'REGISTER_DOC', 'SEARCH_DOC', 'VIEW_REPORTS', 'SCAN_QR'],
        [UserRole.USER]: ['SEARCH_DOC'],
    };
};

export const updateRolePermissions = async (perms: any) => true;

// Mock Local Config with Persistence
const DEFAULT_RUNNING_CONFIG: RunningConfig = { 
    currentYear: 2569, 
    lastBookNo: 0, 
    mascotEnabled: false,
    mascotId: '1', 
    mascotAction: '1', 
    mascotAutoRotate: false, 
    mascotInterval: 5
};

export const getRunningConfig = async (): Promise<RunningConfig> => {
    const stored = localStorage.getItem('esaraban_running_config');
    if (stored) {
        return { ...DEFAULT_RUNNING_CONFIG, ...JSON.parse(stored) };
    }
    return DEFAULT_RUNNING_CONFIG;
};

export const updateRunningConfig = async (config: RunningConfig) => {
    localStorage.setItem('esaraban_running_config', JSON.stringify(config));
    return true;
};

export const getDataSourceConfig = async (): Promise<DataSourceConfig> => ({ type: 'supabase' });
export const saveDataSourceConfig = async (config: DataSourceConfig) => true;

export const searchDocuments = async (query: string): Promise<Document[]> => {
    checkConnection();
    const { data, error } = await supabase!.from('documents').select(LIST_DB_COLUMNS).or(`subject.ilike.%${query}%,external_book_no.ilike.%${query}%,tracking_code.ilike.%${query}%`);
    return handleSupabaseResponse<Document[]>(data, error, []);
};

export const getReportData = async (
    start: string, 
    end: string, 
    recipientIds?: string[], 
    status?: string,
    departmentIds?: string[],
    creatorId?: string,
    priority?: string
): Promise<Document[]> => {
    checkConnection();
    // CHANGED: Filter by registration_date instead of doc_date
    let q = supabase!.from('documents').select(LIST_DB_COLUMNS).gte('registration_date', start).lte('registration_date', end);
    
    if (recipientIds && recipientIds.length > 0) {
        q = q.in('to_recipient_id', recipientIds);
    }
    
    if (status) q = q.eq('status', status);
    if (creatorId) q = q.eq('creator_id', creatorId);
    if (priority) q = q.eq('priority', priority);

    const { data, error } = await q;
    
    // Fallback logic if registration_date doesn't exist (old data or missing column)
    if (error && error.message && error.message.includes('registration_date')) {
         console.warn("Report filter failed on registration_date, falling back to doc_date");
         return getReportDataFallback(start, end, recipientIds, status, departmentIds, creatorId, priority);
    }

    const initialData = handleSupabaseResponse<Document[]>(data, error, []);

    let filteredData = initialData;
    if (departmentIds && departmentIds.length > 0) {
        const { data: profiles, error: pError } = await supabase!.from('profiles').select('id, department_id').in('department_id', departmentIds);
        const allowedProfiles = handleSupabaseResponse<any[]>(profiles, pError, []);
        
        if (allowedProfiles.length > 0) {
            const allowedUserIds = allowedProfiles.map(p => p.id);
            filteredData = filteredData.filter(doc => allowedUserIds.includes(doc.to_recipient_id));
        } else {
            filteredData = [];
        }
    }

    return filteredData as Document[];
};

// Fallback function for reports if new column missing
const getReportDataFallback = async (
    start: string, end: string, recipientIds?: string[], status?: string, 
    departmentIds?: string[], creatorId?: string, priority?: string
): Promise<Document[]> => {
    let q = supabase!.from('documents').select(LIST_DB_COLUMNS).gte('doc_date', start).lte('doc_date', end);
    if (recipientIds && recipientIds.length > 0) q = q.in('to_recipient_id', recipientIds);
    if (status) q = q.eq('status', status);
    if (creatorId) q = q.eq('creator_id', creatorId);
    if (priority) q = q.eq('priority', priority);
    const { data, error } = await q;
    const initialData = handleSupabaseResponse<Document[]>(data, error, []);
    return initialData;
};

export const getMasterItems = async (table: string) => {
    checkConnection();
    const { data, error } = await supabase!.from(table).select('*').order('name');
    return handleSupabaseResponse<any[]>(data, error, []);
};

export const saveMasterItem = async (table: string, item: any) => {
    checkConnection();
    const { id, ...data } = item;
    if (id) {
        const { error } = await supabase!.from(table).update(data).eq('id', id);
        if (error) throw new Error(getErrorMessage(error));
    } else {
        const { error } = await supabase!.from(table).insert(data);
        if (error) throw new Error(getErrorMessage(error));
    }
};

export const deleteMasterItem = async (table: string, id: string) => {
    checkConnection();
    const { error } = await supabase!.from(table).delete().eq('id', id);
    if (error) throw new Error(getErrorMessage(error));
};

export const getLogs = async (docId: string): Promise<DocumentLog[]> => {
    checkConnection();
    const { data: logs, error } = await supabase!.from('document_logs').select('*').eq('document_id', docId).order('timestamp', { ascending: false });
    
    if (error) throw new Error(getErrorMessage(error));
    
    const logList = logs as DocumentLog[];
    
    // Fetch roles for actors to support UI coloring
    if (logList.length > 0) {
        const actorIds = Array.from(new Set(logList.map(l => l.actor_id)));
        const { data: profiles } = await supabase!.from('profiles').select('id, role').in('id', actorIds);
        
        const roleMap = new Map();
        if (profiles) {
            profiles.forEach(p => roleMap.set(p.id, p.role));
        }
        
        return logList.map(l => ({
            ...l,
            actor_role: roleMap.get(l.actor_id) as UserRole
        }));
    }

    return logList;
};

export const getStats = async (userId: string, role: UserRole): Promise<DashboardStats> => {
    try {
        const docs = await getDocuments(userId, role);
        return { 
            totalReceived: docs.filter(d => d.book_no !== null).length, 
            pending: docs.filter(d => d.status === DocStatus.REGISTERED).length, 
            pendingAccept: docs.filter(d => d.status === DocStatus.PENDING_ACCEPT).length, 
            pendingReview: docs.filter(d => d.status === DocStatus.PENDING_REVIEW).length, 
            completed: docs.filter(d => d.status === DocStatus.APPROVED).length, 
            cancelled: docs.filter(d => d.status === DocStatus.CANCELLED).length 
        };
    } catch (e) {
        return { totalReceived: 0, pending: 0, pendingAccept: 0, pendingReview: 0, completed: 0, cancelled: 0 };
    }
};

export const getUsersForSelect = async () => {
    checkConnection();
    const { data, error } = await supabase!.from('profiles').select('id, full_name, department_name, department_id').eq('is_approved', true).eq('is_locked', false);
    return handleSupabaseResponse<any[]>(data, error, []);
};

export const getMySessions = async (userId: string): Promise<ChatSession[]> => {
    checkConnection();
    const { data, error } = await supabase!.from('chat_sessions').select('*').contains('participants', [userId]).order('updated_at', { ascending: false });
    return handleSupabaseResponse<ChatSession[]>(data, error, []);
};

export const getSessionMessages = async (sessionId: string): Promise<ChatMessage[]> => {
    checkConnection();
    const { data, error } = await supabase!.from('chat_messages').select('*').eq('session_id', sessionId).order('timestamp', { ascending: true });
    return handleSupabaseResponse<ChatMessage[]>(data, error, []);
};

export const sendMessage = async (sessionId: string, senderId: string, text: string) => {
    checkConnection();
    const { error: msgError } = await supabase!.from('chat_messages').insert({ session_id: sessionId, sender_id: senderId, text, timestamp: new Date().toISOString() });
    if (msgError) throw new Error(getErrorMessage(msgError));
    const { error: sessError } = await supabase!.from('chat_sessions').update({ last_message: text, updated_at: new Date().toISOString() }).eq('id', sessionId);
    if (sessError) throw new Error(getErrorMessage(sessError));
};

export const createChatSession = async (creatorId: string, participants: string[], type: 'direct' | 'support'): Promise<ChatSession> => {
    checkConnection();
    const allParticipants = Array.from(new Set([creatorId, ...participants])).sort();
    
    // Check if direct session already exists between these same people
    if (type === 'direct' && allParticipants.length === 2) {
        const { data: existing } = await supabase!
            .from('chat_sessions')
            .select('*')
            .eq('type', 'direct')
            .contains('participants', allParticipants)
            .maybeSingle();
        
        if (existing && existing.participants.length === allParticipants.length) {
            return existing as ChatSession;
        }
    }

    const { data, error } = await supabase!.from('chat_sessions').insert({ 
        participants: allParticipants, 
        type, 
        last_message: '', 
        updated_at: new Date().toISOString(),
        unread_count: {}
    }).select().single();
    
    if (error) throw new Error(getErrorMessage(error));
    return data as ChatSession;
};

export const deleteChatSession = async (id: string) => {
    checkConnection();
    try {
        // Step 1: Delete all messages in this session first
        await supabase!.from('chat_messages').delete().eq('session_id', id);
        // Step 2: Delete the session itself
        const { error } = await supabase!.from('chat_sessions').delete().eq('id', id);
        if (error) throw new Error(getErrorMessage(error));
    } catch (e) {
        console.error("Delete Session Error:", e);
        throw e;
    }
};

export const forwardDocument = async (docId: string, recipientId: string, recipientName: string, actor: Profile, remark: string) => {
    checkConnection();
    // Logic 2: Update status to PENDING_ACCEPT on forward
    const { error } = await supabase!.from('documents').update({ 
        status: DocStatus.PENDING_ACCEPT, 
        to_recipient_id: recipientId, 
        recipient_name: recipientName,
        updated_at: new Date().toISOString() 
    }).eq('id', docId);
    
    if (error) throw new Error(getErrorMessage(error));
    await addLog(docId, 'ส่งต่อหนังสือ', actor, `ส่งต่อถึง ${recipientName}: ${remark}`);
    
    // --- Trigger Notification ---
    // Fetch full doc for details
    const { data: doc } = await supabase!.from('documents').select('*').eq('id', docId).single();
    if (doc) {
        sendEmailNotification(doc as Document, recipientId, 'forward');
    }
};

export const submitExternalDocument = async (data: any) => {
    checkConnection();
    const year = new Date().getFullYear() + 543;
    const { data: saved, error } = await supabase!.from('documents').insert({ 
        subject: data.subject, 
        from_origin: data.from, 
        remark: data.details, 
        status: DocStatus.PENDING_VERIFY, // เปลี่ยนสถานะเป็น รอตรวจสอบ (PENDING_VERIFY)
        book_year: year, 
        tracking_code: `PUB-${year}-${Math.random().toString(36).substring(2,6).toUpperCase()}` 
    }).select().single();
    
    if (error) throw new Error(getErrorMessage(error));
    return saved.tracking_code;
};

export const markSessionAsRead = async (sessionId: string, userId: string) => {
    checkConnection();
    try {
        const { data: session } = await supabase!.from('chat_sessions').select('unread_count').eq('id', sessionId).single();
        if (session) {
            const currentUnread = session.unread_count || {};
            const newUnread = { ...currentUnread };
            newUnread[userId] = 0;
            await supabase!.from('chat_sessions').update({ unread_count: newUnread }).eq('id', sessionId);
        }
    } catch (e) {
        console.error("Failed to mark as read", e);
    }
};

export const sendResetPasswordEmail = async (email: string) => {
    checkConnection();
    const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' });
    if (error) throw new Error(getErrorMessage(email));
};

export const clearAllDocuments = async (password: string, actor: Profile) => {
    checkConnection();
    const { error: docError } = await supabase!.from('documents').delete().not('id', 'is', null);
    if (docError) throw new Error(`ลบข้อมูลหนังสือไม่สำเร็จ: ${getErrorMessage(docError)}`);
    const { error: logError } = await supabase!.from('document_logs').delete().not('id', 'is', null);
    if (logError) throw new Error(`ลบประวัติไม่สำเร็จ: ${getErrorMessage(logError)}`);
    return true;
};

export const initializeSystem = async () => true;
