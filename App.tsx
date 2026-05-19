
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import RegisterForm from './components/RegisterForm';
import DocumentDetail from './components/DocumentDetail';
import SearchTracking from './components/SearchTracking';
import UserManagement from './components/UserManagement';
import ChatSystem from './components/ChatSystem';
import Reports from './components/Reports';
import Settings from './components/Settings';
import PublicPortal from './components/PublicPortal';
import PublicSubmission from './components/PublicSubmission';
import MasterDataMgmt from './components/MasterDataMgmt';
import ScanReceive from './components/ScanReceive';
import NotificationSettings from './components/NotificationSettings';
import SmartOCRRegistration from './components/SmartOCRRegistration';
// Mascot removed from here, moved to Layout
import { Profile, UserRole } from './types';
import { loginUser, logoutUser, registerExternalUser, sendResetPasswordEmail } from './services/mockService';
import { LogIn, Loader2, User, Globe, ArrowRight, Eye, EyeOff, Lock, UserPlus, Mail, ArrowLeft, CheckCircle2, AlertCircle, Check, X } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Theme State
  const [themeColor, setThemeColor] = useState('#2563eb');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'comfort'>('light');

  // Login State
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  // Register State
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', full_name: '', confirmPassword: '' });
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('esaraban_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('esaraban_user');
      }
    }
    
    // Load Theme Preference
    const savedColor = localStorage.getItem('esaraban_theme_color');
    const savedMode = localStorage.getItem('esaraban_theme_mode');
    if (savedColor) setThemeColor(savedColor);
    if (savedMode) setThemeMode(savedMode as any);

    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const u = await loginUser(loginForm.username, loginForm.password);
      
      // 3. ป้องกัน User ธรรมดาเข้าสู่ระบบหลังบ้าน
      if (u.role === UserRole.USER) {
          throw new Error("บัญชีนี้สำหรับใช้งานผ่าน Public Portal เท่านั้น");
      }

      setUser(u);
      localStorage.setItem('esaraban_user', JSON.stringify(u));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const checkPasswordStrength = (pass: string) => {
    return {
      lower: /[a-z]/.test(pass),
      upper: /[A-Z]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
      number: /[0-9]/.test(pass),
      length: pass.length >= 8
    };
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validations
    const criteria = checkPasswordStrength(regForm.password);
    if (!Object.values(criteria).every(Boolean)) {
        setError('รหัสผ่านไม่ผ่านเกณฑ์ความปลอดภัย');
        return;
    }

    if (regForm.password !== regForm.confirmPassword) {
        setError('รหัสผ่านไม่ตรงกัน');
        return;
    }

    setSubmitting(true);
    try {
        await registerExternalUser(regForm); 
        setSuccess('สร้างบัญชีเรียบร้อยแล้ว กรุณารอแอดมินอนุมัติสิทธิ์การใช้งาน');
        setAuthView('login');
        setRegForm({ username: '', email: '', password: '', full_name: '', confirmPassword: '' });
    } catch (err: any) {
        setError(err.message);
    } finally {
        setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!forgotEmail) return;
      setSubmitting(true);
      setError('');
      try {
          await sendResetPasswordEmail(forgotEmail);
          setSuccess(`ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ ${forgotEmail} เรียบร้อยแล้ว โปรดตรวจสอบกล่องจดหมาย (หรือ Spam)`);
          setForgotEmail('');
          setTimeout(() => setAuthView('login'), 5000);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setSubmitting(false);
      }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    localStorage.removeItem('esaraban_user');
    setAuthView('login');
    setLoginForm({ username: '', password: '' });
    setError('');
  };

  const passCriteria = checkPasswordStrength(regForm.password);

  // Dynamic Theme Styles
  const getThemeStyles = () => {
      let filter = 'none';
      let bgColor = '';
      
      if (themeMode === 'comfort') {
          filter = 'sepia(0.3) contrast(0.95)';
          bgColor = '#fef3c7'; // Light amber
      } 
      
      return `
        /* Theme Color Overrides */
        [class*="bg-blue-600"] { background-color: ${themeColor} !important; }
        [class*="text-blue-600"] { color: ${themeColor} !important; }
        [class*="border-blue-600"] { border-color: ${themeColor} !important; }
        [class*="hover\\:bg-blue-700"]:hover { background-color: ${themeColor} !important; filter: brightness(0.9); }
        [class*="ring-blue-500"]:focus { --tw-ring-color: ${themeColor} !important; }
        
        /* Light/Comfort Backgrounds */
        ${themeMode === 'comfort' ? `body { background-color: ${bgColor} !important; filter: ${filter}; }` : ''}
        
        /* Dark Mode Overrides (Aggressive) */
        ${themeMode === 'dark' ? `
            body { background-color: #0f172a !important; color: #e2e8f0 !important; }
            .bg-white { background-color: #1e293b !important; color: #e2e8f0 !important; border-color: #334155 !important; }
            .bg-slate-50, .bg-slate-100 { background-color: #334155 !important; color: #e2e8f0 !important; }
            .text-slate-800, .text-slate-700, .text-slate-600, .text-slate-500 { color: #cbd5e1 !important; }
            .border-slate-200, .border-slate-300 { border-color: #475569 !important; }
            input, select, textarea { background-color: #334155 !important; color: white !important; border-color: #475569 !important; }
            /* Keep primary buttons readable */
            .text-white { color: white !important; }
        ` : ''}
      `;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <Router>
      <style>{getThemeStyles()}</style>
      
      {!user ? (
        <Routes>
          <Route path="/public-portal" element={<PublicPortal />} />
          <Route path="/public-submission" element={<PublicSubmission />} />
          <Route path="*" element={
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans relative">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                 <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-3xl"></div>
                 <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] bg-indigo-200/20 rounded-full blur-3xl"></div>
              </div>
              <div className="w-full max-w-md space-y-6 relative z-10">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-3xl shadow-lg transform rotate-3" style={{ background: `linear-gradient(to bottom right, ${themeColor}, #4f46e5)` }}>E</div>
                    <h1 className="text-2xl font-bold text-slate-800">E-Saraban System</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        {authView === 'login' && 'เข้าสู่ระบบสารบรรณ (สำหรับเจ้าหน้าที่)'}
                        {authView === 'register' && 'ลงทะเบียนเจ้าหน้าที่ใหม่'}
                        {authView === 'forgot' && 'รีเซ็ตรหัสผ่าน (Forgot Password)'}
                    </p>
                  </div>
                  
                  {error && (
                      <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 animate-pulse">
                          <div className="flex items-center gap-2 font-bold mb-1"><AlertCircle size={18} className="shrink-0"/> <span>Login Error</span></div>
                          <span>{error}</span>
                      </div>
                  )}
                  
                  {success && <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm mb-6 border border-green-100 flex items-center gap-2"><CheckCircle2 size={18} className="shrink-0"/> <span>{success}</span></div>}
                  
                  {authView === 'login' && (
                      <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700 uppercase px-1 flex items-center gap-1"><User size={12}/> บัญชีผู้ใช้ / Username</label><input type="text" required className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} placeholder="กรอกชื่อผู้ใช้งาน..." /></div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase px-1 flex items-center gap-1"><Lock size={12}/> รหัสผ่าน / Password</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} required className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white pr-12" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                            </div>
                            <div className="flex justify-end">
                                <button type="button" onClick={() => { setAuthView('forgot'); setError(''); setSuccess(''); }} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                                    <Lock size={10}/> ลืมรหัสผ่าน?
                                </button>
                            </div>
                        </div>
                        <button disabled={submitting} type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg hover:shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2">{submitting ? <Loader2 className="animate-spin" size={20}/> : <LogIn size={20} />} เข้าสู่ระบบ</button>
                        <div className="pt-4 text-center"><span className="text-slate-500 text-sm">ยังไม่มีบัญชี? </span><button type="button" onClick={() => { setAuthView('register'); setError(''); setSuccess(''); }} className="text-blue-600 font-bold hover:underline text-sm">สร้างบัญชีผู้ใช้งานใหม่</button></div>
                      </form>
                  )}
                  {authView === 'register' && (
                      <form onSubmit={handleRegister} className="space-y-4">
                          <div className="space-y-1.5 relative">
                            <label className="text-xs font-bold text-slate-500 uppercase px-1">ชื่อ-นามสกุล</label>
                            <input 
                                type="text" required 
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none" 
                                value={regForm.full_name} 
                                onFocus={() => setFocusedField('fullname')}
                                onBlur={() => setFocusedField(null)}
                                onChange={e => setRegForm({...regForm, full_name: e.target.value})} 
                            />
                          </div>
                          
                          <div className="space-y-1.5 relative">
                            <label className="text-xs font-bold text-slate-500 uppercase px-1">Username</label>
                            <input 
                                type="text" required 
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none font-mono" 
                                value={regForm.username} 
                                onFocus={() => setFocusedField('username')}
                                onBlur={() => setFocusedField(null)}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (/^[a-zA-Z0-9._-]*$/.test(val)) {
                                        setRegForm({...regForm, username: val});
                                    }
                                }}
                            />
                          </div>
                          <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 uppercase px-1">Email</label><input type="email" required className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} /></div>
                          
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase px-1">รหัสผ่าน</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required 
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none pr-12 font-bold" 
                                    value={regForm.password} 
                                    onChange={e => setRegForm({...regForm, password: e.target.value})} 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase px-1">ยืนยันรหัสผ่าน</label>
                            <div className="relative">
                                <input 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    required 
                                    className={`w-full px-4 py-3 border rounded-xl bg-slate-50 font-bold focus:ring-2 outline-none pr-12 ${regForm.confirmPassword && regForm.confirmPassword !== regForm.password ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-green-500'}`}
                                    value={regForm.confirmPassword} 
                                    onChange={e => setRegForm({...regForm, confirmPassword: e.target.value})} 
                                />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                            </div>
                          </div>

                          <div className="flex justify-center mt-4">
                            <button disabled={submitting} type="submit" className="px-10 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center gap-2">
                                {submitting ? <Loader2 className="animate-spin" size={20}/> : <UserPlus size={20} />} สมัครสมาชิก
                            </button>
                          </div>
                          <div className="pt-2 text-center"><button type="button" onClick={() => { setAuthView('login'); }} className="text-slate-500 font-bold text-sm flex items-center justify-center gap-1 w-full"><ArrowLeft size={16}/> กลับไปหน้าเข้าสู่ระบบ</button></div>
                      </form>
                  )}
                  {authView === 'forgot' && (
                      <form onSubmit={handleForgotPassword} className="space-y-5">
                          <div className="text-center text-slate-500 text-sm mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            กรอกอีเมลที่คุณใช้ลงทะเบียนเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
                          </div>
                          <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700 uppercase px-1 flex items-center gap-1"><Mail size={12}/> Email Address</label><input type="email" required className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} /></div>
                          <button disabled={submitting} type="submit" className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold hover:bg-slate-900 shadow-lg mt-2 flex items-center justify-center gap-2">
                              {submitting ? <Loader2 className="animate-spin" size={20}/> : <Mail size={20} />} ส่งลิงก์รีเซ็ต
                          </button>
                          <div className="pt-2 text-center"><button type="button" onClick={() => { setAuthView('login'); }} className="text-slate-500 font-bold text-sm flex items-center justify-center gap-1 w-full"><ArrowLeft size={16}/> กลับไปหน้าเข้าสู่ระบบ</button></div>
                      </form>
                  )}
                </div>
                <Link to="/public-portal" className="block group">
                  <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 flex items-center justify-between hover:border-blue-400 transition-all">
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-100"><Globe size={24} /></div><div><h3 className="font-bold text-slate-800 text-base">บริการสำหรับบุคคลทั่วไป</h3><p className="text-xs text-slate-500">ติดตามสถานะหนังสือ / ยื่นเรื่องออนไลน์</p></div></div>
                    <div className="bg-slate-50 p-2 rounded-full text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><ArrowRight size={20} /></div>
                  </div>
                </Link>
              </div>
              <div className="absolute bottom-4 text-center w-full"><p className="text-[10px] text-slate-400">© 2024 Thai Government Document System. All rights reserved.</p></div>
            </div>
          } />
        </Routes>
      ) : (
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Dashboard user={user} onRegisterClick={() => {}} />} />
            <Route path="/register" element={<RegisterForm user={user} />} />
            <Route path="/ocr-register" element={<SmartOCRRegistration user={user} />} />
            <Route path="/document/:id" element={<DocumentDetail user={user} />} />
            <Route path="/document/edit/:id" element={<RegisterForm user={user} />} />
            <Route path="/search" element={<SearchTracking />} />
            <Route path="/master-data" element={<MasterDataMgmt />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/notifications" element={<NotificationSettings user={user} />} />
            <Route path="/chat" element={<ChatSystem user={user} />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings user={user} />} />
            <Route path="/scan" element={<ScanReceive user={user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </Router>
  );
};

export default App;
