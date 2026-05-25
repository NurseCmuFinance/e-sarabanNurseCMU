
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

  return (
    <Router>
      <style>{getThemeStyles()}</style>
      {!user ? (
        <Routes>
          <Route path="*" element={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 lg:p-6 font-sans relative gradient-mesh-bg overflow-hidden">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                 <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-200/20 rounded-full blur-3xl"></div>
                 <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] bg-purple-200/20 rounded-full blur-3xl"></div>
              </div>
              <div className="w-full max-w-5xl lg:bg-white/40 lg:backdrop-blur-md lg:border lg:border-white/50 lg:rounded-3xl lg:shadow-2xl overflow-hidden grid lg:grid-cols-12 min-h-screen lg:min-h-[600px] lg:h-[700px] relative z-10">
                
                {/* Left Panel: Aesthetic branding */}
                <div className="hidden lg:flex lg:col-span-7 gradient-primary p-12 flex-col justify-between relative overflow-hidden">
                   <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                   <div className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-white/10 rounded-full blur-3xl"></div>
                   <div className="absolute -bottom-[20%] -right-[10%] w-[80%] h-[80%] bg-white/10 rounded-full blur-3xl"></div>
                   
                   <div className="relative z-10 flex items-center gap-3 animate-fade-in-down">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-xl flex items-center justify-center font-bold text-xl border border-white/20 shadow-md">E</div>
                      <span className="font-extrabold text-xl text-white tracking-wide">E-Saraban 2026</span>
                   </div>
                   
                   <div className="relative z-10 my-auto space-y-6 animate-fade-in-up">
                      <h2 className="text-4xl font-extrabold text-white leading-tight">ระบบสารบรรณอิเล็กทรอนิกส์<br/>ยุคใหม่ เพื่อการทำงานที่รวดเร็ว</h2>
                      <p className="text-white/80 text-sm leading-relaxed max-w-md">ระบบจัดการและติดตามหนังสือราชการอัจฉริยะ ออกแบบมาเพื่อเพิ่มประสิทธิภาพในการทำงานของบุคลากรทางการพยาบาล สวยงาม ใช้งานง่าย และรวดเร็ว</p>
                      
                      <div className="flex gap-4 pt-4">
                         <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex-1 text-center">
                            <div className="text-2xl font-black text-white">100%</div>
                            <div className="text-[10px] text-white/75 font-semibold uppercase mt-1">Paperless Workflow</div>
                         </div>
                         <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex-1 text-center">
                            <div className="text-2xl font-black text-white">Smart OCR</div>
                            <div className="text-[10px] text-white/75 font-semibold uppercase mt-1">AI-Powered Tech</div>
                         </div>
                      </div>
                   </div>
                   
                   <div className="relative z-10 flex justify-between items-center text-[10px] text-white/60">
                      <span>© 2026 Nurse CMU E-Saraban. All rights reserved.</span>
                      <span>Version 3.0.0</span>
                   </div>
                </div>

                {/* Right Panel: Content Form */}
                <div className="col-span-12 lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 bg-white/75 backdrop-blur-lg lg:bg-white/90 overflow-y-auto max-h-screen lg:max-h-none">
                  
                  {/* Small header on mobile */}
                  <div className="flex lg:hidden items-center justify-between mb-6">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-md">E</div>
                        <span className="font-extrabold text-base text-slate-800">E-Saraban</span>
                     </div>
                     <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">v3.0.0</span>
                  </div>

                  <div className="my-auto space-y-6">
                    <div className="text-left">
                      <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                         {authView === 'login' && 'เข้าสู่ระบบเจ้าหน้าที่'}
                         {authView === 'register' && 'ลงทะเบียนผู้ใช้งาน'}
                         {authView === 'forgot' && 'ลืมรหัสผ่าน'}
                      </h1>
                      <p className="text-slate-500 text-xs mt-1 font-medium">
                         {authView === 'login' && 'ระบบจัดการเอกสารสารบรรณสำหรับบุคลากรภายใน'}
                         {authView === 'register' && 'กรุณากรอกข้อมูลให้ครบถ้วนเพื่อความรวดเร็วในการตรวจสอบสิทธิ์'}
                         {authView === 'forgot' && 'กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับรีเซ็ตรหัสผ่านใหม่'}
                      </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs border border-red-100 animate-pulse flex items-start gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                            <div>
                              <div className="font-bold">เกิดข้อผิดพลาด</div>
                              <div className="mt-0.5 leading-relaxed">{error}</div>
                            </div>
                        </div>
                    )}
                    
                    {success && (
                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-xs border border-emerald-100 flex items-start gap-2">
                            <CheckCircle2 size={16} className="shrink-0 mt-0.5"/>
                            <div>
                              <div className="font-bold">สำเร็จ</div>
                              <div className="mt-0.5 leading-relaxed">{success}</div>
                            </div>
                        </div>
                    )}

                    {authView === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                          <div className="space-y-1">
                            <label className="modern-input-label flex items-center gap-1"><User size={12}/> บัญชีผู้ใช้ / Username</label>
                            <input type="text" required className="modern-input" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} placeholder="กรอกชื่อผู้ใช้งาน..." />
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="modern-input-label flex items-center gap-1"><Lock size={12}/> รหัสผ่าน / Password</label>
                              <button type="button" onClick={() => { setAuthView('forgot'); setError(''); setSuccess(''); }} className="text-[11px] text-indigo-600 font-bold hover:underline">
                                  ลืมรหัสผ่าน?
                              </button>
                            </div>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} required className="modern-input pr-12" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                            </div>
                          </div>
                          
                          <button disabled={submitting} type="submit" className="btn btn-primary w-full py-3.5 mt-2 flex items-center justify-center gap-2">
                            {submitting ? <Loader2 className="animate-spin" size={20}/> : <LogIn size={20} />} เข้าสู่ระบบ
                          </button>
                          
                          <div className="pt-2 text-center">
                            <span className="text-slate-400 text-xs font-semibold">หากยังไม่มีบัญชีสำหรับเจ้าหน้าที่? </span>
                            <button type="button" onClick={() => { setAuthView('register'); setError(''); setSuccess(''); }} className="text-indigo-600 font-bold hover:underline text-xs">สมัครสมาชิกใหม่</button>
                          </div>
                        </form>
                    )}

                    {authView === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-3.5">
                            <div className="space-y-1 relative">
                              <label className="modern-input-label">ชื่อ-นามสกุล / Full Name</label>
                              <input 
                                  type="text" required 
                                  className="modern-input" 
                                  value={regForm.full_name} 
                                  onFocus={() => setFocusedField('fullname')}
                                  onBlur={() => setFocusedField(null)}
                                  onChange={e => setRegForm({...regForm, full_name: e.target.value})} 
                                  placeholder="กรอกชื่อ-นามสกุลจริง..."
                              />
                            </div>
                            
                            <div className="space-y-1 relative">
                              <label className="modern-input-label">ชื่อผู้ใช้ / Username</label>
                              <input 
                                  type="text" required 
                                  className="modern-input font-mono" 
                                  value={regForm.username} 
                                  onFocus={() => setFocusedField('username')}
                                  onBlur={() => setFocusedField(null)}
                                  placeholder="ภาษาอังกฤษและตัวเลขเท่านั้น..."
                                  onChange={e => {
                                      const val = e.target.value;
                                      if (/^[a-zA-Z0-9._-]*$/.test(val)) {
                                          setRegForm({...regForm, username: val});
                                      }
                                  }}
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="modern-input-label">อีเมล / Email Address</label>
                              <input type="email" required className="modern-input" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} placeholder="example@cmu.ac.th" />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="modern-input-label">รหัสผ่าน / Password</label>
                              <div className="relative">
                                  <input 
                                      type={showPassword ? "text" : "password"} 
                                      required 
                                      className="modern-input pr-12 font-bold" 
                                      value={regForm.password} 
                                      onChange={e => setRegForm({...regForm, password: e.target.value})} 
                                      placeholder="ขั้นต่ำ 8 ตัวอักษร..."
                                  />
                                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                  </button>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <label className="modern-input-label">ยืนยันรหัสผ่าน / Confirm Password</label>
                              <div className="relative">
                                  <input 
                                      type={showConfirmPassword ? "text" : "password"} 
                                      required 
                                      className={`modern-input pr-12 font-bold ${regForm.confirmPassword && regForm.confirmPassword !== regForm.password ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
                                      value={regForm.confirmPassword} 
                                      onChange={e => setRegForm({...regForm, confirmPassword: e.target.value})} 
                                      placeholder="กรอกรหัสผ่านอีกครั้ง..."
                                  />
                                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                      {showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                  </button>
                              </div>
                            </div>

                            <button disabled={submitting} type="submit" className="btn btn-success w-full py-3.5 mt-2 flex items-center justify-center gap-2">
                                {submitting ? <Loader2 className="animate-spin" size={20}/> : <UserPlus size={20} />} สมัครสมาชิกเจ้าหน้าที่
                            </button>
                            
                            <div className="pt-1 text-center">
                              <button type="button" onClick={() => { setAuthView('login'); }} className="text-slate-500 font-bold text-xs flex items-center justify-center gap-1 w-full hover:text-slate-700">
                                <ArrowLeft size={14}/> กลับสู่หน้าเข้าสู่ระบบ
                              </button>
                            </div>
                        </form>
                    )}

                    {authView === 'forgot' && (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div className="space-y-1">
                              <label className="modern-input-label flex items-center gap-1"><Mail size={12}/> อีเมลผู้ใช้งาน / Email Address</label>
                              <input type="email" required className="modern-input" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="กรอกอีเมลของคุณ..." />
                            </div>
                            
                            <button disabled={submitting} type="submit" className="btn btn-primary w-full py-3.5 mt-2 flex items-center justify-center gap-2">
                                {submitting ? <Loader2 className="animate-spin" size={20}/> : <Mail size={20} />} ส่งลิงก์ตั้งค่ารหัสผ่านใหม่
                            </button>
                            
                            <div className="pt-1 text-center">
                              <button type="button" onClick={() => { setAuthView('login'); }} className="text-slate-500 font-bold text-xs flex items-center justify-center gap-1 w-full hover:text-slate-700">
                                <ArrowLeft size={14}/> กลับสู่หน้าเข้าสู่ระบบ
                              </button>
                            </div>
                        </form>
                    )}
                  </div>

                  {/* Public Portal access bar */}
                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <Link to="/public-portal" className="block group">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex items-center justify-between hover:border-indigo-300 hover:bg-indigo-50/20 transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100/50 shrink-0 group-hover:scale-105 transition-transform"><Globe size={20} /></div>
                          <div className="text-left">
                            <h3 className="font-extrabold text-slate-800 text-xs tracking-tight">บริการออนไลน์สำหรับบุคคลทั่วไป</h3>
                            <p className="text-[10px] text-slate-400 font-medium">ยื่นเรื่องร้องเรียน / ติตตามสถานะหนังสือ</p>
                          </div>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"><ArrowRight size={14} /></div>
                      </div>
                    </Link>
                    <div className="mt-4 text-center"><p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">© 2026 E-Saraban Nurse CMU. All rights reserved.</p></div>
                  </div>

                </div>
              </div>
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
