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
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-purple-200/30 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4"></div>
            </div>
            
            <div className="w-full max-w-lg relative z-10 space-y-4">
                <div className="flex justify-between items-center px-2">
                    <Link to="/" className="inline-flex items-center gap-1.5 text-stone-500 hover:text-indigo-600 font-bold text-xs transition-colors">
                        <ArrowLeft size={14}/> กลับหน้าหลัก
                    </Link>
                    {view !== 'login' && (
                        <button onClick={() => setView('login')} className="text-stone-500 hover:text-indigo-600 font-bold text-xs transition-colors">
                            เข้าสู่ระบบสมาชิก
                        </button>
                    )}
                </div>
                
                <div className="glass-card p-8 md:p-10 border border-white/50 shadow-2xl relative overflow-hidden rounded-3xl">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                    {view === 'public_search' ? (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-200/30 shadow-inner relative animate-float">
                                    <Search size={28} />
                                </div>
                                <h1 className="text-xl font-extrabold text-stone-850">ติดตามสถานะหนังสือ</h1>
                                <p className="text-stone-500 text-xs font-semibold mt-1">กรอก Tracking Code หรือเลขหนังสือเพื่อดูสถานะ</p>
                            </div>
                            
                            <form onSubmit={handlePublicTrackSearch} className="relative">
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        className="modern-input pl-12 pr-28 py-4 font-mono font-bold text-sm tracking-wider uppercase" 
                                        placeholder="TRACKING CODE"
                                        value={trackCode}
                                        onChange={e => setTrackCode(e.target.value)}
                                        required
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18}/>
                                    <button 
                                        type="submit" 
                                        disabled={searching} 
                                        className="absolute right-2 top-2 bottom-2 btn btn-primary font-bold px-5 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                                    >
                                        {searching ? <Loader2 className="animate-spin" size={14} /> : 'ค้นหา'}
                                    </button>
                                </div>
                            </form>

                            {error && (
                                <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-center text-xs font-extrabold border border-rose-200 animate-pulse">
                                    {error}
                                </div>
                            )}

                            {trackResult && (
                                <div className="animate-fade-in space-y-6">
                                    <div className="bg-stone-50/50 p-6 rounded-2xl border border-stone-200/60 shadow-inner space-y-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <h3 className="font-extrabold text-sm text-stone-850 leading-relaxed">{trackResult.subject}</h3>
                                            <StatusBadge status={trackResult.status} />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-stone-200/60 pt-4">
                                            <div>
                                                <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wide">เลขรับในระบบ</p>
                                                <p className="font-bold text-stone-700 mt-0.5">{trackResult.book_no ? `${trackResult.book_no}/${trackResult.book_year}` : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wide">เลขที่หนังสือ</p>
                                                <p className="font-bold text-stone-700 mt-0.5">{trackResult.external_book_no || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wide">วันที่ลงหนังสือ</p>
                                                <p className="font-bold text-stone-700 mt-0.5">{new Date(trackResult.doc_date).toLocaleDateString('th-TH')}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wide">Tracking Code</p>
                                                <p className="font-mono font-bold text-indigo-600 mt-0.5">{trackResult.tracking_code}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wide">จาก (หน่วยงานผู้ส่ง)</p>
                                                <p className="font-bold text-stone-700 mt-0.5">{trackResult.from_origin}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wide">ถึง (เจ้าหน้าที่ผู้รับผิดชอบ)</p>
                                                <p className="font-bold text-stone-700 mt-0.5">{trackResult.recipient_name || '-'}</p>
                                            </div>
                                        </div>

                                        {/* Attachments for Public Search */}
                                        {(trackResult.attachment_url || trackResult.approved_attachment_url) && (
                                            <div className="mt-4 pt-4 border-t border-stone-200/60 space-y-2">
                                                <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wide mb-2">ไฟล์แนบ</p>
                                                {(() => {
                                                    if (!trackResult.attachment_url) return null;
                                                    let parsed: { name: string, url: string }[] = [];
                                                    try {
                                                        if (trackResult.attachment_url.startsWith('[')) {
                                                            parsed = JSON.parse(trackResult.attachment_url);
                                                        } else {
                                                            parsed = [{ name: 'เอกสารต้นฉบับ.pdf', url: trackResult.attachment_url }];
                                                        }
                                                    } catch (e) {
                                                        parsed = [{ name: 'เอกสารต้นฉบับ.pdf', url: trackResult.attachment_url }];
                                                    }

                                                    return parsed.map((file, i) => (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => openPdf(file.url)} 
                                                            className="w-full flex items-center justify-between p-3 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl transition-all group text-left shadow-sm"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0 mr-4 flex-1">
                                                                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                                                    <FileText size={16}/>
                                                                </div>
                                                                <span className="text-xs font-bold text-stone-700 truncate" title={file.name}>{file.name}</span>
                                                            </div>
                                                            <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-[10px] font-extrabold border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center gap-1 shrink-0">
                                                                <Eye size={12}/> เปิดดู
                                                            </span>
                                                        </button>
                                                    ));
                                                })()}
                                                
                                                {trackResult.approved_attachment_url && (
                                                    <button 
                                                        onClick={() => openPdf(trackResult.approved_attachment_url!)} 
                                                        className="w-full flex items-center justify-between p-3 bg-white hover:bg-stone-50 border border-emerald-200 rounded-xl transition-all group text-left shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 mr-4 flex-1">
                                                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                                                                <CheckCircle size={16}/>
                                                            </div>
                                                            <span className="text-xs font-bold text-stone-700 truncate" title="เอกสารอนุมัติ.pdf">เอกสารอนุมัติ (ลงนามแล้ว).pdf</span>
                                                        </div>
                                                        <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-extrabold border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all flex items-center gap-1 shrink-0">
                                                            <Eye size={12}/> เปิดดู
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tracking Timeline */}
                                    <div className="space-y-4">
                                        <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wide">เส้นทางการเดินหนังสือ</p>
                                        <div className="relative border-l-2 border-stone-200/60 ml-4 space-y-6 pb-2">
                                            {trackLogs.map((log, i) => (
                                                <div key={i} className="relative pl-6 animate-fade-in">
                                                    <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-md ${i === 0 ? 'bg-gradient-to-r from-indigo-500 to-purple-500 ring-4 ring-indigo-100' : 'bg-stone-300'}`}></div>
                                                    <p className="text-[9px] text-stone-400 font-extrabold mb-0.5">{new Date(log.timestamp).toLocaleString('th-TH')}</p>
                                                    <p className="font-extrabold text-stone-850 text-xs leading-relaxed">{log.action}</p>
                                                    <p className="text-[10px] text-stone-500 bg-stone-100/60 px-2.5 py-1.5 rounded-lg mt-1 inline-block border border-stone-200/40 font-semibold leading-relaxed">{log.details}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : view === 'login' ? (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 font-extrabold text-2xl shadow-lg shadow-indigo-100 rotate-3 animate-float">
                                P
                            </div>
                            <h1 className="text-xl font-extrabold text-stone-850">เข้าสู่ระบบ Public Portal</h1>
                            <p className="text-stone-500 text-xs font-semibold mt-1">ยื่นคำร้องและติดตามงานสารบรรณ คณะพยาบาลศาสตร์ CMU</p>
                        </div>
                        
                        {error && (
                            <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-center text-xs font-extrabold border border-rose-200">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-center text-xs font-extrabold border border-emerald-200">
                                {success}
                            </div>
                        )}
                        
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="modern-input-label px-1">ชื่อบัญชีผู้ใช้ (Username หรือ อีเมล)</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="modern-input" 
                                    value={loginForm.username} 
                                    onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
                                    placeholder="Username หรือ Email" 
                                />
                            </div>
                            <div className="space-y-1.5 relative">
                                <label className="modern-input-label px-1">รหัสผ่าน</label>
                                <div className="relative">
                                    <input 
                                        type={showLoginPassword ? "text" : "password"} 
                                        required 
                                        className="modern-input pr-12 font-bold" 
                                        value={loginForm.password} 
                                        onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                                        placeholder="••••••••" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowLoginPassword(!showLoginPassword)} 
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <button 
                                disabled={loading} 
                                type="submit" 
                                className="w-full btn btn-primary font-bold py-3.5 shadow-lg shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18}/> : <User size={18} />} 
                                เข้าสู่ระบบสมาชิก
                            </button>
                            
                            <div className="text-center pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setView('register')} 
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                                >
                                    สมัครสมาชิกบุคคลทั่วไป
                                </button>
                            </div>
                        </form>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="text-center mb-4">
                            <h1 className="text-xl font-extrabold text-stone-850">สมัครสมาชิกบุคคลทั่วไป</h1>
                            <p className="text-stone-500 text-xs font-semibold mt-1">สร้างบัญชีสำหรับเขียนยื่นและติดตามคำร้องของคุณ</p>
                        </div>
                        
                        {error && (
                            <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-center text-xs font-extrabold border border-rose-200">
                                {error}
                            </div>
                        )}
                        
                        <form onSubmit={handleRegister} className="space-y-4">
                             <div className="space-y-1.5">
                                 <label className="modern-input-label px-1">ชื่อ-นามสกุลจริง</label>
                                 <input 
                                     type="text" 
                                     required 
                                     className="modern-input" 
                                     value={regForm.full_name} 
                                     onChange={e => setRegForm({...regForm, full_name: e.target.value})} 
                                     placeholder="นายสมชาย มุ่งมั่น"
                                 />
                             </div>
                             <div className="space-y-1.5">
                                 <label className="modern-input-label px-1">Username (ภาษาอังกฤษและตัวเลข)</label>
                                 <input 
                                     type="text" 
                                     required 
                                     className="modern-input font-mono" 
                                     value={regForm.username} 
                                     onChange={e => setRegForm({...regForm, username: e.target.value})} 
                                     placeholder="somchai2026"
                                 />
                             </div>
                             <div className="space-y-1.5">
                                 <label className="modern-input-label px-1">อีเมลติดต่อ</label>
                                 <input 
                                     type="email" 
                                     required 
                                     className="modern-input" 
                                     value={regForm.email} 
                                     onChange={e => setRegForm({...regForm, email: e.target.value})} 
                                     placeholder="somchai@example.com"
                                 />
                             </div>
                             
                             <div className="space-y-1.5 relative">
                                <label className="modern-input-label px-1">รหัสผ่าน</label>
                                <div className="relative">
                                    <input 
                                        type={showRegPassword ? "text" : "password"} 
                                        required 
                                        className="modern-input pr-12 font-bold" 
                                        value={regForm.password} 
                                        onChange={e => setRegForm({...regForm, password: e.target.value})} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowRegPassword(!showRegPassword)} 
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                                    >
                                        {showRegPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                             </div>
                             
                             <div className="space-y-1.5 relative">
                                <label className="modern-input-label px-1">ยืนยันรหัสผ่าน</label>
                                <div className="relative">
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        required 
                                        className="modern-input pr-12 font-bold" 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                                    >
                                        {showConfirmPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                             </div>

                             <button 
                                 disabled={loading} 
                                 type="submit" 
                                 className="w-full btn btn-primary font-bold py-3.5 shadow-lg shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center justify-center gap-2 mt-4"
                             >
                                 {loading ? <Loader2 className="animate-spin" size={18}/> : 'สมัครสมาชิกบุคคลทั่วไป'}
                             </button>
                             <div className="text-center pt-2">
                                 <button 
                                     type="button" 
                                     onClick={() => setView('login')} 
                                     className="text-xs font-bold text-stone-500 hover:text-stone-850 transition-colors"
                                 >
                                     มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
                                 </button>
                             </div>
                        </form>
                      </div>
                    )}
                </div>
                
                {view !== 'public_search' && view === 'login' && (
                    <div className="text-center mt-6">
                        <button 
                            onClick={() => setView('public_search')} 
                            className="bg-white hover:bg-stone-50 text-stone-600 font-extrabold text-xs border border-stone-200 hover:border-indigo-400 hover:text-indigo-600 rounded-xl px-6 py-3 shadow-md flex items-center gap-2 mx-auto transition-all active:scale-95"
                        >
                            <Search size={15} /> ค้นหา/ติดตามสถานะ (ไม่ต้องล็อกอิน)
                        </button>
                    </div>
                )}
            </div>
        </div>
      );
  }

  // Logged In Views
  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900 flex flex-col">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-150">E</div>
                    <span className="font-extrabold text-stone-850 text-sm tracking-tight hidden sm:inline">E-Saraban Public Portal</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-stone-600 hidden sm:inline">สวัสดี, {user?.full_name}</span>
                    <button 
                        onClick={() => setShowProfileModal(true)} 
                        className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-indigo-600 transition-all"
                    >
                        <UserCircle size={22} />
                    </button>
                    <button 
                        onClick={() => { logoutUser(); setUser(null); setView('login'); }} 
                        className="p-2 hover:bg-rose-50 rounded-xl text-stone-400 hover:text-rose-600 transition-all"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 animate-fade-in">
            {view === 'dashboard' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-extrabold text-stone-850 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">รายการยื่นเรื่องของคุณ</h1>
                            <p className="text-xs text-stone-500 font-medium mt-1">จัดการ ติดตามงาน หรือยื่นคำร้องต่อคณะพยาบาลศาสตร์ CMU</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setView('chat')} 
                                className="btn text-stone-600 bg-white border border-stone-200 hover:bg-stone-50/80 rounded-xl px-4 py-2.5 flex items-center gap-2 transition-all text-xs font-bold shadow-sm"
                            >
                                <MessageSquare size={16} /> ติดต่อเจ้าหน้าที่
                            </button>
                            <button 
                                onClick={() => setView('submit')} 
                                className="btn btn-primary font-bold px-5 py-2.5 shadow-md shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 text-xs flex items-center gap-2"
                            >
                                <Send size={16} /> ยื่นเรื่องใหม่
                            </button>
                        </div>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass-card p-5 border border-white/50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-stone-300"></div>
                            <p className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">เรื่องที่ยื่นทั้งหมด</p>
                            <p className="text-2xl font-black text-stone-800 mt-1">{documents.length}</p>
                        </div>
                        <div className="glass-card p-5 border border-white/50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                            <p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">รอหน่วยงานรับเรื่อง</p>
                            <p className="text-2xl font-black text-amber-600 mt-1">
                                {documents.filter(d => d.status === DocStatus.PENDING_ACCEPT || d.status === DocStatus.PENDING_VERIFY).length}
                            </p>
                        </div>
                        <div className="glass-card p-5 border border-white/50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">กำลังดำเนินการ</p>
                            <p className="text-2xl font-black text-indigo-600 mt-1">
                                {documents.filter(d => d.status === DocStatus.REGISTERED || d.status === DocStatus.FORWARDED).length}
                            </p>
                        </div>
                        <div className="glass-card p-5 border border-white/50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                            <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">เสร็จสิ้นสมบูรณ์</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">
                                {documents.filter(d => d.status === DocStatus.APPROVED).length}
                            </p>
                        </div>
                    </div>

                    <div className="glass-card border border-white/50 shadow-md overflow-hidden rounded-2xl">
                        <div className="p-5 border-b border-stone-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-50/50">
                            <h3 className="font-extrabold text-stone-850 flex items-center gap-2 text-sm">
                                <ListFilter size={16}/> ประวัติการยื่นคำร้องทั้งหมด
                            </h3>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14}/>
                                <input 
                                    type="text" 
                                    placeholder="ค้นหา Tracking Code / ชื่อเรื่อง..." 
                                    className="modern-input pl-9 pr-4 py-2 text-xs font-semibold" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-stone-50/30 text-stone-400 font-extrabold text-[10px] uppercase tracking-wider border-b border-stone-200/60">
                                        <th className="px-6 py-3.5">วันที่ยื่นเรื่อง</th>
                                        <th className="px-6 py-3.5">ชื่อเรื่องที่ยื่นคำร้อง</th>
                                        <th className="px-6 py-3.5">Tracking Code</th>
                                        <th className="px-6 py-3.5">สถานะล่าสุด</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200/40">
                                    {paginatedDocs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-stone-400 italic font-semibold text-xs bg-white/40">
                                                ไม่พบข้อมูลประวัติการยื่นคำร้อง
                                            </td>
                                        </tr>
                                    ) : paginatedDocs.map(doc => (
                                        <tr key={doc.id} onClick={() => handleRowClick(doc.id)} className="hover:bg-indigo-50/30 cursor-pointer group transition-all">
                                            <td className="px-6 py-4 text-stone-500 font-medium text-xs">
                                                {new Date(doc.created_at).toLocaleDateString('th-TH')}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-stone-850 text-xs group-hover:text-indigo-600 transition-colors">
                                                {doc.subject}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-xs text-stone-600">
                                                {doc.tracking_code}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={doc.status} />
                                            </td>
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
                <div className="h-[calc(100vh-10rem)]">
                    <div className="mb-4 flex items-center gap-2">
                        <button 
                            onClick={() => setView('dashboard')} 
                            className="p-2 hover:bg-stone-200 rounded-xl text-stone-500 hover:text-stone-800 transition-all"
                        >
                            <ArrowLeft size={18}/>
                        </button>
                        <h2 className="text-base font-extrabold text-stone-850">ห้องสนทนาติดต่อประสานงานเจ้าหน้าที่</h2>
                    </div>
                    <ChatSystem user={user!} />
                </div>
            )}
        </main>

        {/* Profile Modal */}
        {showProfileModal && (
            <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="glass-card border border-white/60 shadow-2xl w-full max-w-md overflow-hidden rounded-3xl animate-fade-in-scale">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center text-white relative">
                        <button 
                            onClick={() => setShowProfileModal(false)} 
                            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                        >
                            <X size={20}/>
                        </button>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                            <UserCircle size={44} />
                        </div>
                        <h3 className="text-lg font-extrabold">แก้ไขข้อมูลโปรไฟล์</h3>
                        <p className="text-white/80 font-mono text-xs mt-0.5">@{user?.username}</p>
                    </div>
                    
                    <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                        {error && (
                            <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-2 animate-fade-in">
                                <AlertCircle size={14}/> {error}
                            </div>
                        )}
                        {success && (
                            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2 animate-fade-in">
                                <CheckCircle2 size={14}/> {success}
                            </div>
                        )}
                        
                        <div className="space-y-1.5">
                            <label className="modern-input-label px-1">ชื่อ-นามสกุลจริง</label>
                            <input 
                                type="text" 
                                className="modern-input" 
                                value={editName} 
                                onChange={e => setEditName(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="modern-input-label px-1">เปลี่ยนรหัสผ่านใหม่ (หากต้องการ)</label>
                            <div className="relative">
                                <input 
                                    type={showNewPass ? "text" : "password"} 
                                    className="modern-input pr-12 font-bold" 
                                    placeholder="เว้นว่างไว้เพื่อใช้รหัสผ่านเดิม" 
                                    value={newPass} 
                                    onChange={e => setNewPass(e.target.value)} 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowNewPass(!showNewPass)} 
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-indigo-650 transition-colors"
                                >
                                    {showNewPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => setShowProfileModal(false)} 
                                className="btn text-stone-500 font-bold border border-stone-200 hover:bg-stone-50 rounded-xl px-4 py-3 text-xs flex-1 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                type="submit" 
                                disabled={savingProfile} 
                                className="btn btn-primary font-bold px-6 py-3 shadow-lg shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 text-xs flex-[2] flex items-center justify-center gap-2"
                            >
                                {savingProfile ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} บันทึกการแก้ไข
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
