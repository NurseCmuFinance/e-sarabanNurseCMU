
import React, { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, PlusCircle, Search, FileText, Settings, LogOut, User as UserIcon, Users, MessageSquare, Globe, Database, UserCircle, Edit3, Save, Loader2, RefreshCw, XCircle, LogOut as LogOutIcon, AlertCircle, Eye, EyeOff, CheckCircle2, QrCode, BellRing, Mail, Palette, Sun, Moon, Coffee, Check, Camera } from 'lucide-react';
import { getRolePermissions, updateProfile, updateUserPassword } from '../services/mockService';
import { UserRole, PermissionType, Profile } from '../types';
import { THEME_COLORS } from '../constants';
import Mascot from './Mascot';

interface LayoutProps {
  children: ReactNode;
  user: Profile;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  
  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Profile Edit State
  const [editingName, setEditingName] = useState(user.full_name);
  const [editingUsername, setEditingUsername] = useState(user.username);
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Theme State
  const [themeColor, setThemeColor] = useState(localStorage.getItem('esaraban_theme_color') || '#2563eb');
  const [themeMode, setThemeMode] = useState(localStorage.getItem('esaraban_theme_mode') || 'light');

  // Global Toast State
  const [globalToast, setGlobalToast] = useState<{type: 'success' | 'info' | 'error', message: string} | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const activeRoute = location.pathname;

  useEffect(() => {
    getRolePermissions().then(perms => {
        setPermissions(perms[user.role] as PermissionType[] || []);
    });

    const handleCustomToast = (e: any) => {
        if (e.detail) {
            setGlobalToast(e.detail);
            setTimeout(() => setGlobalToast(null), 5000);
        }
    };

    window.addEventListener('esaraban-toast', handleCustomToast);
    return () => window.removeEventListener('esaraban-toast', handleCustomToast);
  }, [user]);

