
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
        alert("💾 บันทึกการตั้งค่าสิทธิ์สำเร็จ!");
    } catch (e: any) {
        console.error(e);
        alert("เกิดข้อผิดพลาดในการบันทึก: " + e.message);
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
        try {
            await updateRunningConfig(runningConfig);
            alert("💾 บันทึกการตั้งค่าการรันเลขรับสำเร็จ!");
        } catch (err: any) {
            alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
        } finally {
            setSavingConfig(false);
        }
      }
  };

  const handleSaveStorageConfig = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingConfig(true);
      try {
          await saveStorageConfig(storageConfig);
          alert("💾 บันทึกการตั้งค่าการจัดเก็บไฟล์สำเร็จ!");
      } catch (err: any) {
          alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
      } finally {
          setSavingConfig(false);
      }
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
          scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email',
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
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            ตั้งค่าระบบ
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            จัดการความปลอดภัย การเชื่อมต่อข้อมูล และการรันเลขสารบรรณ
          </p>
        </div>
      </div>

      {/* Modern Glass Tab Navigation */}
      <div className="p-1 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-inner max-w-full overflow-x-auto custom-scrollbar">
        <nav className="flex gap-2 min-w-max">
          <button
            onClick={() => setActiveTab('datasource')}
            className={`py-3 px-5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'datasource'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database size={18} />
            แหล่งข้อมูล (Data Source)
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`py-3 px-5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'storage'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <HardDrive size={18} />
            จัดเก็บไฟล์ (Storage)
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-3 px-5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'permissions'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Shield size={18} />
            สิทธิ์การใช้งาน (Permissions)
          </button>
          <button
            onClick={() => setActiveTab('running')}
            className={`py-3 px-5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'running'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Hash size={18} />
            รันเลขรับ (Running No.)
          </button>
          {user.role === UserRole.ADMIN && (
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`py-3 px-5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 ${
                activeTab === 'maintenance'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/20'
              }`}
            >
              <Trash2 size={18} />
              ดูแลระบบ (Admin Controls)
            </button>
          )}
        </nav>
      </div>

      {/* Main Settings Card */}
      <div className="glass-card bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 shadow-xl min-h-[450px]">
        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && user.role === UserRole.ADMIN && (
          <div className="max-w-2xl space-y-8 animate-fade-in-up">
            {/* Mascot Config */}
            <div className="bg-gradient-to-br from-pink-950/20 to-purple-950/20 border border-pink-500/20 rounded-2xl p-6 relative overflow-hidden shadow-lg shadow-pink-950/5">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl border border-pink-500/20 shadow-inner">
                    <Smile size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-pink-300 text-lg">
                      Global Mascot Settings
                    </h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      ตั้งค่าตัวการ์ตูนต้อนรับที่จะแสดงผลหน้าจอของทุกคน
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={runningConfig?.mascotEnabled || false}
                    onChange={handleMascotToggle}
                  />
                  <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>

              {runningConfig?.mascotEnabled && (
                <div className="space-y-6 animate-fade-in-up relative z-10 border-t border-pink-500/10 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-pink-300/80 uppercase flex items-center gap-1">
                        <Smile size={12} /> เลือกตัวการ์ตูน
                      </label>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 bg-slate-950/60 border border-pink-500/20 text-slate-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-pink-500/40 text-sm font-medium"
                          value={runningConfig.mascotId || '1'}
                          onChange={(e) =>
                            handleMascotChange('mascotId', e.target.value)
                          }
                        >
                          <option value="random" className="bg-slate-950">
                            🎲 สุ่ม (Random)
                          </option>
                          {CHARACTERS.map((c) => (
                            <option
                              key={c.id}
                              value={c.id}
                              className="bg-slate-950"
                            >
                              {c.emoji} {c.id}. {c.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none"
                          size={16}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-pink-300/80 uppercase flex items-center gap-1">
                        <Play size={12} /> เลือกท่าทาง
                      </label>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 bg-slate-950/60 border border-pink-500/20 text-slate-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-pink-500/40 text-sm font-medium"
                          value={runningConfig.mascotAction || '1'}
                          onChange={(e) =>
                            handleMascotChange('mascotAction', e.target.value)
                          }
                        >
                          <option value="random" className="bg-slate-950">
                            🎲 สุ่ม (Random)
                          </option>
                          {ACTIONS.map((a) => (
                            <option
                              key={a.id}
                              value={a.id}
                              className="bg-slate-950"
                            >
                              {a.id}. {a.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none"
                          size={16}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Show this only when Random is selected */}
                  {showIntervalInput && (
                    <div className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-pink-500/10 animate-fade-in-up">
                      <Clock size={18} className="text-pink-400" />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-pink-300">
                          เปลี่ยนการสุ่มทุกๆ
                        </span>
                        <input
                          type="number"
                          min="1"
                          className="w-16 px-2 py-1 text-center border border-pink-500/20 rounded-lg text-sm font-bold bg-slate-950 text-pink-400 focus:ring-2 focus:ring-pink-500/40 outline-none"
                          value={runningConfig.mascotInterval || 5}
                          onChange={(e) =>
                            handleMascotChange('mascotInterval', e.target.value)
                          }
                        />
                        <span className="text-sm font-bold text-pink-300">
                          นาที
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-pink-300/60 bg-slate-950/40 p-3 rounded-lg border border-pink-500/5">
                    * หากเลือก "สุ่ม"
                    ระบบจะทำการเปลี่ยนตัวละครหรือท่าทางให้อัตโนมัติในทุกๆ
                    ช่วงเวลา เพื่อให้ทุกคนเห็นเหมือนกัน
                  </p>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-gradient-to-br from-rose-950/20 to-red-950/20 border border-rose-500/20 rounded-2xl p-8 flex flex-col md:flex-row gap-6 shadow-lg shadow-rose-950/5">
              <div className="p-4 bg-rose-500/10 text-rose-400 rounded-2xl h-fit flex items-center justify-center border border-rose-500/20 shadow-inner">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-rose-300 font-bold text-xl mb-1">
                    ล้างฐานข้อมูลหนังสือ
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    การดำเนินการนี้จะลบรายการหนังสือ ประวัติเส้นทางหนังสือ
                    และไฟล์แนบทั้งหมดในระบบอย่างถาวร
                    <span className="font-bold text-rose-400 block mt-2">
                      * คำเตือน:
                      ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้ในภายหลัง
                      เหมาะสำหรับเมื่อขึ้นระบบปีงบประมาณใหม่
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowClearModal(true);
                    setClearError('');
                    setClearSuccess(false);
                    setShowClearPass(false);
                  }}
                  className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-950/30 transition-all duration-300 active:scale-95 flex items-center gap-2 border border-rose-500/30 hover:shadow-rose-500/10"
                >
                  <Trash2 size={20} /> ล้างข้อมูลทั้งหมดในระบบ
                </button>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex gap-4 shadow-md">
              <Info className="text-slate-500 shrink-0 mt-0.5" size={24} />
              <div className="text-sm text-slate-400">
                <p className="font-bold text-slate-300 mb-1">
                  คำชี้แจงด้านความปลอดภัย
                </p>
                <p>
                  ในการล้างข้อมูลระบบ
                  ระบบจะบังคับให้คุณกรอกรหัสผ่านบัญชีของแอดมินที่คุณใช้อยู่ในปัจจุบัน
                  เพื่อเป็นการตรวจสอบสิทธิ์สูงสุดอีกชั้นหนึ่ง
                  ป้องกันการลบข้อมูลโดยอุบัติเหตุ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && permissions && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-lg">
                <ShieldCheck size={24} />
                <span>กำหนดสิทธิ์การเข้าใช้งานแยกตามบทบาท</span>
              </div>
              <button
                onClick={handleSavePermissions}
                disabled={savingConfig}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/10 transition-all duration-300 active:scale-95 disabled:opacity-50 border border-indigo-500/30"
              >
                {savingConfig ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800">
                    <th className="px-6 py-4 text-left font-bold text-slate-300">
                      ฟังก์ชันงาน / ความสามารถ
                    </th>
                    {Object.values(UserRole).map((role) => (
                      <th
                        key={role}
                        className="px-6 py-4 text-center font-bold text-indigo-300 uppercase tracking-wider"
                      >
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                    <tr
                      key={perm}
                      className="hover:bg-slate-900/30 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 font-medium text-slate-300">
                        {label}
                      </td>
                      {Object.values(UserRole).map((role) => (
                        <td key={role} className="px-6 py-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer justify-center">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={permissions[role as UserRole].includes(
                                perm as PermissionType
                              )}
                              onChange={() =>
                                handleTogglePermission(
                                  role as UserRole,
                                  perm as PermissionType
                                )
                              }
                            />
                            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:after:border-indigo-400"></div>
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

        {/* Running Tab */}
        {activeTab === 'running' && runningConfig && (
          <form
            onSubmit={handleSaveRunningConfig}
            className="max-w-xl space-y-6 animate-fade-in-up"
          >
            <div className="bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-indigo-500/20 p-6 rounded-2xl flex gap-4 shadow-lg shadow-indigo-950/5">
              <div className="text-indigo-400">
                <Hash size={24} />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                การตั้งค่าสำหรับกำหนดปีงบประมาณและเลขสารบรรณเริ่มต้น
                เมื่อมีข้อมูลหนังสือใหม่รันเข้าระบบ
                ระบบจะตรวจสอบและใช้ค่าถัดไปโดยอัตโนมัติ
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 px-1">
                  ปีปัจจุบัน (พ.ศ.)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-200 transition-all font-bold"
                  value={runningConfig.currentYear}
                  onChange={(e) =>
                    setRunningConfig({
                      ...runningConfig,
                      currentYear: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 px-1">
                  เลขสารบรรณรับเริ่มต้น (เลขปัจจุบัน)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-200 transition-all font-bold"
                  value={runningConfig.lastBookNo}
                  onChange={(e) =>
                    setRunningConfig({
                      ...runningConfig,
                      lastBookNo: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingConfig}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/10 flex items-center gap-2 transition-all duration-300 active:scale-95 border border-indigo-500/30"
            >
              {savingConfig ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              บันทึกการตั้งค่า
            </button>
          </form>
        )}

        {/* Datasource Tab */}
        {activeTab === 'datasource' && (
          <div className="max-w-xl space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-4 p-6 bg-slate-950/30 rounded-2xl border border-slate-800 shadow-md">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-xl shadow-inner text-indigo-400">
                <Database size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-200">สถานะการเชื่อมต่อฐานข้อมูล</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-glow shadow-emerald-500/50"></span>
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                    Connected to Supabase
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                Database Provider
              </label>
              <input
                type="text"
                disabled
                className="w-full px-4 py-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-slate-400 font-mono text-sm shadow-inner"
                value="PostgreSQL (Supabase Cloud Service)"
              />
            </div>
            <p className="text-slate-500 italic text-sm text-center">
              ระบบได้รับการตั้งค่าเพื่อซิงค์ข้อมูลกับคลาวด์ตลอดเวลาแบบ Real-time
            </p>
          </div>
        )}

        {/* Storage Tab */}
        {activeTab === 'storage' && (
          <form
            onSubmit={handleSaveStorageConfig}
            className="max-w-2xl space-y-8 animate-fade-in-up"
          >
            <div className="bg-slate-950/30 rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl border shadow-inner ${
                    storageConfig.googleDriveEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800/50 text-slate-500 border-slate-700/50'
                  }`}
                >
                  <HardDrive size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200 text-lg">
                    Google Drive Integration
                  </h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    เก็บไฟล์เอกสารแนบไว้ใน Google Drive แทนการเก็บลงฐานข้อมูลโดยตรง (ลดการใช้พื้นที่)
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={storageConfig.googleDriveEnabled}
                  onChange={(e) =>
                    setStorageConfig({
                      ...storageConfig,
                      googleDriveEnabled: e.target.checked,
                    })
                  }
                />
                <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div
              className={`space-y-6 transition-all duration-300 ${
                storageConfig.googleDriveEnabled
                  ? 'opacity-100'
                  : 'opacity-40 pointer-events-none grayscale'
              }`}
            >
              <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border ${
                      storageConfig.googleDriveRefreshToken
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-glow shadow-emerald-500/5'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    <Cloud size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-200 text-sm">
                      สถานะการเชื่อมต่อบัญชี Google
                    </p>
                    {storageConfig.googleDriveRefreshToken ? (
                      <div className="flex flex-col mt-0.5">
                        <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} /> เชื่อมโยงบัญชีสำเร็จ
                        </p>
                        <p className="text-[10px] text-slate-500">
                          ระบบจะเริ่มอัปโหลดไฟล์ PDF ใหม่ทั้งหมดเข้าสู่บัญชีของคุณทันที
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">
                        ยังไม่ได้อนุญาตสิทธิ์การเข้าถึง (กรุณากรอกข้อมูลด้านล่างให้ครบและเชื่อมต่อ)
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleDriveAuth}
                  className="px-5 py-2 bg-slate-955 border border-slate-800 text-slate-350 font-bold rounded-xl shadow-sm hover:bg-slate-900 flex items-center gap-2 active:scale-95 transition-all text-xs"
                >
                  <Cloud size={14} />{' '}
                  {storageConfig.googleDriveRefreshToken
                    ? 'เชื่อมต่อใหม่อีกครั้ง'
                    : 'เชื่อมต่อบัญชี Google'}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-350 px-1">
                  Google Client ID
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 font-mono text-sm shadow-inner"
                  value={storageConfig.googleDriveClientId || ''}
                  onChange={(e) =>
                    setStorageConfig({
                      ...storageConfig,
                      googleDriveClientId: e.target.value,
                    })
                  }
                  placeholder="xxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-350 px-1">
                  Client Secret
                </label>
                <div className="relative">
                  <input
                    type={showStorageSecret ? 'text' : 'password'}
                    className="w-full px-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 font-mono text-sm pr-12 shadow-inner"
                    value={storageConfig.googleDriveClientSecret || ''}
                    onChange={(e) =>
                      setStorageConfig({
                        ...storageConfig,
                        googleDriveClientSecret: e.target.value,
                      })
                    }
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStorageSecret(!showStorageSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    {showStorageSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-350 px-1">
                  Target Folder ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 font-mono text-sm shadow-inner"
                    value={storageConfig.googleDriveFolderId || ''}
                    onChange={(e) =>
                      setStorageConfig({
                        ...storageConfig,
                        googleDriveFolderId: e.target.value,
                      })
                    }
                    placeholder="Folder ID from URL (e.g. 1A2B3C...)"
                  />
                </div>
                <p className="text-xs text-slate-500 px-1">
                  รหัสโฟลเดอร์สำหรับอ้างอิงของโฟลเดอร์ที่จะจัดเก็บไฟล์ (ได้จาก URL
                  เมื่อเปิดโฟลเดอร์ในเว็บเบราว์เซอร์)
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/10 flex items-center gap-2 transition-all duration-300 active:scale-95 border border-indigo-500/30"
              >
                {savingConfig ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                บันทึกการตั้งค่า
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Maintenance Clear Data Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card bg-slate-900 border border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-scale">
            <div
              className={`p-6 text-white text-center relative transition-colors ${
                clearSuccess
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 border-b border-rose-500/20'
              }`}
            >
              {!clearSuccess && (
                <button
                  onClick={() => {
                    setShowClearModal(false);
                    setClearError('');
                  }}
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              )}
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                {clearSuccess ? <CheckCircle2 size={32} /> : <Lock size={32} />}
              </div>
              <h3 className="text-xl font-bold uppercase tracking-wider">
                {clearSuccess ? 'ล้างข้อมูลสำเร็จแล้ว' : 'ยืนยันเพื่อดำเนินการ'}
              </h3>
            </div>

            {clearSuccess ? (
              <div className="p-10 text-center space-y-4">
                <p className="text-slate-200 font-bold">ฐานข้อมูลถูกทำความสะอาดเรียบร้อย</p>
                <p className="text-sm text-slate-400">
                  ระบบจะทำการรีบูตข้อมูลและหน้าเว็บใหม่ใน 2 วินาที...
                </p>
                <div className="inline-block relative">
                  <Loader2 className="animate-spin text-emerald-400" size={28} />
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteClear} className="p-8 space-y-6">
                <div className="bg-rose-955/30 p-4 rounded-xl border border-rose-500/20 text-rose-300 text-sm font-bold flex items-start gap-2 shadow-inner">
                  <AlertTriangle size={20} className="shrink-0 mt-0.5 text-rose-400" />
                  <p>
                    ข้อควรระวัง: รายการหนังสือเอกสารทั้งหมดในระบบจะถูกล้างอย่างถาวร
                    กรุณากรอกรหัสผ่านเพื่ออนุมัติ
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                    ADMIN PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      type={showClearPass ? 'text' : 'password'}
                      required
                      autoFocus
                      className={`w-full px-4 py-3 pr-12 rounded-xl outline-none focus:ring-2 transition-all font-medium ${
                        clearError
                          ? 'border border-rose-500 bg-rose-950/20 focus:ring-rose-500/40 text-rose-350'
                          : 'border border-slate-800 bg-slate-950/50 focus:ring-indigo-500/40 text-slate-200'
                      }`}
                      placeholder="ป้อนรหัสผ่านปัจจุบันของคุณ..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowClearPass(!showClearPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                      {showClearPass ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {clearError && (
                    <p className="text-rose-400 text-xs font-bold flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} className="text-rose-400" /> {clearError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowClearModal(false);
                      setClearError('');
                    }}
                    className="flex-1 px-4 py-3 text-slate-400 font-bold hover:bg-slate-800 hover:text-white rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={savingConfig || !confirmPassword}
                    className="flex-2 px-8 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-rose-950/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all border border-rose-500/30"
                  >
                    {savingConfig ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Trash2 size={18} />
                    )}
                    ยืนยันลบถาวร
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
