import React, { useState, useEffect } from 'react';
import { loginUser, logoutUser, registerExternalUser, getDocuments, updateProfile, updateUserPassword, getPublicDocument, getLogs } from '../services/mockService';
import { Profile, UserRole, Document, DocStatus, DocumentLog } from '../types';
import { Send, User, LogOut, FileText, Search, Eye, EyeOff, Lock, UserCircle, Edit3, Save, RefreshCw, Loader2, CheckCircle2, AlertCircle, XCircle, ListFilter, ChevronLeft, ChevronRight, ArrowLeft, BarChart3, MessageSquare, Check, X, Clock, CheckCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { Link } from 'react-router-dom';
import RegisterForm from './RegisterForm';
import DocumentDetail from './DocumentDetail';
import Reports from './Reports';
import ChatSystem from './ChatSystem';

const PublicPortal: React.FC = () => {
  const [user, setUser] = useState<Profile | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'dashboard' | 'submit' | 'detail' | 'edit' | 'report' | 'chat' | 'public_search'>('login');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  // Register State
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', full_name: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Edit Profile State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  
  // Public Search State
  const [trackCode, setTrackCode] = useState('');
  const [trackResult, setTrackResult] = useState<Document | null>(null);
  const [trackLogs, setTrackLogs] = useState<DocumentLog[]>([]);
  const [searching, setSearching] = useState(false);

  // UI Interaction State
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Initialize Edit form when modal opens
  useEffect(() => {
      if (user) {
          setEditName(user.full_name);
      }
  }, [user, showProfileModal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
        const u = await loginUser(loginForm.username, loginForm.password);
        if (u.role === UserRole.USER) { 
            setUser(u); 
            setView('dashboard'); 
            loadDocuments(u.id); 
        }
        else { setError('หน้านี้สำหรับบุคคลทั่วไปเท่านั้น เจ้าหน้าที่โปรดเข้าสู่ระบบผ่านหน้าหลัก'); }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      setSavingProfile(true);
      setError('');
      setSuccess('');

      try {
          // Update Name
          if (editName !== user.full_name) {
              await updateProfile(user.id, { full_name: editName });
          }
          
          // Update Password
          if (newPass.trim()) {
              const criteria = checkPasswordStrength(newPass);
              if (!Object.values(criteria).every(Boolean)) {
                  throw new Error("รหัสผ่านใหม่ไม่ผ่านเกณฑ์ความปลอดภัย");
              }
              await updateUserPassword(newPass);
          }

          // Update Local State
          setUser({ ...user, full_name: editName });
          
          setSuccess('บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว');
          setTimeout(() => {
              setShowProfileModal(false);
              setSuccess('');
              setNewPass('');
          }, 1500);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setSavingProfile(false);
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
    setLoading(true);
    setError('');

    // Validation
    const criteria = checkPasswordStrength(regForm.password);
    if (!Object.values(criteria).every(Boolean)) {
        setError('รหัสผ่านไม่ผ่านเกณฑ์ความปลอดภัย');
        setLoading(false);
        return;
    }
    if (regForm.password !== confirmPassword) {
        setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
        setLoading(false);
        return;
    }

    try {
        await registerExternalUser(regForm);
        setSuccess('ลงทะเบียนสำเร็จ! กรุณารอแอดมินอนุมัติบัญชี');
        setView('login');
        setRegForm({ username: '', email: '', password: '', full_name: '' });
        setConfirmPassword('');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const loadDocuments = async (userId: string) => {
      setLoading(true);
      const docs = await getDocuments(userId, UserRole.USER);
      setDocuments(docs);
      setLoading(false);
  };

  const handleRowClick = (docId: string) => {
      setSelectedDocId(docId);
      setView('detail');
  };

  const handleInternalEdit = (docId: string) => {
      setSelectedDocId(docId);
      setView('edit');
  };

  const handlePublicTrackSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!trackCode.trim()) return;
      setSearching(true);
      setError('');
      setTrackResult(null);
      setTrackLogs([]);
      try {
          const doc = await getPublicDocument(trackCode.trim());
          if (doc) {
              setTrackResult(doc);
              const logs = await getLogs(doc.id);
              setTrackLogs(logs);
          } else {
              setError("ไม่พบข้อมูลเอกสาร หรือรหัสไม่ถูกต้อง (ค้นหาได้ทั้ง Tracking Code และ เลขที่หนังสือ)");
          }
      } catch (err: any) {
          setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      } finally {
          setSearching(false);
      }
  };

  const openPdf = (base64: string) => {
    try {
        if (base64.startsWith('http')) {
            window.open(base64, '_blank');
            return;
        }
        const arr = base64.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bstr = atob(arr.length > 1 ? arr[1] : base64);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new Blob([u8arr], {type: mime});
        const fileURL = URL.createObjectURL(file);
        const win = window.open(fileURL, '_blank');
        if (!win) alert("โปรดอนุญาตให้เบราว์เซอร์เปิด Pop-up เพื่อดูเอกสาร");
    } catch (e) {
        console.error("Error opening PDF:", e);
        alert("ไม่สามารถเปิดไฟล์ได้");
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
    doc.tracking_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedDocs = rowsPerPage === -1 ? filteredDocs : filteredDocs.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const passCriteria = checkPasswordStrength(regForm.password);
  const editPassCriteria = checkPasswordStrength(newPass);

  if (!user && (view === 'login' || view === 'register' || view === 'public_search')) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-green-100/40 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4"></div>
            </div>
            <div className="w-full max-w-lg relative z-10">
                <div className="flex justify-between items-center mb-6 px-2">
                    <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors"><ArrowLeft size={16}/> กลับหน้าหลัก</Link>
                    {view !== 'login' && <button onClick={() => setView('login')} className="text-slate-500 hover:text-blue-600 font-bold text-sm">เข้าสู่ระบบสมาชิก</button>}
                </div>
                
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-white/50 backdrop-blur-sm">
                    {view === 'public_search' ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-3xl shadow-md"><Search size={36} /></div>
                                <h1 className="text-2xl font-bold text-slate-800">ติดตามสถานะหนังสือ</h1>
                                <p className="text-slate-500 text-sm">กรอกข้อมูลเพื่อดูรายละเอียด</p>
                            </div>
                            
                            <form onSubmit={handlePublicTrackSearch} className="relative mb-6">
                                <input 
                                    type="text" 
                                    className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono font-bold text-left text-lg text-slate-700" 
                                    placeholder="Tracking Code / เลขที่หนังสือ"
                                    value={trackCode}
                                    onChange={e => setTrackCode(e.target.value)}
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24}/>
                                <button type="submit" disabled={searching} className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50">
                                    {searching ? <Loader2 className="animate-spin" /> : 'ค้นหา'}
                                </button>
                            </form>

                            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-bold mb-6 animate-pulse border border-red-100">{error}</div>}

                            {trackResult && (
                                <div className="animate-in slide-in-from-bottom-4 fade-in duration-300 space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-bold text-lg text-slate-800 leading-snug">{trackResult.subject}</h3>
                                            <StatusBadge status={trackResult.status} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><p className="text-[10px] text-slate-400 font-bold uppercase">เลขรับ</p><p className="font-bold text-slate-700">{trackResult.book_no ? `${trackResult.book_no}/${trackResult.book_year}` : '-'}</p></div>
                                            <div><p className="text-[10px] text-slate-400 font-bold uppercase">เลขที่หนังสือ</p><p className="font-bold text-slate-700">{trackResult.external_book_no || '-'}</p></div>
                                            <div><p className="text-[10px] text-slate-400 font-bold uppercase">วันที่ลง</p><p className="font-bold text-slate-700">{new Date(trackResult.doc_date).toLocaleDateString('th-TH')}</p></div>
                                            <div><p className="text-[10px] text-slate-400 font-bold uppercase">Tracking Code</p><p className="font-mono text-slate-700">{trackResult.tracking_code}</p></div>
                                            <div className="col-span-2"><p className="text-[10px] text-slate-400 font-bold uppercase">จาก</p><p className="font-bold text-slate-700">{trackResult.from_origin}</p></div>
                                            <div className="col-span-2"><p className="text-[10px] text-slate-400 font-bold uppercase">ถึง</p><p className="font-bold text-slate-700">{trackResult.recipient_name || '-'}</p></div>
                                        </div>

                                        {/* Attachments for Public Search */}
                                        {(trackResult.attachment_url || trackResult.approved_attachment_url) && (
                                            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 gap-2">
                                                {trackResult.attachment_url && (
                                                    <button onClick={() => openPdf(trackResult.attachment_url!)} className="w-full flex items-center justify-between p-3 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors group text-left shadow-sm">
                                                        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><FileText size={16}/></div><span className="text-xs font-bold text-slate-700">เอกสารต้นฉบับ</span></div>
                                                        <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-[10px] font-bold border border-blue-100 group-hover:bg-white flex items-center gap-1"><Eye size={12}/> เปิดดู</span>
                                                    </button>
                                                )}
                                                {trackResult.approved_attachment_url && (
                                                    <button onClick={() => openPdf(trackResult.approved_attachment_url!)} className="w-full flex items-center justify-between p-3 bg-white border border-green-200 rounded-xl hover:bg-green-50 transition-colors group text-left shadow-sm">
                                                        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center"><CheckCircle size={16}/></div><span className="text-xs font-bold text-slate-700">เอกสารอนุมัติ</span></div>
                                                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-[10px] font-bold border border-green-100 group-hover:bg-white flex items-center gap-1"><Eye size={12}/> เปิดดู</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pb-2">
                                        {trackLogs.map((log, i) => (
                                            <div key={i} className="relative pl-6">
                                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${i === 0 ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-slate-300'}`}></div>
                                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">{new Date(log.timestamp).toLocaleString('th-TH')}</p>
                                                <p className="font-bold text-slate-800 text-sm">{log.action}</p>
                                                <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mt-1 inline-block">{log.details}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : view === 'login' ? (
                      <>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-3xl shadow-lg shadow-blue-200 transform rotate-3">P</div>
                            <h1 className="text-2xl font-bold text-slate-800">เข้าสู่ระบบสมาชิก</h1>
                            <p className="text-slate-500 text-sm">สำหรับบุคคลทั่วไปที่ลงทะเบียนแล้ว</p>
                        </div>
                        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-bold mb-6 animate-pulse border border-red-100 text-sm">{error}</div>}
                        {success && <div className="bg-green-50 text-green-600 p-4 rounded-xl text-center font-bold mb-6 animate-pulse border border-green-100 text-sm">{success}</div>}
                        
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700 uppercase px-1">บัญชีผู้ใช้</label><input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} placeholder="Username หรือ Email" /></div>
                            <div className="space-y-1.5 relative">
                                <label className="text-xs font-bold text-slate-700 uppercase px-1">รหัสผ่าน</label>
                                <input 
                                    type={showLoginPassword ? "text" : "password"} 
                                    required 
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white pr-12" 
                                    value={loginForm.password} 
                                    onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                                    placeholder="••••••••" 
                                />
                                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 mt-3 text-slate-400 hover:text-slate-600"><Eye size={18} /></button>
                            </div>
                            <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">{loading ? <Loader2 className="animate-spin" size={20}/> : <User size={20} />} เข้าสู่ระบบ</button>
                            <div className="text-center pt-2"><button type="button" onClick={() => setView('register')} className="text-sm font-bold text-blue-600 hover:underline">สมัครสมาชิกใหม่</button></div>
                        </form>
                      </>
                    ) : (
                      <>
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-slate-800">สมัครสมาชิก</h1>
                            <p className="text-slate-500 text-sm">สร้างบัญชีสำหรับติดตามและยื่นเรื่อง</p>
                        </div>
                        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-bold mb-6 text-xs">{error}</div>}
                        <form onSubmit={handleRegister} className="space-y-4">
                             <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 uppercase px-1">ชื่อ-นามสกุล</label><input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none" value={regForm.full_name} onChange={e => setRegForm({...regForm, full_name: e.target.value})} /></div>
                             <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 uppercase px-1">Username</label><input type="text" required className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none font-mono" value={regForm.username} onChange={e => setRegForm({...regForm, username: e.target.value})} /></div>
                             <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 uppercase px-1">Email</label><input type="email" required className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} /></div>
                             
                             <div className="space-y-1.5 relative">
                                <label className="text-xs font-bold text-slate-500 uppercase px-1">รหัสผ่าน</label>
                                <input type={showRegPassword ? "text" : "password"} required className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none pr-12 font-bold" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} />
                                <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 mt-3 text-slate-400">{showRegPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                             </div>
                             
                             <div className="space-y-1.5 relative">
                                <label className="text-xs font-bold text-slate-500 uppercase px-1">ยืนยันรหัสผ่าน</label>
                                <input type={showConfirmPassword ? "text" : "password"} required className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none pr-12 font-bold" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 mt-3 text-slate-400">{showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                             </div>

                             <button disabled={loading} type="submit" className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all active:scale-95 mt-4">{loading ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'สมัครสมาชิก'}</button>
                             <div className="text-center pt-2"><button type="button" onClick={() => setView('login')} className="text-sm font-bold text-slate-500 hover:text-slate-800">มีบัญชีอยู่แล้ว?</button></div>
                        </form>
                      </>
                    )}
                </div>
                
                {view !== 'public_search' && view === 'login' && (
                    <div className="text-center mt-6">
                        <button onClick={() => setView('public_search')} className="bg-white px-6 py-3 rounded-xl shadow-sm text-slate-600 font-bold text-sm border hover:border-blue-400 hover:text-blue-600 transition-all flex items-center gap-2 mx-auto">
                            <Search size={18} /> ค้นหา/ติดตามสถานะ (ไม่ต้องล็อกอิน)
                        </button>
                    </div>
                )}
            </div>
        </div>
      );
  }

  // Logged In Views
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">E</div>
                    <span className="font-bold text-slate-800 hidden sm:inline">E-Saraban Public Portal</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-600 hidden sm:inline">สวัสดี, {user?.full_name}</span>
                    <button onClick={() => setShowProfileModal(true)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition-colors"><UserCircle size={24} /></button>
                    <button onClick={() => { logoutUser(); setUser(null); setView('login'); }} className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-600 transition-colors"><LogOut size={20} /></button>
                </div>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
            {view === 'dashboard' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h1 className="text-2xl font-bold text-slate-800">รายการยื่นเรื่องของคุณ</h1>
                        <div className="flex gap-2">
                            <button onClick={() => setView('chat')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2">
                                <MessageSquare size={18} /> ติดต่อเจ้าหน้าที่
                            </button>
                            <button onClick={() => setView('submit')} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2 transition-all active:scale-95">
                                <Send size={18} /> ยื่นเรื่องใหม่
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">ทั้งหมด</p><p className="text-2xl font-bold text-slate-800">{documents.length}</p></div>
                        <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-amber-500 uppercase">รอรับเรื่อง</p><p className="text-2xl font-bold text-amber-600">{documents.filter(d => d.status === DocStatus.PENDING_ACCEPT || d.status === DocStatus.PENDING_VERIFY).length}</p></div>
                        <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-blue-500 uppercase">กำลังดำเนินการ</p><p className="text-2xl font-bold text-blue-600">{documents.filter(d => d.status === DocStatus.REGISTERED || d.status === DocStatus.FORWARDED).length}</p></div>
                        <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-green-500 uppercase">เสร็จสิ้น</p><p className="text-2xl font-bold text-green-600">{documents.filter(d => d.status === DocStatus.APPROVED).length}</p></div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2"><ListFilter size={18}/> ประวัติการยื่นคำร้อง</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                <input type="text" placeholder="ค้นหา..." className="pl-9 pr-4 py-1.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-slate-500 font-bold border-b">
                                    <tr>
                                        <th className="px-6 py-4">วันที่ยื่น</th>
                                        <th className="px-6 py-4">เรื่อง</th>
                                        <th className="px-6 py-4">Tracking Code</th>
                                        <th className="px-6 py-4">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paginatedDocs.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">ไม่พบข้อมูล</td></tr>
                                    ) : paginatedDocs.map(doc => (
                                        <tr key={doc.id} onClick={() => handleRowClick(doc.id)} className="hover:bg-blue-50 cursor-pointer group">
                                            <td className="px-6 py-4 text-slate-500">{new Date(doc.created_at).toLocaleDateString('th-TH')}</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{doc.subject}</td>
                                            <td className="px-6 py-4 font-mono text-slate-600">{doc.tracking_code}</td>
                                            <td className="px-6 py-4"><StatusBadge status={doc.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {view === 'submit' && <RegisterForm user={user!} onCancel={() => setView('dashboard')} onSuccess={() => { setView('dashboard'); loadDocuments(user!.id); }} />}
            
            {view === 'detail' && selectedDocId && <DocumentDetail user={user!} docIdProp={selectedDocId} onBack={() => setView('dashboard')} onEdit={handleInternalEdit} />}
            
            {view === 'edit' && selectedDocId && <RegisterForm user={user!} idProp={selectedDocId} onCancel={() => setView('detail')} onSuccess={() => { setView('detail'); loadDocuments(user!.id); }} />}
            
            {view === 'chat' && (
                <div className="h-[calc(100vh-8rem)]">
                    <div className="mb-4 flex items-center gap-2"><button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button><h2 className="text-xl font-bold">ติดต่อเจ้าหน้าที่</h2></div>
                    <ChatSystem user={user!} />
                </div>
            )}
        </main>

        {/* Profile Modal */}
        {showProfileModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="bg-blue-600 p-6 text-center text-white relative">
                        <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={24}/></button>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><UserCircle size={40} /></div>
                        <h3 className="text-xl font-bold">ข้อมูลส่วนตัว</h3>
                        <p className="text-white/80 text-sm">@{user?.username}</p>
                    </div>
                    <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                        {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 flex items-center gap-2"><AlertCircle size={14}/> {error}</div>}
                        {success && <div className="p-3 bg-green-50 text-green-600 text-xs font-bold rounded-lg border border-green-100 flex items-center gap-2"><CheckCircle2 size={14}/> {success}</div>}
                        
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">ชื่อ-นามสกุล</label>
                            <input type="text" className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">เปลี่ยนรหัสผ่าน (ถ้าต้องการ)</label>
                            <div className="relative">
                                <input type={showNewPass ? "text" : "password"} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 pr-12" placeholder="รหัสผ่านใหม่" value={newPass} onChange={e => setNewPass(e.target.value)} />
                                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showNewPass ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button type="button" onClick={() => setShowProfileModal(false)} className="flex-1 px-4 py-3 text-slate-500 font-bold border rounded-xl hover:bg-slate-50">ปิด</button>
                            <button type="submit" disabled={savingProfile} className="flex-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all active:scale-95">
                                {savingProfile ? <Loader2 className="animate-spin" size={20}/> : <Save size={18}/>} บันทึก
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default PublicPortal;
