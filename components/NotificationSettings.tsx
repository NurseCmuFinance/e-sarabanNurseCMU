
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
            <div className="flex flex-col items-center justify-center h-[50vh] text-stone-500">
                <AlertTriangle size={48} className="mb-4 text-amber-500 animate-pulse"/>
                <p className="text-lg font-bold">เฉพาะผู้ดูแลระบบเท่านั้นที่มีสิทธิ์เข้าถึงหน้านี้</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
             {/* Page Header */}
             <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Mail className="text-indigo-600 animate-float" size={28} />
                        ตั้งค่าการเชื่อมต่อและแจ้งเตือน
                    </h1>
                    <p className="text-stone-500 text-sm font-medium mt-1">กำหนดรูปแบบข้อความการแจ้งเตือนอัตโนมัติ การเชื่อมต่อ Gmail OAuth, LINE Messaging API และ Gemini OCR</p>
                </div>
            </div>

            {/* Custom Tab Switcher */}
            <div className="flex gap-2.5 border-b border-stone-200/60 overflow-x-auto whitespace-nowrap pb-2 scrollbar-none">
                <button
                    type="button"
                    onClick={() => setActiveTab('email')}
                    className={`px-5 py-3 flex items-center gap-2.5 rounded-xl font-bold transition-all duration-200 ${
                        activeTab === 'email' 
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-100' 
                            : 'text-stone-500 hover:text-indigo-600 hover:bg-stone-100/60'
                    }`}
                >
                    <Mail size={18} className={activeTab === 'email' ? 'animate-pulse' : ''} /> ตั้งค่า Gmail API (Email)
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('line')}
                    className={`px-5 py-3 flex items-center gap-2.5 rounded-xl font-bold transition-all duration-200 ${
                        activeTab === 'line' 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-100' 
                            : 'text-stone-500 hover:text-emerald-600 hover:bg-stone-100/60'
                    }`}
                >
                    <MessageCircle size={18} className={activeTab === 'line' ? 'animate-pulse' : ''} /> LINE Messaging API
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('gemini')}
                    className={`px-5 py-3 flex items-center gap-2.5 rounded-xl font-bold transition-all duration-200 ${
                        activeTab === 'gemini' 
                            ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-100' 
                            : 'text-stone-500 hover:text-purple-600 hover:bg-stone-100/60'
                    }`}
                >
                    <Code size={18} className={activeTab === 'gemini' ? 'animate-pulse' : ''} /> ตั้งค่า Gemini API (OCR)
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {message && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 border animate-fade-in-up ${
                        message.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {message.type === 'success' ? <CheckCircle size={20} className="text-emerald-500"/> : <AlertTriangle size={20} className="text-rose-500"/>}
                        <span className="font-bold text-xs leading-relaxed">{message.text}</span>
                    </div>
                )}

                {activeTab === 'email' && (
                    <div className="space-y-6">
                        {/* Gmail API Config Section */}
                        <div className="glass-card p-6 md:p-8 space-y-6 border border-white/50 shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/60 pb-5">
                                <div>
                                    <h3 className="text-base font-extrabold text-stone-850 flex items-center gap-2">
                                        <Key className="text-indigo-650" size={20}/> ตั้งค่าการเชื่อมต่อ Gmail (OAuth 2.0)
                                    </h3>
                                    <p className="text-xs text-stone-500 font-medium mt-1">ตั้งค่า Client ID จาก Google Cloud Console เพื่ออนุญาตระบบส่งเมล</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={config.emailEnabled} 
                                        onChange={e => setConfig({...config, emailEnabled: e.target.checked})}
                                    />
                                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    <span className="ml-3 text-xs font-bold text-stone-700">{config.emailEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <label className="modern-input-label px-1">Client ID (จำเป็น)</label>
                                    <input 
                                        type="text" 
                                        className="modern-input font-mono text-xs font-medium" 
                                        value={config.gmailClientId || ''}
                                        onChange={e => setConfig({...config, gmailClientId: e.target.value})}
                                        placeholder="xxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                                    />
                                    <p className="text-[10px] text-stone-400 font-medium px-1">ได้จาก Google Cloud Console &gt; Credentials &gt; OAuth 2.0 Client ID</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="modern-input-label px-1">Client Secret (จำเป็นสำหรับการทำงานอัตโนมัติ)</label>
                                    <div className="relative">
                                        <input 
                                            type={showClientSecret ? "text" : "password"} 
                                            className="modern-input font-mono text-xs pr-12 font-medium" 
                                            value={config.gmailClientSecret || ''}
                                            onChange={e => setConfig({...config, gmailClientSecret: e.target.value})}
                                            placeholder="GOCSPX-xxxxxxxxxxxxxxxxx"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowClientSecret(!showClientSecret)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-indigo-600 p-1 hover:bg-stone-100 rounded-lg transition-all"
                                        >
                                            {showClientSecret ? <EyeOff size={16}/> : <Eye size={16}/>}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-stone-400 font-medium px-1">จำเป็นต้องใช้เพื่อขอ Refresh Token สำหรับส่งอีเมลแบบอัตโนมัติโดยที่แอดมินไม่ต้องออนไลน์</p>
                                </div>
                            </div>

                            <div className="bg-stone-50/60 rounded-2xl p-4.5 border border-stone-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                        config.gmailRefreshToken 
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                            : 'bg-stone-100 text-stone-400 border-stone-200'
                                    }`}>
                                        <Mail size={18}/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs text-stone-800">สถานะการเชื่อมต่อ Gmail</p>
                                        {config.gmailRefreshToken ? (
                                            <div className="flex flex-col mt-0.5">
                                                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                                    <CheckCircle size={11} className="text-emerald-500"/> เชื่อมต่อแล้ว: {config.gmailUserEmail}
                                                </p>
                                                <p className="text-[9.5px] text-stone-400 font-semibold mt-0.5">ระบบเชื่อมต่อสำเร็จและพร้อมทำงานเบื้องหลัง (Offline Access Active)</p>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-stone-450 font-semibold mt-0.5">ยังไม่ได้เชื่อมต่อ (โปรดกรอกข้อมูลข้างต้นและกดปุ่มเชื่อมต่อเพื่อขอสิทธิ์)</p>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleGmailAuth}
                                    className="btn btn-secondary font-bold text-xs px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 flex items-center gap-1.5 shrink-0"
                                >
                                    <LinkIcon size={14}/> {config.gmailRefreshToken ? 'เชื่อมต่อบัญชีใหม่' : 'ขอสิทธิ์การเชื่อมต่อ'}
                                </button>
                            </div>
                            
                            <div className="text-xs text-amber-700 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 flex gap-2.5 items-start">
                                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500"/>
                                <div className="leading-relaxed">
                                    <p className="font-bold text-amber-800 text-xs">ข้อควรระวัง: หากพบ Error 403 / Access Blocked</p>
                                    <p className="text-[11px] text-stone-550 font-medium mt-1">ในหน้าอนุญาตสิทธิ์ของ Google เด้งขึ้นมา <strong>กรุณาติ๊กถูกที่กล่องข้อความ "Send email on your behalf" (ส่งอีเมลในนามของคุณ)</strong> ทุกครั้ง เพื่ออนุญาตให้แอปส่งอีเมลแทนคุณ</p>
                                </div>
                            </div>
                        </div>

                        {/* Email Template Section */}
                        <div className="glass-card p-6 md:p-8 space-y-6 border border-white/50 shadow-xl">
                            <div>
                                <h3 className="text-base font-extrabold text-stone-850 flex items-center gap-2">
                                    <Code className="text-indigo-600" size={20}/> รูปแบบข้อความอีเมล (Email Template)
                                </h3>
                                <p className="text-xs text-stone-500 font-medium mt-1">ระบุแม่แบบหัวเรื่องและเนื้อความที่จะแจ้งไปยังเจ้าหน้าที่ปลายทาง</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="modern-input-label px-1">หัวข้ออีเมล (Subject Template)</label>
                                <input 
                                    type="text" 
                                    className="modern-input font-bold" 
                                    value={config.emailSubjectTemplate}
                                    onChange={e => setConfig({...config, emailSubjectTemplate: e.target.value})}
                                    placeholder="เช่น แจ้งเตือนเอกสารใหม่: {{subject}}"
                                />
                             </div>
                             <div className="space-y-1.5">
                                <label className="modern-input-label px-1">เนื้อหาอีเมล (Body Template)</label>
                                <textarea 
                                    ref={textareaRef}
                                    rows={8}
                                    className="modern-textarea font-mono text-xs font-semibold leading-relaxed" 
                                    value={config.emailBodyTemplate}
                                    onChange={e => setConfig({...config, emailBodyTemplate: e.target.value})}
                                    placeholder="เรียน {{recipient_name}}..."
                                />
                             </div>

                             <div className="bg-stone-50/60 p-4.5 rounded-2xl border border-stone-200/50">
                                <h4 className="font-bold text-stone-750 text-xs mb-3 flex items-center gap-2">
                                    <Code size={15} className="text-indigo-500"/> คลิกที่ตัวแปรเพื่อแทรกลงในเนื้อหาด้านบน
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {AVAILABLE_VARIABLES.map(v => (
                                        <button 
                                            key={v.code}
                                            type="button"
                                            onClick={() => insertVariable(v.code)}
                                            className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-250/70 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-750 text-xs text-stone-600 transition-all text-left shadow-sm active:scale-95 duration-150"
                                        >
                                            <Plus size={12} className="shrink-0 text-stone-400"/>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[10.5px] leading-tight">{v.label}</span>
                                                <span className="font-mono text-[9px] opacity-70 scale-95 origin-left mt-0.5 text-indigo-600 font-semibold">{v.code}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'line' && (
                    <div className="glass-card p-6 md:p-8 space-y-6 border border-white/50 shadow-xl">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/60 pb-5">
                            <div>
                                <h3 className="text-base font-extrabold text-stone-850 flex items-center gap-2">
                                    <MessageCircle className="text-emerald-600" size={20}/> LINE Messaging API Connection
                                </h3>
                                <p className="text-xs text-stone-500 font-medium mt-1">เชื่อมต่อเพื่อรับการแจ้งเตือนและรหัสติดตามหนังสือผ่านทางไลน์ (LINE OA)</p>
                            </div>
                            <label className="relative inline-flex items-center shrink-0 cursor-not-allowed opacity-60">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={config.lineEnabled} 
                                    disabled 
                                    onChange={e => setConfig({...config, lineEnabled: e.target.checked})}
                                />
                                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                <span className="ml-3 text-xs font-bold text-stone-550">เร็วๆ นี้</span>
                            </label>
                        </div>

                        <div className="space-y-4 pt-2 opacity-60 pointer-events-none grayscale">
                             <div className="space-y-1.5">
                                <label className="modern-input-label px-1">Channel Access Token</label>
                                <input 
                                    type="text" 
                                    className="modern-input font-mono text-xs" 
                                    value={config.lineChannelAccessToken}
                                    onChange={e => setConfig({...config, lineChannelAccessToken: e.target.value})}
                                    placeholder="Long-lived access token"
                                />
                             </div>
                             <div className="space-y-1.5">
                                <label className="modern-input-label px-1">Channel Secret</label>
                                <div className="relative">
                                    <input 
                                        type={showLineSecret ? "text" : "password"}
                                        className="modern-input font-mono text-xs pr-12" 
                                        value={config.lineChannelSecret}
                                        onChange={e => setConfig({...config, lineChannelSecret: e.target.value})}
                                        placeholder="Your Channel Secret"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowLineSecret(!showLineSecret)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 p-1 hover:bg-stone-100 rounded-lg transition-colors"
                                    >
                                        {showLineSecret ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                             </div>
                             <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-250/50 text-amber-800 text-xs flex items-start gap-2.5">
                                <Info size={16} className="text-amber-600 shrink-0 mt-0.5"/>
                                <span className="font-semibold leading-relaxed">ฟังก์ชันการเชื่อมต่อ LINE Messaging API กำลังอยู่ในขั้นตอนพัฒนาเพิ่มความปลอดภัย จะเปิดใช้งานในแพลตฟอร์มเวอร์ชันถัดไป</span>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'gemini' && (
                    <div className="space-y-6">
                        <div className="glass-card p-6 md:p-8 space-y-6 border border-white/50 shadow-xl">
                            <div className="border-b border-stone-200/60 pb-5">
                                <h3 className="text-base font-extrabold text-stone-850 flex items-center gap-2">
                                    <Code className="text-purple-650" size={20}/> ตั้งค่าการเชื่อมต่อ Google Gemini API Key
                                </h3>
                                <p className="text-xs text-stone-500 font-medium mt-1">ใช้สำหรับการดึงรายละเอียดเอกสาร เช่น เลขที่ วันที่ และเรื่องอ้างอิง แบบอัตโนมัติด้วย OCR ปัญญาประดิษฐ์</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="modern-input-label px-1">Gemini API Key</label>
                                    <div className="relative">
                                        <input 
                                            type={showGeminiKey ? "text" : "password"}
                                            className="modern-input font-mono text-xs pr-12 font-semibold" 
                                            value={geminiApiKey}
                                            onChange={e => setGeminiApiKey(e.target.value)}
                                            placeholder="AIzaSy..."
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowGeminiKey(!showGeminiKey)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 p-1 hover:bg-stone-100 rounded-lg transition-colors"
                                        >
                                            {showGeminiKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-stone-400 font-medium px-1">
                                        แอดมินสามารถสร้างและขอรับ API Key ฟรีได้จาก <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-600 font-bold hover:underline">Google AI Studio</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <button 
                        type="submit" 
                        disabled={saving} 
                        className="btn btn-primary font-bold px-8 py-3.5 shadow-lg shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 text-sm"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} บันทึกการตั้งค่าทั้งหมด
                    </button>
                </div>
            </form>
        </div>
    );
};
export default NotificationSettings;

