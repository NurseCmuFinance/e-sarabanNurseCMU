
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
    <div className="space-y-6 animate-fade-in-up">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            จัดการผู้ใช้งาน
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            จัดการรายชื่อ ความปลอดภัย และสิทธิ์การเข้าใช้งานระบบสารบรรณ
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={loadAll} 
            className="btn btn-secondary btn-icon shadow-sm hover:translate-y-[-1px] transition-all animate-fade-in" 
            title="รีเฟรชข้อมูล"
            disabled={fetching}
          >
            <RefreshCw size={18} className={`text-indigo-600 ${fetching ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => navigate('/master-data')} 
            className="btn btn-secondary shadow-sm hover:translate-y-[-1px] transition-all"
          >
            <Layers className="text-indigo-500" size={18} /> จัดการแผนก
          </button>
          <button 
            onClick={handleCreate} 
            className="btn btn-primary shadow-lg shadow-indigo-500/20 hover:translate-y-[-1px] transition-all"
          >
            <Plus size={20} className="stroke-[3]" /> เพิ่มผู้ใช้ใหม่
          </button>
        </div>
      </div>

      {/* Segmented Control Tab */}
      <div className="flex p-1 bg-slate-100/85 backdrop-blur-sm rounded-xl border border-slate-200/50 max-w-md shadow-inner">
        <button 
          type="button"
          onClick={() => setActiveTab('active')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'active' 
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Users size={18} /> ผู้ใช้งานทั่วไป ({users.length})
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('pending')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all relative ${
            activeTab === 'pending' 
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Clock size={18} /> รออนุมัติ ({pendingUsers.length})
          {pendingUsers.length > 0 && (
            <span className="absolute -top-1.5 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-white text-[9px] font-extrabold items-center justify-center animate-pulse">
                {pendingUsers.length}
              </span>
            </span>
          )}
        </button>
      </div>

      {/* Main Container */}
      <div className="glass-card overflow-hidden min-h-[400px]">
        {fetching ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-400">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-spin border-t-indigo-600"></div>
              <Users size={24} className="absolute inset-0 m-auto text-indigo-600 animate-pulse" />
            </div>
            <p className="font-bold text-slate-700">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
            <p className="text-xs text-slate-400 mt-1">กรุณารอสักครู่ ระบบกำลังสื่อสารกับฐานข้อมูล</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="modern-table">
              <thead>
                <tr>
                  <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4">Username/Email</th>
                  <th className="px-6 py-4">แผนก/ส่วนงาน</th>
                  <th className="px-6 py-4">สิทธิ์เข้าใช้งาน</th>
                  <th className="px-6 py-4">สถานะบัญชี</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40">
                {currentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center text-slate-400 italic font-medium bg-slate-50/30">
                      <div className="flex flex-col items-center justify-center">
                        <Users size={48} className="text-slate-300 mb-3 stroke-[1.5]" />
                        <p className="font-bold text-slate-600">ไม่พบข้อมูลผู้ใช้งานในส่วนนี้</p>
                        <p className="text-xs text-slate-400 mt-1">คุณสามารถเพิ่มผู้ใช้ใหม่ได้ผ่านปุ่มด้านบน</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentUsers.map(user => (
                    <tr 
                      key={user.id} 
                      className={`transition-colors duration-150 ${
                        user.is_locked 
                          ? 'bg-rose-500/[0.02] hover:bg-rose-500/[0.04]' 
                          : 'hover:bg-indigo-500/[0.02]'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white shadow-sm shrink-0 ${
                            user.is_locked 
                              ? 'bg-gradient-to-br from-rose-400 to-red-500 shadow-rose-100' 
                              : 'bg-gradient-to-br from-indigo-400 to-purple-500 shadow-indigo-100'
                          }`}>
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block text-[14px]">{user.full_name}</span>
                            {user.is_locked && (
                              <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5 mt-0.5">
                                <Lock size={10} /> บัญชีถูกระงับชั่วคราว
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <div className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50 inline-block">
                          {user.username}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-1.5">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100/90 text-slate-600 border border-slate-200/60 shadow-sm">
                          {user.department_name || 'ไม่ระบุแผนก'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shadow-sm ${
                          user.role === UserRole.ADMIN 
                            ? 'bg-purple-50 text-purple-700 border-purple-200/80' 
                            : user.role === UserRole.STAFF
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                            : 'bg-slate-100 text-slate-700 border-slate-200/80'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_locked ? (
                          <div className="flex flex-col items-start gap-1.5">
                            <div className="group relative flex items-center gap-1 text-rose-600 font-extrabold text-xs cursor-help">
                              <Lock size={12} className="stroke-[2.5]" /> ถูกแบน (Banned)
                              {/* Tooltip for Ban Reason */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:block w-52 bg-slate-900 text-white text-[11px] p-3 rounded-xl shadow-xl z-20 text-center border border-slate-800 backdrop-blur-md">
                                <p className="font-extrabold mb-1 text-rose-300">สาเหตุการระงับบัญชี:</p>
                                <span className="font-medium">{user.ban_reason || 'ใส่รหัสผิดเกินกำหนด หรือถูกแอดมินระงับ'}</span>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleUnlock(user.id, user.full_name)} 
                              className="text-[10px] text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 px-3 py-1 rounded-lg hover:shadow-sm font-extrabold flex items-center gap-1 shadow-sm transition-all active:scale-95 border border-red-600/40"
                            >
                              <Unlock size={10} className="stroke-[2.5]" /> ปลดแบนผู้ใช้
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200/40 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
                            <Check size={12} className="stroke-[3]" /> ปกติ (Active)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          {activeTab === 'pending' ? (
                            <button 
                              onClick={() => handleApprove(user.id)} 
                              className="btn btn-sm btn-success shadow-sm hover:translate-y-[-1px] transition-all"
                            >
                              อนุมัติสิทธิ์
                            </button>
                          ) : (
                            <>
                              {/* Reset Password Button triggers Full Account Fix */}
                              <button 
                                onClick={() => handleResetPassword(user)} 
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" 
                                title="รีเซ็ตรหัสผ่าน/ซ่อมบัญชี"
                              >
                                <Key size={16} />
                              </button>
                              <button 
                                onClick={() => handleEdit(user)} 
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" 
                                title="แก้ไขข้อมูล"
                              >
                                <Edit2 size={16} />
                              </button>
                              {user.username !== 'admin' && (
                                <button 
                                  onClick={() => handleDelete(user.id)} 
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" 
                                  title="ลบผู้ใช้"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all duration-300 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-lg border border-white/50 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-scale">
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm ${
                confirmModal.type === 'danger' 
                  ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                  : confirmModal.type === 'warning' 
                  ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              }`}>
                {confirmModal.type === 'danger' 
                  ? <AlertTriangle size={32} className="animate-pulse" /> 
                  : confirmModal.type === 'warning' 
                  ? <Unlock size={32} /> 
                  : <Shield size={32} />
                }
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 text-sm mb-6 px-3 whitespace-pre-wrap leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                  className="btn btn-secondary flex-1 font-bold rounded-xl"
                  disabled={loading}
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={async () => {
                    await confirmModal.action();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }} 
                  className={`btn flex-1 font-bold rounded-xl ${
                    confirmModal.type === 'danger' 
                      ? 'btn-danger shadow-lg shadow-rose-200/50' 
                      : confirmModal.type === 'warning' 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-200/50' 
                      : 'btn-success shadow-lg shadow-emerald-200/50'
                  }`}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'ยืนยัน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Password Result Modal */}
      {tempPassResult && tempPassResult.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex items-center justify-center p-4 transition-all duration-300 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-lg border border-white/50 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-scale">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Check size={36} className="stroke-[3] animate-bounce" />
              </div>
              <h3 className="text-xl font-extrabold">ดำเนินการสำเร็จ</h3>
              <p className="text-white/80 text-xs mt-1">ตั้งค่ารหัสใหม่และซ่อมแซมบัญชีแล้ว</p>
            </div>
            <div className="p-8 text-center space-y-5">
              <div className="text-sm text-slate-600 font-medium">
                ผู้ใช้งาน: <b className="text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">{tempPassResult.username}</b>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                กรุณาแจ้งรหัสผ่านชั่วคราวนี้นี้ให้แก่ผู้ใช้งานเพื่อนำไปล็อกอินและระบบได้ปลดแบนให้แล้ว
              </p>
              
              <div 
                className="bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-2xl p-4 relative group cursor-pointer hover:bg-indigo-50 transition-colors shadow-inner" 
                onClick={() => copyToClipboard(tempPassResult.pass)}
                title="คลิกเพื่อคัดลอกรหัสผ่าน"
              >
                <p className="font-mono text-2xl font-bold text-slate-800 tracking-wider break-all">{tempPassResult.pass}</p>
                <div className="absolute inset-0 bg-indigo-950/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                  <span className="text-[10px] font-extrabold text-indigo-700 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                    <Copy size={11} className="stroke-[2.5]" /> คลิกเพื่อคัดลอกรหัสผ่าน
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-rose-500 font-bold flex items-center justify-center gap-1 bg-rose-50 py-1.5 px-3 rounded-lg border border-rose-100">
                <Info size={11} className="stroke-[2.5]" /> * แนะนำให้ผู้ใช้งานแก้ไขรหัสผ่านทันทีหลังเข้าสู่ระบบ
              </p>
              
              <button 
                onClick={() => setTempPassResult(null)} 
                className="btn btn-primary w-full py-3 rounded-xl font-bold shadow-lg shadow-indigo-200/50 hover:translate-y-[-1px] transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-md z-[150] flex items-center justify-center p-4 transition-all duration-300 animate-fade-in">
          <div className="glass-modal max-w-md w-full overflow-hidden animate-fade-in-scale flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-slate-50/60 backdrop-blur-sm shrink-0">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingUser?.id ? 'แก้ไขข้อมูลผู้ใช้' : 'ลงทะเบียนเจ้าหน้าที่ใหม่'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} className="stroke-[2.5]" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {/* Username field */}
              <div className="space-y-1">
                <label className="modern-input-label">บัญชีผู้ใช้งาน (Username) *</label>
                <input 
                  type="text" 
                  required 
                  className="modern-input font-mono text-sm font-semibold" 
                  value={editingUser?.username || ''} 
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  onChange={e => {
                    const val = e.target.value;
                    if (/^[a-zA-Z0-9._-]*$/.test(val)) {
                      setEditingUser(prev => ({ ...prev, username: val }));
                    }
                  }} 
                  disabled={!!editingUser?.id}
                />
              </div>

              {/* Password generation fields only for new users */}
              {!editingUser?.id && (
                <>
                  <div className="space-y-1">
                    <label className="modern-input-label">กำหนดรหัสผ่าน *</label>
                    <div className="relative">
                      <input 
                        type={showFormPassword ? "text" : "password"} 
                        required 
                        className="modern-input pr-12 font-bold font-mono" 
                        placeholder="รหัสผ่านผู้ใช้..."
                        value={editingUser?.password || ''} 
                        onChange={e => setEditingUser(prev => ({ ...prev, password: e.target.value }))} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {showFormPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Password Strength Checklist */}
                    {editingUser?.password && (
                      <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/50 space-y-1.5">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide mb-1">ความแข็งแกร่งของรหัสผ่าน</p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                          <div className={`flex items-center gap-1 font-bold ${passCriteria.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <Check size={11} className="stroke-[3]" /> 8 ตัวอักษรขึ้นไป
                          </div>
                          <div className={`flex items-center gap-1 font-bold ${passCriteria.upper ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <Check size={11} className="stroke-[3]" /> อักษรพิมพ์ใหญ่ (A-Z)
                          </div>
                          <div className={`flex items-center gap-1 font-bold ${passCriteria.lower ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <Check size={11} className="stroke-[3]" /> อักษรพิมพ์เล็ก (a-z)
                          </div>
                          <div className={`flex items-center gap-1 font-bold ${passCriteria.number ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <Check size={11} className="stroke-[3]" /> ตัวเลข (0-9)
                          </div>
                          <div className={`col-span-2 flex items-center gap-1 font-bold ${passCriteria.special ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <Check size={11} className="stroke-[3]" /> อักขระพิเศษ (!@#$%^&*...)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="modern-input-label">ยืนยันรหัสผ่าน *</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        required 
                        className={`modern-input pr-12 font-bold font-mono ${
                          confirmPassword && confirmPassword !== editingUser.password 
                            ? 'border-rose-300 focus:border-rose-500 focus:shadow-rose-100' 
                            : confirmPassword && confirmPassword === editingUser.password
                            ? 'border-emerald-300 focus:border-emerald-500 focus:shadow-emerald-100'
                            : ''
                        }`}
                        placeholder="ยืนยันรหัสผ่านอีกครั้ง..."
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {confirmPassword && (
                      <div className="mt-1 text-[10px] font-bold">
                        {confirmPassword === editingUser.password ? (
                          <span className="text-emerald-600 flex items-center gap-1"><Check size={11} className="stroke-[3]" /> รหัสผ่านตรงกัน</span>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-1"><X size={11} className="stroke-[3]" /> รหัสผ่านไม่ตรงกัน</span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Full Name field */}
              <div className="space-y-1">
                <label className="modern-input-label">ชื่อ-นามสกุล *</label>
                <input 
                  type="text" 
                  required 
                  className="modern-input font-semibold" 
                  value={editingUser?.full_name || ''} 
                  onChange={e => setEditingUser(prev => ({ ...prev, full_name: e.target.value }))} 
                />
              </div>

              {/* Email Address field */}
              <div className="space-y-1">
                <label className="modern-input-label">อีเมลแอดเดรส *</label>
                <input 
                  type="email" 
                  required 
                  className="modern-input font-medium" 
                  value={editingUser?.email || ''} 
                  onChange={e => setEditingUser(prev => ({ ...prev, email: e.target.value }))} 
                />
              </div>
              
              {/* Department & Role dropdowns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="modern-input-label">แผนก / สังกัด</label>
                  <select 
                    className="modern-select font-semibold text-sm" 
                    value={editingUser?.department_id || ''} 
                    onChange={e => setEditingUser(prev => ({ ...prev, department_id: e.target.value }))}
                  >
                    <option value="">-- เลือกแผนก --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="modern-input-label">ระดับสิทธิ์</label>
                  <select 
                    className="modern-select font-bold text-sm" 
                    value={editingUser?.role || UserRole.STAFF} 
                    onChange={e => setEditingUser(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  >
                    <option value={UserRole.ADMIN}>ADMIN (สูงสุด)</option>
                    <option value={UserRole.STAFF}>STAFF (เจ้าหน้าที่)</option>
                    <option value={UserRole.USER}>USER (บุคคลทั่วไป)</option>
                  </select>
                </div>
              </div>

              {/* Footer action buttons inside Modal */}
              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-200/60 mt-4 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn btn-ghost font-bold"
                  disabled={loading}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn btn-success font-bold shadow-lg shadow-emerald-200/50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} บันทึกข้อมูล
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
