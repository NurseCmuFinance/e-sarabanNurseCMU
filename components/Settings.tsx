
import React, { useState, useEffect } from 'react';
import { 
  getDataSourceConfig, saveDataSourceConfig, 
  getRolePermissions, updateRolePermissions,
  getRunningConfig, updateRunningConfig,
  clearAllDocuments, getStorageConfig, saveStorageConfig
} from '../services/mockService';
import { DataSourceConfig, UserRole, PermissionType, RunningConfig, Profile, StorageConfig } from '../types';
import { PERMISSION_LABELS } from '../constants';
import { Database, Save, Shield, Server, FileSpreadsheet, Hash, Trash2, AlertTriangle, Loader2, Check, X, ShieldCheck, Lock, Info, CheckCircle2, Eye, EyeOff, Palette, Sun, Moon, Coffee, Smile, ChevronDown, Play, Clock, Shuffle, HardDrive, Cloud, AlertCircle } from 'lucide-react';
import { CHARACTERS, ACTIONS } from './Mascot';

const Settings: React.FC<{ user: Profile }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'datasource' | 'permissions' | 'running' | 'maintenance' | 'storage'>('datasource');
  const [savingConfig, setSavingConfig] = useState(false);
  const [dataConfig, setDataConfig] = useState<DataSourceConfig>({ type: 'local_mock' });
  const [permissions, setPermissions] = useState<Record<UserRole, PermissionType[]> | null>(null);
  const [runningConfig, setRunningConfig] = useState<RunningConfig | null>(null);
  const [storageConfig, setStorageConfig] = useState<StorageConfig>({ provider: 'local', googleDriveEnabled: false });

  // Maintenance States
  const [showClearModal, setShowClearModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clearError, setClearError] = useState('');
  const [clearSuccess, setClearSuccess] = useState(false);
  const [showClearPass, setShowClearPass] = useState(false);
  const [showStorageSecret, setShowStorageSecret] = useState(false);

  useEffect(() => { 
      loadData(); 
      // Load Google Identity Services Script for Google Drive connection
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); }
  }, []);

  const loadData = async () => {
    const [config, perms, runConf, storageConf] = await Promise.all([
        getDataSourceConfig(), 
        getRolePermissions(),
        getRunningConfig(),
        getStorageConfig()
    ]);
    setDataConfig(config);
    setPermissions(perms);
    setRunningConfig(runConf);
    setStorageConfig(storageConf);
  };

  const handleTogglePermission = (role: UserRole, perm: PermissionType) => {
    if (!permissions) return;
    const current = permissions[role];
    const updated = current.includes(perm) 
        ? current.filter(p => p !== perm)
        : [...current, perm];
    
    const newPerms = { ...permissions, [role]: updated };
    setPermissions(newPerms);
  };

  const handleSavePermissions = async () => {
    if (!permissions) return;
    setSavingConfig(true);
    try {
        await updateRolePermissions(permissions);
    } catch (e) {
        console.error(e);
    } finally {
        setSavingConfig(false);
    }
  };

  const handleExecuteClear = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingConfig(true);
      setClearError('');
      try {
          await clearAllDocuments(confirmPassword, user);
          setClearSuccess(true);
          setTimeout(() => {
              window.location.reload();
          }, 2000);
      } catch (err: any) {
          console.error("Clear Error:", err);
          setClearError(err.message || "เกิดข้อผิดพลาดในการลบข้อมูล");
      } finally {
          setSavingConfig(false);
      }
  };

  const handleSaveRunningConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (runningConfig) {
        setSavingConfig(true);
        await updateRunningConfig(runningConfig);
        setSavingConfig(false);
      }
  };

  const handleSaveStorageConfig = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingConfig(true);
      await saveStorageConfig(storageConfig);
      setSavingConfig(false);
  };

  const handleGoogleDriveAuth = () => {
      if (!storageConfig.googleDriveClientId || !storageConfig.googleDriveClientSecret) {
          alert("กรุณากรอก Client ID และ Client Secret ให้ครบถ้วนก่อนเชื่อมต่อ");
          return;
      }

      // Use Code Client to get Authorization Code (for Refresh Token)
      // @ts-ignore
      const client = google.accounts.oauth2.initCodeClient({
          client_id: storageConfig.googleDriveClientId,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
          ux_mode: 'popup',
          prompt: 'consent',
          access_type: 'offline',
          callback: async (response: any) => {
              if (response.code) {
                  setSavingConfig(true);
                  try {
                      // Exchange Code for Tokens
                      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                          body: new URLSearchParams({
                              code: response.code,
                              client_id: storageConfig.googleDriveClientId!,
                              client_secret: storageConfig.googleDriveClientSecret!,
                              redirect_uri: window.location.origin,
                              grant_type: 'authorization_code',
                          }),
                      });

                      if (!tokenRes.ok) {
                          const err = await tokenRes.json();
                          throw new Error(`Token Exchange Failed: ${err.error_description || err.error}`);
                      }

                      const tokens = await tokenRes.json();
                      
                      const newConfig = {
                          ...storageConfig,
                          googleDriveRefreshToken: tokens.refresh_token || storageConfig.googleDriveRefreshToken,
                      };
                      
                      localStorage.setItem('esaraban_gd_access_token', tokens.access_token);
                      localStorage.setItem('esaraban_gd_token_expiry', String(Date.now() + (tokens.expires_in * 1000)));
                      
                      setStorageConfig(newConfig);
                      await saveStorageConfig(newConfig);
                      alert("เชื่อมต่อกับ Google Drive สำเร็จ! ระบบเปิดการใช้งานอัปโหลดไฟล์อัตโนมัติแล้ว");
                  } catch (e: any) {
                      console.error("Google Drive Auth Error:", e);
                      alert(`การเชื่อมต่อล้มเหลว: ${e.message}`);
                  } finally {
                      setSavingConfig(false);
                  }
              }
          },
      });
      client.requestCode();
  };

  const handleMascotToggle = async () => {
      if (!runningConfig) return;
      const newConfig = { ...runningConfig, mascotEnabled: !runningConfig.mascotEnabled };
      setRunningConfig(newConfig);
      await updateRunningConfig(newConfig);
  };

  const handleMascotChange = async (key: string, value: any) => {
      if (!runningConfig) return;
      // Convert to number for interval if needed
      const val = key === 'mascotInterval' ? parseInt(value) : value;
      const newConfig = { ...runningConfig, [key]: val };
      setRunningConfig(newConfig);
      await updateRunningConfig(newConfig);
  };

  // Determine if we show the interval input
  const showIntervalInput = runningConfig?.mascotId === 'random' || runningConfig?.mascotAction === 'random';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1>
          <p className="text-slate-500 font-medium">จัดการความปลอดภัย ข้อมูล และการรันเลขรับ</p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          <button onClick={() => setActiveTab('datasource')} className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'datasource' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Database size={18} /> ข้อมูล (Data)</button>
          <button onClick={() => setActiveTab('storage')} className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'storage' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><HardDrive size={18} /> การจัดเก็บไฟล์ (Storage)</button>
          <button onClick={() => setActiveTab('permissions')} className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'permissions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Shield size={18} /> สิทธิ์ (Permissions)</button>
          <button onClick={() => setActiveTab('running')} className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'running' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}><Hash size={18} /> เลขรับ (Running)</button>
          {user.role === UserRole.ADMIN && (
              <button onClick={() => setActiveTab('maintenance')} className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'maintenance' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-400 hover:text-red-600'}`}><Trash2 size={18} /> ดูแลระบบ (Admin)</button>
          )}
        </nav>
      </div>

      <div className="bg-white rounded-2xl border p-8 shadow-sm min-h-[400px]">
        
        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && user.role === UserRole.ADMIN && (
            <div className="max-w-2xl space-y-8">
                {/* Mascot Config */}
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-pink-100 rounded-full translate-x-10 -translate-y-10 opacity-50"></div>
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm text-pink-500"><Smile size={24}/></div>
                            <div>
                                <h3 className="font-bold text-pink-800 text-lg">Global Mascot Settings</h3>
                                <p className="text-sm text-pink-600">ตั้งค่าตัวการ์ตูนที่จะแสดงผลหน้าจอของทุกคน</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={runningConfig?.mascotEnabled || false}
                                onChange={handleMascotToggle}
                            />
                            <div className="w-14 h-7 bg-pink-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-pink-600"></div>
                        </label>
                    </div>

                    {runningConfig?.mascotEnabled && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 relative z-10">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-pink-800 uppercase flex items-center gap-1"><Smile size={12}/> เลือกตัวการ์ตูน</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-pink-400 text-sm font-medium"
                                            value={runningConfig.mascotId || '1'}
                                            onChange={(e) => handleMascotChange('mascotId', e.target.value)}
                                        >
                                            <option value="random">🎲 สุ่ม (Random)</option>
                                            {CHARACTERS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.id}. {c.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none" size={16}/>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-pink-800 uppercase flex items-center gap-1"><Play size={12}/> เลือกท่าทาง</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-pink-400 text-sm font-medium"
                                            value={runningConfig.mascotAction || '1'}
                                            onChange={(e) => handleMascotChange('mascotAction', e.target.value)}
                                        >
                                            <option value="random">🎲 สุ่ม (Random)</option>
                                            {ACTIONS.map(a => <option key={a.id} value={a.id}>{a.id}. {a.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none" size={16}/>
                                    </div>
                                </div>
                            </div>

                            {/* Show this only when Random is selected */}
                            {showIntervalInput && (
                                <div className="flex items-center gap-4 bg-white/50 p-3 rounded-xl border border-pink-100 animate-in fade-in slide-in-from-top-1">
                                    <Clock size={18} className="text-pink-600"/>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-pink-800">เปลี่ยนการสุ่มทุกๆ</span>
                                        <input 
                                            type="number" 
                                            min="1"
                                            className="w-16 px-2 py-1 text-center border border-pink-200 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-pink-300 outline-none"
                                            value={runningConfig.mascotInterval || 5}
                                            onChange={(e) => handleMascotChange('mascotInterval', e.target.value)}
                                        />
                                        <span className="text-sm font-bold text-pink-800">นาที</span>
                                    </div>
                                </div>
                            )}
                            
                            <p className="text-xs text-pink-600 bg-white/50 p-3 rounded-lg border border-pink-100">
                                * หากเลือก "สุ่ม" ระบบจะทำการเปลี่ยนตัวละครหรือท่าทางให้อัตโนมัติในทุกๆ ช่วงเวลา เพื่อให้ทุกคนเห็นเหมือนกัน
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex flex-col md:flex-row gap-6">
                    <div className="p-4 bg-red-100 text-red-600 rounded-2xl h-fit flex items-center justify-center"><AlertTriangle size={32}/></div>
                    <div>
                        <h3 className="text-red-800 font-bold text-xl mb-2">ล้างฐานข้อมูลหนังสือ</h3>
                        <p className="text-red-700 text-sm leading-relaxed mb-6">
                            การดำเนินการนี้จะลบรายการหนังสือ ประวัติเส้นทางหนังสือ และไฟล์แนบทั้งหมดในระบบอย่างถาวร 
                            <span className="font-bold underline block mt-2 text-red-600">* คำเตือน: ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้ เหมาะสำหรับเริ่มปีงบประมาณใหม่</span>
                        </p>
                        <button 
                            onClick={() => { setShowClearModal(true); setClearError(''); setClearSuccess(false); setShowClearPass(false); }} 
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Trash2 size={20}/> ล้างข้อมูลทั้งหมดในระบบ
                        </button>
                    </div>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex gap-4">
                    <Info className="text-slate-400 shrink-0" size={24}/>
                    <div className="text-sm text-slate-500">
                        <p className="font-bold text-slate-700 mb-1">การลบข้อมูลระบบ</p>
                        <p>รหัสผ่านที่ต้องกรอกคือรหัสผ่านที่คุณใช้ล็อกอินเข้าสู่ระบบในปัจจุบันเพื่อยืนยันว่าคุณคือแอดมินผู้มีสิทธิ์สูงสุด</p>
                    </div>
                </div>
            </div>
        )}
        
        {activeTab === 'permissions' && permissions && (
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-blue-600 font-bold">
                        <ShieldCheck size={24}/>
                        <span>กำหนดสิทธิ์การเข้าถึงฟังก์ชันงาน</span>
                    </div>
                    <button onClick={handleSavePermissions} disabled={savingConfig} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50">
                        {savingConfig ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} บันทึกการเปลี่ยนแปลง
                    </button>
                </div>
                
                <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-left font-bold text-slate-500">ฟังก์ชันงาน / ความสามารถ</th>
                                {Object.values(UserRole).map(role => (
                                    <th key={role} className="px-6 py-4 text-center font-bold text-slate-800 uppercase">{role}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                                <tr key={perm} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-700">{label}</td>
                                    {Object.values(UserRole).map(role => (
                                        <td key={role} className="px-6 py-4 text-center">
                                            <label className="relative inline-flex items-center cursor-pointer justify-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={permissions[role as UserRole].includes(perm as PermissionType)}
                                                    onChange={() => handleTogglePermission(role as UserRole, perm as PermissionType)}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        
        {activeTab === 'running' && runningConfig && (
            <form onSubmit={handleSaveRunningConfig} className="max-w-xl space-y-6">
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex gap-4 mb-6">
                    <div className="text-blue-600"><Hash size={24}/></div>
                    <p className="text-sm text-blue-800">แอดมินสามารถกำหนดเลขรับเริ่มต้นของปีงบประมาณนั้นๆ ได้ที่นี่ หากมีการรับหนังสือไปแล้ว เลขจะรันต่อจากค่าที่ตั้งไว้อัตโนมัติ</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 px-1">ปีปัจจุบัน (พ.ศ.)</label>
                        <input type="number" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-all font-bold" value={runningConfig.currentYear} onChange={(e) => setRunningConfig({...runningConfig, currentYear: parseInt(e.target.value)})}/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 px-1">เลขรับเริ่มต้นใหม่</label>
                        <input type="number" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-all font-bold" value={runningConfig.lastBookNo} onChange={(e) => setRunningConfig({...runningConfig, lastBookNo: parseInt(e.target.value)})}/>
                    </div>
                </div>
                <button type="submit" disabled={savingConfig} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 flex items-center gap-2 transition-all active:scale-95">
                    {savingConfig ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} บันทึกการตั้งค่า
                </button>
            </form>
        )}
        
        {activeTab === 'datasource' && (
            <div className="max-w-xl space-y-6">
                 <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl border">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600"><Database size={24}/></div>
                    <div>
                        <p className="font-bold text-slate-800">สถานะการเชื่อมต่อ</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-green-600 font-bold uppercase">Connected to Supabase</span>
                        </div>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Database Provider</label>
                    <input type="text" disabled className="w-full px-4 py-3 border rounded-xl bg-slate-100 text-slate-500 font-mono text-sm" value="PostgreSQL (Supabase Cloud)"/>
                 </div>
                 <p className="text-slate-400 italic text-sm text-center">ระบบถูกตั้งค่าให้ซิงค์ข้อมูลแบบ Real-time ตลอดเวลา</p>
            </div>
        )}

        {/* NEW: Storage Tab */}
        {activeTab === 'storage' && (
            <form onSubmit={handleSaveStorageConfig} className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="bg-white rounded-2xl p-6 border flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl shadow-sm ${storageConfig.googleDriveEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                            <HardDrive size={24}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">Google Drive Integration</h3>
                            <p className="text-sm text-slate-500">เก็บไฟล์แนบไว้ใน Google Drive แทนฐานข้อมูล (ประหยัดพื้นที่)</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={storageConfig.googleDriveEnabled}
                            onChange={e => setStorageConfig({...storageConfig, googleDriveEnabled: e.target.checked})}
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                </div>

                <div className={`space-y-6 transition-all ${storageConfig.googleDriveEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${storageConfig.googleDriveRefreshToken ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                <Cloud size={20}/>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">สถานะการเชื่อมต่อ Google Drive</p>
                                {storageConfig.googleDriveRefreshToken ? (
                                    <div className="flex flex-col">
                                        <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                                            <CheckCircle2 size={12}/> เชื่อมต่อบัญชีสำเร็จ
                                        </p>
                                        <p className="text-[10px] text-slate-500">ระบบจะอัปโหลดไฟล์ PDF ขึ้น Google Drive โดยอัตโนมัติ</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">ยังไม่ได้เชื่อมต่อบัญชี (กรุณากรอกข้อมูลและกดปุ่มเชื่อมต่อ)</p>
                                )}
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={handleGoogleDriveAuth}
                            className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-50 flex items-center gap-2 active:scale-95 transition-all text-xs"
                        >
                            <Cloud size={14}/> {storageConfig.googleDriveRefreshToken ? 'เชื่อมต่อใหม่ (Re-connect)' : 'เชื่อมต่อบัญชี Google'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 px-1">Google Client ID</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            value={storageConfig.googleDriveClientId || ''}
                            onChange={e => setStorageConfig({...storageConfig, googleDriveClientId: e.target.value})}
                            placeholder="xxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 px-1">Client Secret</label>
                        <div className="relative">
                            <input 
                                type={showStorageSecret ? "text" : "password"} 
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm pr-12"
                                value={storageConfig.googleDriveClientSecret || ''}
                                onChange={e => setStorageConfig({...storageConfig, googleDriveClientSecret: e.target.value})}
                                placeholder="GOCSPX-xxxxxxxxxxxxxxxxx"
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowStorageSecret(!showStorageSecret)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                {showStorageSecret ? <EyeOff size={20}/> : <Eye size={20}/>}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 px-1">Target Folder ID</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                value={storageConfig.googleDriveFolderId || ''}
                                onChange={e => setStorageConfig({...storageConfig, googleDriveFolderId: e.target.value})}
                                placeholder="Folder ID from URL (e.g. 1A2B3C...)"
                            />
                        </div>
                        <p className="text-xs text-slate-400 px-1">ID ของโฟลเดอร์ปลายทางที่จะใช้เก็บไฟล์ (ดูได้จาก URL ของ Google Drive)</p>
                    </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                    <button type="submit" disabled={savingConfig} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 flex items-center gap-2 transition-all active:scale-95">
                        {savingConfig ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} บันทึกการตั้งค่า
                    </button>
                </div>
            </form>
        )}
      </div>

      {/* Maintenance Modal */}
      {showClearModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className={`p-6 text-white text-center relative transition-colors ${clearSuccess ? 'bg-green-600' : 'bg-red-600'}`}>
                      {!clearSuccess && <button onClick={() => { setShowClearModal(false); setClearError(''); }} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={24}/></button>}
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          {clearSuccess ? <CheckCircle2 size={32}/> : <Lock size={32}/>}
                      </div>
                      <h3 className="text-xl font-bold uppercase tracking-wider">
                          {clearSuccess ? 'ล้างข้อมูลสำเร็จ' : 'ยืนยันการล้างข้อมูล'}
                      </h3>
                  </div>
                  
                  {clearSuccess ? (
                      <div className="p-10 text-center space-y-4">
                          <p className="text-slate-600 font-bold">ฐานข้อมูลถูกล้างเรียบร้อยแล้ว</p>
                          <p className="text-sm text-slate-400">ระบบจะรีสตาร์ทเพื่อรีเฟรชข้อมูลใหม่ในสักครู่...</p>
                          <Loader2 className="animate-spin mx-auto text-green-600" size={24}/>
                      </div>
                  ) : (
                      <form onSubmit={handleExecuteClear} className="p-8 space-y-6">
                          <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-700 text-sm font-bold flex items-center gap-2">
                            <AlertTriangle size={20} className="shrink-0"/>
                            <p>ระวัง! ข้อมูลหนังสือทั้งหมดจะหายไปถาวร กรุณากรอกรหัสผ่านเพื่อยืนยัน</p>
                          </div>
                          
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">ADMIN PASSWORD</label>
                              <div className="relative">
                                  <input 
                                    type={showClearPass ? "text" : "password"} 
                                    required 
                                    autoFocus 
                                    className={`w-full px-4 py-3 pr-12 border rounded-xl outline-none focus:ring-2 transition-all ${clearError ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-slate-200 focus:ring-blue-500 bg-slate-50'}`} 
                                    placeholder="รหัสผ่านของคุณ..."
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => setShowClearPass(!showClearPass)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                  >
                                    {showClearPass ? <EyeOff size={20} /> : <Eye size={20} />}
                                  </button>
                              </div>
                              {clearError && <p className="text-red-500 text-xs font-bold flex items-center gap-1 mt-1"><AlertTriangle size={12}/> {clearError}</p>}
                          </div>
                          
                          <div className="flex gap-3">
                              <button type="button" onClick={() => { setShowClearModal(false); setClearError(''); }} className="flex-1 px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">ยกเลิก</button>
                              <button type="submit" disabled={savingConfig || !confirmPassword} className="flex-2 px-8 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all">
                                  {savingConfig ? <Loader2 className="animate-spin" size={18}/> : <Trash2 size={18}/>} ยืนยันลบถาวร
                              </button>
                          </div>
                      </form>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;
