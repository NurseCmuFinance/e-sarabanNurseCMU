
import React, { useState, useEffect, useRef } from 'react';
import { Mail, MessageCircle, Save, Loader2, Info, AlertTriangle, CheckCircle, Code, Plus, Link as LinkIcon, User, RefreshCw, Key, Eye, EyeOff } from 'lucide-react';
import { getNotificationConfig, saveNotificationConfig } from '../services/mockService';
import { NotificationConfig, Profile, UserRole } from '../types';

interface NotificationSettingsProps {
    user: Profile;
}

const AVAILABLE_VARIABLES = [
    { code: '{{subject}}', label: 'ชื่อเรื่อง' },
    { code: '{{book_no}}', label: 'เลขรับ' },
    { code: '{{book_year}}', label: 'ปี (พ.ศ.)' },
    { code: '{{recipient_name}}', label: 'ชื่อผู้รับ' },
    { code: '{{from_origin}}', label: 'จากหน่วยงาน' },
    { code: '{{priority}}', label: 'ความเร่งด่วน' },
    { code: '{{tracking_code}}', label: 'Tracking Code' },
    { code: '{{remark}}', label: 'หมายเหตุ/รายละเอียด' },
    { code: '{{app_url}}', label: 'ลิงก์เข้าระบบ' },
];

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'email' | 'line' | 'gemini'>('email');
    const [config, setConfig] = useState<NotificationConfig>({
        emailEnabled: true,
        emailSubjectTemplate: '',
        emailBodyTemplate: '',
        gmailClientId: '',
        gmailClientSecret: '',
        gmailAccessToken: '',
        gmailRefreshToken: '',
        gmailUserEmail: '',
        lineEnabled: false,
        lineChannelAccessToken: '',
        lineChannelSecret: ''
    });
    const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    
    // UI State for password visibility
    const [showClientSecret, setShowClientSecret] = useState(false);
    const [showLineSecret, setShowLineSecret] = useState(false);
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        loadConfig();
        // Load Google Identity Services Script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); }
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const data = await getNotificationConfig();
            setConfig(data);
        } catch (e) {
            console.error("Failed to load config", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            await saveNotificationConfig(config);
            localStorage.setItem('gemini_api_key', geminiApiKey);
            setMessage({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' });
        } catch (e) {
            setMessage({ type: 'error', text: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' });
        } finally {
            setSaving(false);
        }
    };

    const handleGmailAuth = () => {
        if (!config.gmailClientId || !config.gmailClientSecret) {
            alert("กรุณากรอก Client ID และ Client Secret ให้ครบถ้วนก่อนเชื่อมต่อ");
            return;
        }

        // Use Code Client to get Authorization Code (for Refresh Token)
        // @ts-ignore
        const client = google.accounts.oauth2.initCodeClient({
            client_id: config.gmailClientId,
            scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
            ux_mode: 'popup',
            // FORCE user to see consent screen to ensure scopes are granted and we get a refresh token
            prompt: 'consent',
            access_type: 'offline',
            callback: async (response: any) => {
                if (response.code) {
                    setLoading(true);
                    try {
                        // Exchange Code for Tokens
                        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                code: response.code,
                                client_id: config.gmailClientId!,
                                client_secret: config.gmailClientSecret!,
                                redirect_uri: window.location.origin, // For popup flow, use origin or postmessage
                                grant_type: 'authorization_code',
                            }),
                        });

                        if (!tokenRes.ok) {
                            const err = await tokenRes.json();
                            throw new Error(`Token Exchange Failed: ${err.error_description || err.error}`);
                        }

                        const tokens = await tokenRes.json();
                        
                        // Get User Info
                        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                            headers: { Authorization: `Bearer ${tokens.access_token}` }
                        });
                        const userInfo = await userInfoRes.json();

                        const newConfig = {
                            ...config,
                            gmailAccessToken: tokens.access_token,
                            gmailRefreshToken: tokens.refresh_token || config.gmailRefreshToken, // Keep old one if new one not sent
                            gmailTokenExpiry: Date.now() + (tokens.expires_in * 1000),
                            gmailUserEmail: userInfo.email
                        };
                        
                        setConfig(newConfig);
                        await saveNotificationConfig(newConfig);
                        setMessage({ type: 'success', text: `เชื่อมต่อกับ ${userInfo.email} สำเร็จ! (Offline Access Granted)` });
                    } catch (e: any) {
                        console.error("Auth Error:", e);
                        setMessage({ type: 'error', text: `การเชื่อมต่อล้มเหลว: ${e.message} (โปรดตรวจสอบ Client Secret)` });
                    } finally {
                        setLoading(false);
                    }
                }
            },
        });
        client.requestCode();
    };

    const insertVariable = (variable: string) => {
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            const text = config.emailBodyTemplate;
            const newText = text.substring(0, start) + variable + text.substring(end);
            
            setConfig({ ...config, emailBodyTemplate: newText });
            
            // Restore focus and cursor position
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(start + variable.length, start + variable.length);
                }
            }, 0);
        } else {
            // Fallback if ref is missing
            setConfig({ ...config, emailBodyTemplate: config.emailBodyTemplate + variable });
        }
    };

    if (user.role !== UserRole.ADMIN) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                <AlertTriangle size={48} className="mb-4 text-orange-400"/>
                <h2 className="text-xl font-bold text-slate-700">ไม่มีสิทธิ์เข้าถึง</h2>
                <p>หน้านี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น</p>
            </div>
        );
    }

    if (loading) {
        return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin text-blue-600" size={32}/></div>;
    }

    const isTokenExpired = config.gmailTokenExpiry && Date.now() > config.gmailTokenExpiry;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าการแจ้งเตือน</h1>
                    <p className="text-slate-500 font-medium">กำหนดรูปแบบข้อความและช่องทางการแจ้งเตือนอัตโนมัติ</p>
                </div>
            </div>

            <div className="flex gap-2 border-b overflow-x-auto whitespace-nowrap">
                <button
                    onClick={() => setActiveTab('email')}
                    className={`px-6 py-4 flex items-center gap-2 border-b-2 font-bold transition-all ${activeTab === 'email' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    <Mail size={18} /> ตั้งค่า Gmail API (Email)
                </button>
                <button
                    onClick={() => setActiveTab('line')}
                    className={`px-6 py-4 flex items-center gap-2 border-b-2 font-bold transition-all ${activeTab === 'line' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                >
                    <MessageCircle size={18} /> LINE Messaging API
                </button>
                <button
                    onClick={() => setActiveTab('gemini')}
                    className={`px-6 py-4 flex items-center gap-2 border-b-2 font-bold transition-all ${activeTab === 'gemini' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-purple-600 hover:bg-purple-50'}`}
                >
                    <Code size={18} /> ตั้งค่า Gemini API (OCR)
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {message && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                        <span className="font-bold">{message.text}</span>
                    </div>
                )}

                {activeTab === 'email' && (
                    <div className="space-y-6">
                        {/* Gmail API Config Section */}
                        <div className="bg-white rounded-2xl border p-8 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Key className="text-blue-600"/> ตั้งค่าการเชื่อมต่อ Gmail (OAuth 2.0)</h3>
                                    <p className="text-sm text-slate-500">ใส่ค่า Client ID จาก Google Cloud Console เพื่ออนุญาตให้ระบบส่งอีเมล</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={config.emailEnabled} onChange={e => setConfig({...config, emailEnabled: e.target.checked})}/>
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-700">{config.emailEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Client ID (จำเป็น)</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" 
                                        value={config.gmailClientId || ''}
                                        onChange={e => setConfig({...config, gmailClientId: e.target.value})}
                                        placeholder="xxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                                    />
                                    <p className="text-xs text-slate-400">ค่านี้ได้จาก Google Cloud Console &gt; Credentials &gt; OAuth 2.0 Client ID</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Client Secret (จำเป็นสำหรับการทำงานอัตโนมัติ)</label>
                                    <div className="relative">
                                        <input 
                                            type={showClientSecret ? "text" : "password"} 
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-slate-50 pr-12" 
                                            value={config.gmailClientSecret || ''}
                                            onChange={e => setConfig({...config, gmailClientSecret: e.target.value})}
                                            placeholder="GOCSPX-xxxxxxxxxxxxxxxxx"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowClientSecret(!showClientSecret)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            {showClientSecret ? <EyeOff size={20}/> : <Eye size={20}/>}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400">จำเป็นต้องใช้เพื่อขอ Refresh Token สำหรับส่งอีเมลแบบ Offline (เมื่อแอดมินไม่ได้ล็อกอิน)</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.gmailRefreshToken ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <Mail size={20}/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">สถานะการเชื่อมต่อ</p>
                                        {config.gmailRefreshToken ? (
                                            <div className="flex flex-col">
                                                <p className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle size={12}/> เชื่อมต่อแล้ว: {config.gmailUserEmail}</p>
                                                <p className="text-[10px] text-slate-500">ระบบพร้อมส่งอีเมลอัตโนมัติ (Offline Access Active)</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500">ยังไม่ได้เชื่อมต่อ (กรุณากดปุ่มเชื่อมต่อเพื่อขอสิทธิ์)</p>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleGmailAuth}
                                    className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-50 flex items-center gap-2 active:scale-95 transition-all"
                                >
                                    <LinkIcon size={16}/> {config.gmailRefreshToken ? 'เชื่อมต่อใหม่ (Re-connect)' : 'เชื่อมต่อ Gmail'}
                                </button>
                            </div>
                            
                            <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 flex gap-2 items-start">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                                <div>
                                    <p className="font-bold">สำคัญ: หากพบ Error 403 หรือ Insufficient Scope</p>
                                    <p>ตอนกดเชื่อมต่อ และมีหน้าต่าง Google เด้งขึ้นมา <strong>กรุณาติ๊กถูกที่ช่อง "Send email on your behalf" (ส่งอีเมลในนามของคุณ)</strong> ด้วยทุกครั้ง ไม่อย่างนั้นระบบจะส่งอีเมลไม่ได้</p>
                                </div>
                            </div>
                        </div>

                        {/* Email Template Section */}
                        <div className="bg-white rounded-2xl border p-8 shadow-sm space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Code className="text-indigo-600"/> รูปแบบข้อความ (Template)</h3>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">หัวข้ออีเมล (Subject Template)</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                                    value={config.emailSubjectTemplate}
                                    onChange={e => setConfig({...config, emailSubjectTemplate: e.target.value})}
                                    placeholder="เช่น แจ้งเตือนเอกสารใหม่: {{subject}}"
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">เนื้อหาอีเมล (Body Template)</label>
                                <textarea 
                                    ref={textareaRef}
                                    rows={8}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" 
                                    value={config.emailBodyTemplate}
                                    onChange={e => setConfig({...config, emailBodyTemplate: e.target.value})}
                                    placeholder="เรียน {{recipient_name}}..."
                                />
                             </div>

                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><Code size={16}/> เลือกตัวแปรเพื่อแทรกลงในเนื้อหา (คลิกเพื่อเลือก)</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {AVAILABLE_VARIABLES.map(v => (
                                        <button 
                                            key={v.code}
                                            type="button"
                                            onClick={() => insertVariable(v.code)}
                                            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-xs text-slate-600 transition-all text-left shadow-sm active:scale-95"
                                        >
                                            <Plus size={12} className="shrink-0 text-slate-400"/>
                                            <div className="flex flex-col">
                                                <span className="font-bold">{v.label}</span>
                                                <span className="font-mono opacity-70 scale-90 origin-left">{v.code}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'line' && (
                    <div className="bg-white rounded-2xl border p-8 shadow-sm space-y-6">
                         <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MessageCircle className="text-green-600"/> LINE Messaging API</h3>
                                <p className="text-sm text-slate-500">ตั้งค่าการเชื่อมต่อกับ LINE Official Account (ยังไม่เปิดใช้งาน)</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer opacity-60 cursor-not-allowed">
                                <input type="checkbox" className="sr-only peer" checked={config.lineEnabled} disabled onChange={e => setConfig({...config, lineEnabled: e.target.checked})}/>
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                <span className="ml-3 text-sm font-medium text-slate-500">เร็วๆ นี้</span>
                            </label>
                        </div>

                        <div className="space-y-4 pt-4 border-t opacity-70 pointer-events-none grayscale">
                             <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Channel Access Token</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-mono text-xs" 
                                    value={config.lineChannelAccessToken}
                                    onChange={e => setConfig({...config, lineChannelAccessToken: e.target.value})}
                                    placeholder="Long-lived access token"
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Channel Secret</label>
                                <div className="relative">
                                    <input 
                                        type={showLineSecret ? "text" : "password"}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-mono pr-12" 
                                        value={config.lineChannelSecret}
                                        onChange={e => setConfig({...config, lineChannelSecret: e.target.value})}
                                        placeholder="Your Channel Secret"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowLineSecret(!showLineSecret)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors"
                                    >
                                        {showLineSecret ? <EyeOff size={20}/> : <Eye size={20}/>}
                                    </button>
                                </div>
                             </div>
                             <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                                <Info size={16}/> ฟังก์ชันนี้อยู่ระหว่างการพัฒนา จะเปิดให้ใช้งานในเวอร์ชันถัดไป
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'gemini' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border p-8 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Code className="text-purple-600"/> ตั้งค่า Gemini API Key</h3>
                                    <p className="text-sm text-slate-500">ใช้สำหรับการดึงข้อมูลด้วย OCR จากรูปภาพหนังสือราชการ</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">API Key</label>
                                    <div className="relative">
                                        <input 
                                            type={showGeminiKey ? "text" : "password"}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-mono pr-12" 
                                            value={geminiApiKey}
                                            onChange={e => setGeminiApiKey(e.target.value)}
                                            placeholder="AIzaSy..."
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowGeminiKey(!showGeminiKey)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors"
                                        >
                                            {showGeminiKey ? <EyeOff size={20}/> : <Eye size={20}/>}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        สามารถขอ API Key ได้ที่ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Google AI Studio</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={saving} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} บันทึกการตั้งค่า
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NotificationSettings;