  const hasPermission = (perm: PermissionType) => {
      return user.role === UserRole.ADMIN || permissions.includes(perm);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
        await updateProfile(user.id, { full_name: editingName, username: editingUsername });
        if (newPassword.trim()) {
            await updateUserPassword(newPassword);
        }
        
        const updatedUser = { ...user, full_name: editingName, username: editingUsername };
        localStorage.setItem('esaraban_user', JSON.stringify(updatedUser));
        setSuccessMsg("บันทึกข้อมูลสำเร็จ");
        setTimeout(() => {
            setShowProfileModal(false);
            window.location.reload();
        }, 1000);
    } catch (err: any) {
        setErrorMsg(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveTheme = () => {
      localStorage.setItem('esaraban_theme_color', themeColor);
      localStorage.setItem('esaraban_theme_mode', themeMode);
      window.location.reload(); 
  };

  const handleRefresh = () => { window.location.reload(); };

  const menuItems = [
    { id: 'dashboard', label: 'แดชบอร์ด (Dashboard)', icon: Home, route: '/', permission: 'VIEW_DASHBOARD' as PermissionType },
    { id: 'scan-receive', label: 'สแกนรับหนังสือ (Scan QR)', icon: QrCode, route: '/scan', permission: 'SCAN_QR' as PermissionType },
    { id: 'register', label: 'รับหนังสือ (Register)', icon: PlusCircle, route: '/register', permission: 'REGISTER_DOC' as PermissionType },
    { id: 'ocr-register', label: 'รับหนังสือด้วยกล้อง (OCR)', icon: Camera, route: '/ocr-register', permission: 'REGISTER_DOC' as PermissionType },
    { id: 'search', label: 'ค้นหา/ติดตาม (Track)', icon: Search, route: '/search', permission: 'SEARCH_DOC' as PermissionType },
    { id: 'master-data', label: 'ข้อมูลพื้นฐาน (Master)', icon: Database, route: '/master-data', permission: 'MANAGE_USERS' as PermissionType },
    { id: 'users', label: 'จัดการผู้ใช้ (Users)', icon: Users, route: '/users', permission: 'MANAGE_USERS' as PermissionType },
    { id: 'notifications', label: 'ตั้งค่าการแจ้งเตือน', icon: BellRing, route: '/notifications', permission: 'MANAGE_NOTIFICATIONS' as PermissionType },
    { id: 'chat', label: 'ห้องสนทนา (Chat)', icon: MessageSquare, route: '/chat', permission: null },
    { id: 'reports', label: 'รายงาน (Reports)', icon: FileText, route: '/reports', permission: 'VIEW_REPORTS' as PermissionType },
    { id: 'settings', label: 'ตั้งค่าระบบ (Settings)', icon: Settings, route: '/settings', permission: 'MANAGE_SETTINGS' as PermissionType },
  ];

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex overflow-hidden w-full gradient-mesh-bg">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`fixed top-0 left-0 bottom-0 w-64 glass-sidebar z-50 transform transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-stone-200/40 bg-white/20">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-xl flex items-center justify-center font-black shadow-md shadow-indigo-100/50 hover:scale-105 transition-all">E</div>
          <span className="font-black text-lg bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent ml-3 tracking-tight">E-Saraban</span>
        </div>
        
        <nav className="p-4 space-y-1.5 overflow-y-auto h-[calc(100vh-14rem)] custom-scrollbar">
          {menuItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;
            const isActive = activeRoute === item.route || (item.route !== '/' && activeRoute.startsWith(item.route));
            return (
              <button key={item.id} onClick={() => { navigate(item.route); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-100/50 scale-[1.02]' : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'}`}>
                <item.icon size={18} className={isActive ? 'text-white' : 'text-stone-500'} /> {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 border-t border-stone-200/40 bg-white/40 backdrop-blur-md">
          <div className="p-4">
              <div className="bg-stone-50/80 p-3 rounded-2xl border border-stone-200/40 mb-3 shadow-inner">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-tr from-indigo-50 to-violet-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100/30 shrink-0 shadow-sm">
                          <UserCircle size={22} className="text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-stone-800 truncate leading-tight">{user.full_name}</p>
                          <span className="inline-block text-[9px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full mt-1 border border-indigo-100/20">{user.role.toUpperCase()}</span>
                      </div>
                  </div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                  <button onClick={() => setShowProfileModal(true)} className="flex flex-col items-center justify-center p-2.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all" title="โปรไฟล์">
                      <Edit3 size={18} />
                  </button>
                  <button onClick={() => setShowThemeModal(true)} className="flex flex-col items-center justify-center p-2.5 text-stone-400 hover:text-violet-600 hover:bg-violet-50/50 rounded-xl transition-all" title="เปลี่ยนธีม/สี">
                      <Palette size={18} />
                  </button>
                  <button onClick={handleRefresh} className="flex flex-col items-center justify-center p-2.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50/50 rounded-xl transition-all" title="รีเฟรช">
                      <RefreshCw size={18} />
                  </button>
                  <button onClick={() => setShowLogoutModal(true)} className="flex flex-col items-center justify-center p-2.5 text-stone-400 hover:text-red-600 hover:bg-red-50/50 rounded-xl transition-all" title="ออกจากระบบ">
                      <LogOut size={18} />
                  </button>
              </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
        {/* Global Toast Container */}
        {globalToast && (
            <div className={`fixed top-6 right-6 z-[100] max-w-sm w-full p-4 glass-modal border-l-4 flex gap-3 shadow-2xl animate-slide-in-right ${globalToast.type === 'success' ? 'border-l-emerald-500 bg-emerald-50/90 text-emerald-800' : 'border-l-indigo-500 bg-indigo-50/90 text-indigo-800'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${globalToast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {globalToast.type === 'success' ? <CheckCircle2 size={18}/> : <Mail size={18}/>}
                </div>
                <div className="flex-1">
                    <p className="font-extrabold text-xs mb-0.5">{globalToast.type === 'success' ? 'สำเร็จ' : 'ระบบแจ้งเตือน'}</p>
                    <p className="text-[11px] whitespace-pre-wrap leading-relaxed opacity-90 font-medium">{globalToast.message}</p>
                </div>
                <button onClick={() => setGlobalToast(null)} className="text-current opacity-45 hover:opacity-100 h-fit transition-opacity"><X size={14}/></button>
            </div>
        )}

        <header className="h-16 glass-header flex items-center justify-between px-8 shrink-0 relative z-20">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-stone-600 hover:text-indigo-600 transition-colors" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            <div className="text-xs font-bold text-stone-500 bg-stone-100/60 px-3.5 py-1.5 rounded-full border border-stone-200/40 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          
          {/* Mascot Container: Fixed width to prevent walking past date, relative for mascot positioning */}
          <div className="relative w-48 h-16 overflow-visible hidden sm:block ml-auto">
             <Mascot />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 animate-fade-in">{children}</div>
      </main>

      {showLogoutModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
              <div className="glass-modal w-full max-w-sm overflow-hidden animate-fade-in-scale p-6 text-center">
                  <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-inner"><LogOutIcon size={28} /></div>
                  <h3 className="text-lg font-black text-stone-800 mb-2">ยืนยันออกจากระบบ</h3>
                  <p className="text-stone-500 text-xs mb-6 leading-relaxed font-medium">คุณต้องการออกจากระบบสารบรรณใช่หรือไม่?</p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowLogoutModal(false)} className="btn btn-secondary flex-1 py-3 text-stone-500 font-bold border rounded-xl hover:bg-stone-50 text-xs">ยกเลิก</button>
                      <button onClick={() => { setShowLogoutModal(false); onLogout(); }} className="btn btn-danger flex-1 py-3 font-bold rounded-xl shadow-lg transition-all active:scale-95 text-xs">ออกจากระบบ</button>
                  </div>
              </div>
          </div>
      )}

      {/* Theme Settings Modal */}
      {showThemeModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
              <div className="glass-modal w-full max-w-2xl overflow-hidden animate-fade-in-scale flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-stone-200/50 bg-stone-50/50 flex justify-between items-center">
                      <h3 className="text-base font-black text-stone-800 flex items-center gap-2"><Palette className="text-indigo-600" size={18}/> ปรับแต่งการแสดงผล</h3>
                      <button onClick={() => setShowThemeModal(false)} className="text-stone-400 hover:text-stone-600 transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        <div>
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Sun size={14}/> โหมดสี</h3>
                            <div className="flex gap-4">
                                <button onClick={() => setThemeMode('light')} className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${themeMode === 'light' ? 'border-indigo-500 bg-indigo-50/30 text-indigo-700' : 'border-stone-200/60 hover:bg-stone-50 text-stone-500'}`}>
                                    <Sun size={20} /> <span className="font-extrabold text-xs">ปกติ (Light)</span>
                                </button>
                                <button onClick={() => setThemeMode('dark')} className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${themeMode === 'dark' ? 'border-stone-700 bg-stone-900 text-white' : 'border-stone-200/60 hover:bg-stone-50 text-stone-500'}`}>
                                    <Moon size={20} /> <span className="font-extrabold text-xs">ดาร์กโทน (Dark)</span>
                                </button>
                                <button onClick={() => setThemeMode('comfort')} className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${themeMode === 'comfort' ? 'border-amber-400 bg-amber-50/30 text-amber-800' : 'border-stone-200/60 hover:bg-stone-50 text-stone-500'}`}>
                                    <Coffee size={20} /> <span className="font-extrabold text-xs">สบายตา (Comfort)</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Palette size={14}/> สีธีมหลัก</h3>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                                {THEME_COLORS.map(color => (
                                    <button
                                        key={color.hex}
                                        onClick={() => setThemeColor(color.hex)}
                                        className={`w-full aspect-square rounded-full transition-all flex items-center justify-center hover:scale-110 shadow-inner ${themeColor === color.hex ? 'ring-4 ring-offset-2 ring-indigo-300 scale-105' : ''}`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    >
                                        {themeColor === color.hex && <Check className="text-white drop-shadow-md" size={14}/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                  </div>
                  <div className="p-4 border-t border-stone-200/50 bg-stone-50/50 flex justify-end gap-3">
                      <button onClick={() => setShowThemeModal(false)} className="btn btn-secondary px-5 py-2.5 text-stone-500 font-bold border rounded-xl hover:bg-white text-xs">ยกเลิก</button>
                      <button onClick={handleSaveTheme} className="btn btn-primary px-7 py-2.5 font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 text-xs">
                          <Save size={16}/> บันทึกและรีโหลด
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showProfileModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
              <div className="glass-modal w-full max-w-sm overflow-hidden animate-fade-in-scale">
                  <div className="gradient-primary p-6 text-center text-white relative">
                      <button onClick={() => { setShowProfileModal(false); setErrorMsg(null); }} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"><X size={20}/></button>
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-md"><UserCircle size={32} /></div>
                      <h3 className="text-base font-black">ตั้งค่าโปรไฟล์</h3>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                      {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2 animate-pulse"><AlertCircle size={14}/> {errorMsg}</div>}
                      {successMsg && <div className="p-3 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 flex items-center gap-2"><CheckCircle2 size={14}/> {successMsg}</div>}
                      
                      <div className="space-y-1">
                          <label className="modern-input-label">ชื่อ-นามสกุล</label>
                          <input type="text" required className="modern-input" value={editingName} onChange={e => setEditingName(e.target.value)} />
                      </div>
                      
                      <div className="space-y-1">
                          <label className="modern-input-label">Username</label>
                          <input type="text" required className="modern-input font-mono" value={editingUsername} onChange={e => setEditingUsername(e.target.value)} />
                      </div>
                      
                      <div className="space-y-1">
                          <label className="modern-input-label">รหัสผ่านใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)</label>
                          <div className="relative">
                              <input type={showPass ? "text" : "password"} className="modern-input pr-12 font-bold" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-indigo-600 transition-colors">{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                          </div>
                      </div>
                      <div className="pt-3 flex gap-3">
                          <button type="button" onClick={() => { setShowProfileModal(false); setErrorMsg(null); }} className="btn btn-secondary flex-1 py-3 text-stone-500 font-bold border rounded-xl hover:bg-stone-50 text-xs">ยกเลิก</button>
                          <button type="submit" disabled={loading} className="btn btn-primary flex-1 py-3 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-xs">
                              {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} บันทึก
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Layout;
