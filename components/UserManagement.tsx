
import React, { useState, useEffect } from 'react';
import { getUsers, getPendingUsers, approveUser, saveUser, deleteUser, getMasterItems, unlockUser } from '../services/mockService';
import { Profile, UserRole, MasterData } from '../types';
import { Edit2, Trash2, Plus, X, Shield, User, Clock, Users, Save, Loader2, Check, AlertCircle, Unlock, Lock, AlertTriangle, Layers, RefreshCw, Eye, EyeOff, Key, Copy, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [users, setUsers] = useState<Profile[]>([]);
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<MasterData[]>([]);
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showFormPassword, setShowFormPassword] = useState(false);

  // New States for Password Validation & UI
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    type: 'danger' | 'warning' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
    type: 'warning'
  });

  // Temporary Password Result Modal
  const [tempPassResult, setTempPassResult] = useState<{isOpen: boolean, username: string, pass: string} | null>(null);

  const loadAll = async () => {
      setFetching(true);
      try {
          const [u, p, d] = await Promise.all([
              getUsers(),
              getPendingUsers(),
              getMasterItems('departments')
          ]);
          setUsers(u.filter(user => user.is_approved)); 
          setPendingUsers(p);
          setDepartments(d);
      } catch (err: any) {
          console.error("Error loading data:", err);
      } finally {
          setFetching(false);
      }
  };

  useEffect(() => { loadAll(); }, []);

  const triggerConfirm = (title: string, message: string, type: 'danger' | 'warning' | 'success', action: () => Promise<void>) => {
    setConfirmModal({ isOpen: true, title, message, action, type });
  };

  const handleApprove = (id: string) => {
    triggerConfirm(
        'ยืนยันการอนุมัติ', 
        'คุณต้องการอนุมัติให้ผู้ใช้งานนี้เข้าสู่ระบบสารบรรณใช่หรือไม่?', 
        'success',
        async () => {
            setLoading(true);
            try {
                await approveUser(id);
                await loadAll();
            } catch (err: any) { alert(err.message); }
            finally { setLoading(false); }
        }
    );
  };

  const handleUnlock = (id: string, name: string) => {
    triggerConfirm(
        'ปลดแบนผู้ใช้งาน', 
        `ยืนยันปลดล็อค/ปลดแบนบัญชีของ "${name}" ใช่หรือไม่? ผู้ใช้จะสามารถกลับมาล็อกอินได้ทันที`, 
        'success',
        async () => {
            setLoading(true);
            try {
                await unlockUser(id);
                
                // Optimistic UI Update
                setUsers(prev => prev.map(u => u.id === id ? { ...u, is_locked: false, ban_reason: undefined } : u));
                
                await loadAll();
            } catch (err: any) { alert(err.message); }
            finally { setLoading(false); }
        }
    );
  };

  const handleDelete = (id: string) => {
    triggerConfirm(
        'ลบผู้ใช้งาน', 
        'คุณต้องการลบข้อมูลผู้ใช้นี้ออกจากระบบถาวรใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้', 
        'danger',
        async () => {
            setLoading(true);
            try {
                await deleteUser(id); 
                await loadAll();
            } catch (err: any) { alert(err.message); }
            finally { setLoading(false); }
        }
    );
  };

  const generateTempPassword = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"; 
      const special = "@#$!"; 
      let pass = "";
      for (let i = 0; i < 7; i++) {
          pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      pass += special.charAt(Math.floor(Math.random() * special.length));
      return pass;
  };

  const handleResetPassword = (user: Profile) => {
      triggerConfirm(
          'รีเซ็ตรหัสผ่าน & ซ่อมแซมบัญชี',
          `คุณต้องการตั้งรหัสผ่านใหม่ให้ "${user.full_name}" หรือไม่?\n\nระบบจะทำการ:\n1. ตั้งรหัสผ่านชั่วคราวใหม่\n2. ปลดแบนและปลดล็อคบัญชี\n3. แก้ไขโครงสร้างข้อมูลเก่า (Fix Legacy User)\n4. Sync อีเมลให้ตรงกัน\n\nผู้ใช้จะสามารถล็อกอินได้ทันทีด้วยรหัสใหม่`,
          'warning',
          async () => {
              setLoading(true);
              try {
                  const tempPass = generateTempPassword();
                  // FIX: Explicitly pass user.email so the backend knows what email to sync to auth.users
                  await saveUser({ id: user.id, password: tempPass.trim(), email: user.email });
                  
                  // Optimistic update for UI to show unlocked
                  const updatedUsers = users.map(u => u.id === user.id ? {...u, is_locked: false, ban_reason: undefined} : u);
                  setUsers(updatedUsers);

                  setTempPassResult({
                      isOpen: true,
                      username: user.username || user.email,
                      pass: tempPass
                  });
              } catch (err: any) {
                  alert("เกิดข้อผิดพลาด: " + err.message);
              } finally {
                  setLoading(false);
              }
          }
      );
  };

  const handleEdit = (user: Profile) => { 
    setEditingUser({ ...user }); 
    setShowFormPassword(false);
    setIsModalOpen(true); 
  };

  const handleCreate = () => { 
    setEditingUser({ 
        role: UserRole.STAFF, 
        department_id: departments.length > 0 ? departments[0].id : '', 
        full_name: '',
        username: '',
        email: '',
        password: '', 
        is_approved: true
    }); 
    setConfirmPassword('');
    setShowFormPassword(false);
    setShowConfirmPassword(false);
    setIsModalOpen(true); 
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.id) {
        const criteria = checkPasswordStrength(editingUser.password);
        if (!Object.values(criteria).every(Boolean)) {
            alert("รหัสผ่านไม่ผ่านเกณฑ์ความปลอดภัย");
            return;
        }
        if (editingUser.password !== confirmPassword) {
            alert("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
            return;
        }
    }

    setLoading(true);
    try {
        const dept = departments.find(d => d.id === editingUser?.department_id);
        await saveUser({ 
            ...editingUser, 
            department_name: dept?.name || '',
        });
        await loadAll();
        setIsModalOpen(false);
        setEditingUser(null);
    } catch (err: any) {
        alert("บันทึกไม่สำเร็จ: " + (err.message || "กรุณาตรวจสอบข้อมูลอีกครั้ง"));
    } finally {
        setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  const currentUsers = activeTab === 'active' ? users : pendingUsers;
  const passCriteria = editingUser?.password ? checkPasswordStrength(editingUser.password) : { lower: false, upper: false, special: false, number: false, length: false };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">จัดการผู้ใช้งาน</h1>
            <p className="text-slate-500 font-medium">จัดการรายชื่อ ความปลอดภัย และสิทธิ์การเข้าใช้งาน</p>
        </div>
        <div className="flex gap-2">
            <button onClick={loadAll} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-blue-600 transition-colors shadow-sm"><RefreshCw size={18}/></button>
            <button 
                onClick={() => navigate('/master-data')} 
                className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
                <Layers className="text-blue-500" size={18}/> แก้ไขแผนก
            </button>
            <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg active:scale-95">
                <Plus size={20} /> เพิ่มผู้ใช้ใหม่
            </button>
        </div>
      </div>

      <div className="flex gap-4 border-b">
          <button onClick={() => setActiveTab('active')} className={`px-4 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Users size={18}/> ผู้ใช้งาน ({users.length})
          </button>
          <button onClick={() => setActiveTab('pending')} className={`px-4 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Clock size={18}/> รออนุมัติ ({pendingUsers.length})
            {pendingUsers.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse font-bold">!</span>}
          </button>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden min-h-[400px]">
        {fetching ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <Loader2 className="animate-spin mb-4 text-blue-600" size={48} />
                <p className="font-bold">กำลังดึงข้อมูลผู้ใช้งาน...</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                        <tr>
                            <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                            <th className="px-6 py-4">Username/Email</th>
                            <th className="px-6 py-4">แผนก/ส่วนงาน</th>
                            <th className="px-6 py-4">สิทธิ์</th>
                            <th className="px-6 py-4">สถานะ</th>
                            <th className="px-6 py-4 text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentUsers.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic font-bold">ไม่พบข้อมูลผู้ใช้งานในส่วนนี้</td></tr>
                        ) : currentUsers.map(user => (
                            <tr key={user.id} className={`hover:bg-blue-50/30 transition-colors ${user.is_locked ? 'bg-red-50/20' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${user.is_locked ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {user.full_name.charAt(0)}
                                        </div>
                                        <span className="font-bold text-slate-800">{user.full_name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    <div className="font-mono text-xs">{user.username}</div>
                                    <div className="text-[10px] opacity-60 font-bold">{user.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-slate-600 bg-slate-100 px-3 py-1 rounded-lg text-xs font-medium border border-slate-200">
                                        {user.department_name || 'ไม่ระบุแผนก'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.is_locked ? (
                                        <div className="flex flex-col items-start gap-1">
                                            <div className="group relative flex items-center gap-1 text-red-600 font-bold text-xs cursor-help">
                                                <Lock size={12}/> ถูกแบน (Banned)
                                                {/* Tooltip for Ban Reason */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-slate-800 text-white text-[10px] p-3 rounded-xl shadow-xl z-10 text-center border border-slate-700">
                                                    <p className="font-bold mb-1 text-red-300">สาเหตุการระงับ:</p>
                                                    {user.ban_reason || 'ใส่รหัสผิดเกินกำหนด หรือถูกแอดมินระงับ'}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleUnlock(user.id, user.full_name)} 
                                                className="text-[10px] text-white bg-red-500 px-2.5 py-1 rounded-lg hover:bg-red-600 font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 border border-red-600"
                                            >
                                                <Unlock size={10}/> กดเพื่อปลดแบน
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><Check size={12}/> ปกติ (Active)</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-1">
                                        {activeTab === 'pending' ? (
                                            <button onClick={() => handleApprove(user.id)} className="px-4 py-1.5 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700 shadow-sm active:scale-95 transition-all">อนุมัติ</button>
                                        ) : (
                                            <>
                                                {/* Reset Password Button triggers Full Account Fix */}
                                                <button onClick={() => handleResetPassword(user)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="รีเซ็ตรหัสผ่าน/ซ่อมบัญชี">
                                                    <Key size={16} />
                                                </button>
                                                <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="แก้ไขข้อมูล"><Edit2 size={16} /></button>
                                                {user.username !== 'admin' && <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="ลบผู้ใช้"><Trash2 size={16} /></button>}
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                          confirmModal.type === 'danger' ? 'bg-red-100 text-red-600' : 
                          confirmModal.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
                          'bg-green-100 text-green-600'
                      }`}>
                          {confirmModal.type === 'danger' ? <AlertTriangle size={32}/> : confirmModal.type === 'warning' ? <Unlock size={32}/> : <Shield size={32}/>}
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
                      <p className="text-slate-500 text-sm mb-6 px-4 whitespace-pre-wrap">{confirmModal.message}</p>
                      <div className="flex gap-3">
                          <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 px-4 py-3 text-slate-500 font-bold border rounded-xl hover:bg-slate-50 transition-colors">ยกเลิก</button>
                          <button 
                            onClick={async () => {
                                await confirmModal.action();
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            }} 
                            className={`flex-1 px-4 py-3 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 ${
                                confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                                confirmModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 
                                'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                              {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'ยืนยัน'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Temporary Password Result Modal */}
      {tempPassResult && tempPassResult.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-green-600 p-6 text-center text-white">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Check size={40} />
                      </div>
                      <h3 className="text-xl font-bold">ดำเนินการสำเร็จ</h3>
                  </div>
                  <div className="p-8 text-center space-y-4">
                      <p className="text-slate-500 text-sm">ผู้ใช้งาน: <b className="text-blue-600">{tempPassResult.username}</b></p>
                      <p className="text-slate-500 text-xs">กรุณาแจ้งรหัสผ่านใหม่นี้ให้ผู้ใช้งาน (บัญชีถูกปลดแบนแล้ว)</p>
                      
                      <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-4 relative group cursor-pointer" onClick={() => copyToClipboard(tempPassResult.pass)}>
                          <p className="font-mono text-2xl font-bold text-slate-800 tracking-wider break-all">{tempPassResult.pass}</p>
                          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                              <span className="text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded shadow-sm flex items-center gap-1"><Copy size={12}/> คลิกเพื่อคัดลอก</span>
                          </div>
                      </div>

                      <p className="text-xs text-red-500 font-bold">* ผู้ใช้งานควรเปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบ</p>
                      
                      <button 
                        onClick={() => setTempPassResult(null)} 
                        className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-900 transition-all active:scale-95"
                      >
                        ปิดหน้าต่าง
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* User Edit/Create Modal (Standard form) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 text-lg">{editingUser?.id ? 'แก้ไขข้อมูลผู้ใช้' : 'ลงทะเบียนเจ้าหน้าที่ใหม่'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">บัญชีผู้ใช้งาน (Username) *</label>
                <input 
                    type="text" required 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-all font-mono text-sm" 
                    value={editingUser?.username || ''} 
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    onChange={e => {
                        const val = e.target.value;
                        if (/^[a-zA-Z0-9._-]*$/.test(val)) {
                            setEditingUser(prev => ({ ...prev, username: val }));
                        }
                    }} 
                />
              </div>

              {!editingUser?.id && (
                  <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">กำหนดรหัสผ่าน *</label>
                    <p className="text-[10px] text-slate-400 px-1 mb-1">ตัวอักษรพิมพ์เล็ก, พิมพ์ใหญ่, ตัวเลข, อักขระพิเศษ (@$!) รวม 8 ตัวขึ้นไป</p>
                    <div className="relative">
                        <input 
                            type={showFormPassword ? "text" : "password"} 
                            required 
                            className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-all font-bold" 
                            placeholder="รหัสผ่าน..."
                            value={editingUser?.password || ''} 
                            onChange={e => setEditingUser(prev => ({ ...prev, password: e.target.value }))} 
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowFormPassword(!showFormPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                            {showFormPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">ยืนยันรหัสผ่าน *</label>
                    <div className="relative">
                        <input 
                            type={showConfirmPassword ? "text" : "password"} 
                            required 
                            className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 outline-none bg-slate-50 transition-all font-bold ${confirmPassword && confirmPassword !== editingUser.password ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'}`}
                            placeholder="ยืนยันรหัสผ่านอีกครั้ง..."
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)} 
                        />
                    </div>
                  </div>
                  </>
              )}

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">ชื่อ-นามสกุล *</label>
                <input 
                    type="text" required 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-all" 
                    value={editingUser?.full_name || ''} 
                    onChange={e => setEditingUser(prev => ({ ...prev, full_name: e.target.value }))} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">อีเมลแอดเดรส *</label>
                <input type="email" required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition-all font-medium" value={editingUser?.email || ''} onChange={e => setEditingUser(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">แผนก / สังกัด</label>
                  <select 
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
                    value={editingUser?.department_id || ''} 
                    onChange={e => setEditingUser(prev => ({ ...prev, department_id: e.target.value }))}
                  >
                    <option value="">-- เลือกแผนก --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">ระดับสิทธิ์</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={editingUser?.role || UserRole.STAFF} onChange={e => setEditingUser(prev => ({ ...prev, role: e.target.value as UserRole }))}>
                    <option value={UserRole.ADMIN}>ADMIN (สูงสุด)</option>
                    <option value={UserRole.STAFF}>STAFF (เจ้าหน้าที่)</option>
                    <option value={UserRole.USER}>USER (บุคคลทั่วไป)</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">ยกเลิก</button>
                <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-bold flex items-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95">
                  {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />} บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
