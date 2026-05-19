
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex overflow-hidden w-full">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">E</div>
          <span className="font-bold text-lg text-slate-800 ml-2">E-Saraban</span>
        </div>
        
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-14rem)]">
          {menuItems.map((item) => {
            if (item.permission && !hasPermission(item.permission)) return null;
            const isActive = activeRoute === item.route || (item.route !== '/' && activeRoute.startsWith(item.route));
            return (
              <button key={item.id} onClick={() => { navigate(item.route); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon size={20} /> {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 border-t bg-white">
          <div className="p-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                          <UserCircle size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{user.full_name}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">{user.role}</p>
                      </div>
                  </div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                  <button onClick={() => setShowProfileModal(true)} className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="โปรไฟล์">
                      <Edit3 size={18} />
                  </button>
                  <button onClick={() => setShowThemeModal(true)} className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="เปลี่ยนธีม/สี">
                      <Palette size={18} />
                  </button>
                  <button onClick={handleRefresh} className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="รีเฟรช">
                      <RefreshCw size={18} />
                  </button>
                  <button onClick={() => setShowLogoutModal(true)} className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ออกจากระบบ">
                      <LogOut size={18} />
                  </button>
              </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
        {/* Global Toast Container */}
        {globalToast && (
            <div className={`fixed top-20 right-6 z-[100] max-w-sm w-full p-4 rounded-2xl shadow-2xl border flex gap-3 animate-in slide-in-from-right-10 duration-300 ${globalToast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${globalToast.type === 'success' ? 'bg-green-200 text-green-700' : 'bg-blue-200 text-blue-700'}`}>
                    {globalToast.type === 'success' ? <CheckCircle2 size={20}/> : <Mail size={20}/>}
                </div>
                <div className="flex-1">
                    <p className="font-bold text-sm mb-1">{globalToast.type === 'success' ? 'สำเร็จ' : 'ระบบแจ้งเตือน'}</p>
                    <p className="text-xs whitespace-pre-wrap leading-relaxed opacity-90">{globalToast.message}</p>
                </div>
                <button onClick={() => setGlobalToast(null)} className="text-current opacity-50 hover:opacity-100 h-fit"><X size={16}/></button>
            </div>
        )}

        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0 relative z-20">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            <div className="text-sm font-bold text-slate-500">
                {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          
          {/* Mascot Container: Fixed width to prevent walking past date, relative for mascot positioning */}
          <div className="relative w-48 h-16 overflow-visible hidden sm:block ml-auto">
             <Mascot />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">{children}</div>
      </main>

      {showLogoutModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><LogOutIcon size={32} /></div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันออกจากระบบ</h3>
                      <p className="text-slate-500 mb-6">คุณต้องการออกจากระบบสารบรรณใช่หรือไม่?</p>
                      <div className="flex gap-3">
                          <button onClick={() => setShowLogoutModal(false)} className="flex-1 px-4 py-3 text-slate-500 font-bold border rounded-xl hover:bg-slate-50">ยกเลิก</button>
                          <button onClick={() => { setShowLogoutModal(false); onLogout(); }} className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all active:scale-95">ยืนยัน</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Theme Settings Modal */}
      {showThemeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                  <div className="px-6 py-5 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Palette className="text-blue-600"/> ปรับแต่งการแสดงผล</h3>
                      <button onClick={() => setShowThemeModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Sun size={16}/> โหมดสี</h3>
                            <div className="flex gap-4">
                                <button onClick={() => setThemeMode('light')} className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${themeMode === 'light' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}>
                                    <Sun size={24} /> <span className="font-bold">ปกติ (Light)</span>
                                </button>
                                <button onClick={() => setThemeMode('dark')} className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${themeMode === 'dark' ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}>
                                    <Moon size={24} /> <span className="font-bold">ดาร์กโทน (Dark)</span>
                                </button>
                                <button onClick={() => setThemeMode('comfort')} className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${themeMode === 'comfort' ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}>
                                    <Coffee size={24} /> <span className="font-bold">สบายตา (Comfort)</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Palette size={16}/> สีธีมหลัก</h3>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                {THEME_COLORS.map(color => (
                                    <button
                                        key={color.hex}
                                        onClick={() => setThemeColor(color.hex)}
                                        className={`w-full aspect-square rounded-full transition-all flex items-center justify-center hover:scale-110 shadow-sm ${themeColor === color.hex ? 'ring-4 ring-offset-2 ring-blue-200 scale-110' : ''}`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    >
                                        {themeColor === color.hex && <Check className="text-white drop-shadow-md" size={16}/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                  </div>
                  <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                      <button onClick={() => setShowThemeModal(false)} className="px-5 py-3 text-slate-500 font-bold border rounded-xl hover:bg-white transition-all">ยกเลิก</button>
                      <button onClick={handleSaveTheme} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center gap-2 transition-all active:scale-95">
                          <Save size={18}/> บันทึกและรีโหลด
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showProfileModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-blue-600 p-6 text-center text-white relative">
                      <button onClick={() => { setShowProfileModal(false); setErrorMsg(null); }} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"><X size={24}/></button>
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><UserCircle size={40} /></div>
                      <h3 className="text-xl font-bold">ตั้งค่าโปรไฟล์</h3>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                      {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 flex items-center gap-2"><AlertCircle size={14}/> {errorMsg}</div>}
                      {successMsg && <div className="p-3 bg-green-50 text-green-600 text-xs font-bold rounded-lg border border-green-100 flex items-center gap-2"><CheckCircle2 size={14}/> {successMsg}</div>}
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อ-นามสกุล</label><input type="text" required className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all" value={editingName} onChange={e => setEditingName(e.target.value)} /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label><input type="text" required className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all font-mono" value={editingUsername} onChange={e => setEditingUsername(e.target.value)} /></div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">รหัสผ่านใหม่ (ปล่อยว่างถ้าไม่ต้องการเปลี่ยน)</label>
                          <div className="relative">
                              <input type={showPass ? "text" : "password"} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all font-bold" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">{showPass ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
                          </div>
                      </div>
                      <div className="pt-4 flex gap-3">
                          <button type="button" onClick={() => { setShowProfileModal(false); setErrorMsg(null); }} className="flex-1 px-4 py-3 text-slate-500 font-bold border rounded-xl hover:bg-slate-50">ยกเลิก</button>
                          <button type="submit" disabled={loading} className="flex-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                              {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={18}/>} บันทึก
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
