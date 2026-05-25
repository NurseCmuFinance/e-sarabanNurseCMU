import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Upload, Loader2, AlertTriangle, CheckCircle2, Copy, X, FileCheck, Info, CheckCircle, Zap, Calendar, FileText } from 'lucide-react';
import { createDocument, getDocumentById, updateDocument, getUsersForSelect, getMasterItems, addLog, getUploadUrl } from '../services/mockService';
import { DocStatus, Profile, DocPriority, Document, UserRole } from '../types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../constants';
import { useParams, useNavigate } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';

interface RegisterFormProps {
  user: Profile;
  onCancel?: () => void;
  onSuccess?: () => void;
  idProp?: string; 
}

const RegisterForm: React.FC<RegisterFormProps> = ({ user: currentUser, onCancel, onSuccess, idProp }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = idProp || paramId;
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const isInternal = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.STAFF;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [originalStatus, setOriginalStatus] = useState<DocStatus | null>(null);
  
  const [successDoc, setSuccessDoc] = useState<Document | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error', message: string } | null>(null);
  const [countdown, setCountdown] = useState(10); // State for countdown

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<{ name: string, url: string }[]>([]);

  const [formData, setFormData] = useState({
    external_book_no: '',
    subject: '',
    doc_date: new Date().toISOString().split('T')[0],
    registration_date: new Date().toISOString().split('T')[0], // New Field
    from_origin: '',
    to_recipient_id: '',
    recipient_name: '',
    remark: '',
    priority: DocPriority.NORMAL,
    status: DocStatus.PENDING_ACCEPT,
    approved_attachment_url: '',
    creator_id: id ? '' : currentUser.id // Will be overwritten if edit mode
  });

  useEffect(() => {
    Promise.all([getUsersForSelect(), getMasterItems('agencies')]).then(([users, ageData]) => {
        setStaffUsers(users);
        setAgencies(ageData);
    });

    if (isEditMode && id) {
        getDocumentById(id).then(doc => {
            if (doc) {
                setOriginalStatus(doc.status);

                let parsedAttachments: { name: string, url: string }[] = [];
                if (doc.attachment_url) {
                    try {
                        if (doc.attachment_url.startsWith('[')) {
                            parsedAttachments = JSON.parse(doc.attachment_url);
                        } else {
                            parsedAttachments = [{ name: 'เอกสารแนบต้นฉบับ.pdf', url: doc.attachment_url }];
                        }
                    } catch (e) {
                        parsedAttachments = [{ name: 'เอกสารแนบต้นฉบับ.pdf', url: doc.attachment_url }];
                    }
                }
                setExistingAttachments(parsedAttachments);

                setFormData({
                    external_book_no: doc.external_book_no || '',
                    subject: doc.subject,
                    doc_date: doc.doc_date,
                    registration_date: doc.registration_date || doc.created_at.split('T')[0], // Load existing or fallback
                    from_origin: doc.from_origin,
                    to_recipient_id: doc.to_recipient_id,
                    recipient_name: doc.recipient_name || '',
                    remark: doc.remark || '',
                    priority: doc.priority || DocPriority.NORMAL,
                    status: doc.status,
                    approved_attachment_url: doc.approved_attachment_url || '',
                    creator_id: doc.creator_id || currentUser.id
                });
            }
            setFetching(false);
        }).catch((err) => {
            console.error("Fetch Doc Error:", err);
            setToast({ type: 'error', message: "ไม่พบข้อมูลหนังสือที่ระบุ" });
        });
    } else {
        // Ensure creator_id is set for new documents
        setFormData(prev => ({ ...prev, creator_id: currentUser.id }));
    }
  }, [id]);

  // Effect for Auto-Countdown when successDoc is present
  useEffect(() => {
    let timer: any;
    if (successDoc) {
      setCountdown(10); // Reset timer
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleCloseSuccess(); // Auto confirm
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [successDoc]);

  const handleCloseSuccess = () => {
    if (typeof onSuccess === 'function') onSuccess();
    else navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    // 1. Manual Validation for Required Fields
    if (
        !formData.doc_date || 
        !formData.registration_date ||
        !formData.subject.trim() || 
        !formData.from_origin.trim() || 
        !formData.to_recipient_id
    ) {
        setToast({ type: 'error', message: "กรุณากรอกข้อมูลในช่องที่มีเครื่องหมาย * ให้ครบถ้วน" });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    setLoading(true);
    try {
      // Upload new files to Google Drive (or base64 fallback)
      const uploadedUrls: { name: string, url: string }[] = [];
      for (const file of newFiles) {
          const url = await getUploadUrl(file);
          uploadedUrls.push({ name: file.name, url: url });
      }

      // Combine existing remaining attachments and new ones
      const finalAttachments = [...existingAttachments, ...uploadedUrls];
      const attachment_url = finalAttachments.length > 0 ? JSON.stringify(finalAttachments) : '';

      const submitPayload = {
          ...formData,
          attachment_url
      };

      if (isEditMode && id) {
        await updateDocument(id, submitPayload);
        
        if (originalStatus !== formData.status) {
            await addLog(id, `เปลี่ยนสถานะเป็น ${STATUS_CONFIG[formData.status].label}`, currentUser, `ผู้ใช้งานปรับปรุงสถานะผ่านหน้าแก้ไขรายการ`);
        } else {
            await addLog(id, 'แก้ไขข้อมูลหนังสือ', currentUser, 'ผู้ใช้งานได้ทำการแก้ไขรายละเอียดหนังสือ');
        }

        setToast({ type: 'success', message: "อัปเดตข้อมูลหนังสือเรียบร้อยแล้ว" });
        setTimeout(() => {
            handleCloseSuccess();
        }, 1500);
      } else {
        const saved = await createDocument(submitPayload, currentUser);
        setSuccessDoc(saved);
        setToast({ type: 'success', message: "ลงทะเบียนหนังสือใหม่สำเร็จ" });
      }
    } catch (error: any) { 
        setToast({ type: 'error', message: 'เกิดข้อผิดพลาด: ' + error.message }); 
    } finally { setLoading(false); }
  };

  const handleCancel = () => {
    setToast({ type: 'info', message: "ยกเลิกการเปลี่ยนแปลงแล้ว" });
    setTimeout(() => {
        if (typeof onCancel === 'function') onCancel();
        else navigate(-1);
    }, 500);
  };

  if (fetching) return <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-bold"><Loader2 className="animate-spin mb-4 text-indigo-600" size={32} />กำลังดึงข้อมูล...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-10 relative animate-fade-in-up">
      {toast && (
          <div className={`fixed top-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>
              {toast.type === 'success' ? <CheckCircle2 size={24}/> : toast.type === 'error' ? <AlertTriangle size={24}/> : <Info size={24}/>}
              <span className="font-bold">{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity"><X size={20}/></button>
          </div>
      )}

      <div className="mb-6 flex items-center gap-4">
        <button 
          type="button" 
          onClick={handleCancel} 
          className="btn btn-icon btn-secondary hover:bg-slate-200/80 rounded-full"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          {isEditMode ? 'แก้ไขรายละเอียดหนังสือ' : 'ยื่นเรื่อง/ลงทะเบียนรับหนังสือ'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-card overflow-hidden text-left animate-fade-in-up">
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="modern-input-label">เลขที่หนังสือ (ต้นทาง/ถ้ามี)</label>
              <input 
                type="text" 
                className="modern-input" 
                value={formData.external_book_no} 
                onChange={e => setFormData({...formData, external_book_no: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
                <label className="modern-input-label flex items-center gap-1">
                    ลงวันที่ <span className="text-rose-500">*</span>
                    <div className="group relative">
                        <Info size={14} className="text-slate-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-850 text-white text-xs py-1.5 px-3 rounded-lg shadow-lg whitespace-nowrap z-50">
                            กรุณากรอกวันที่ของหนังสือ
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-850"></div>
                        </div>
                    </div>
                </label>
                <input 
                  type="date" 
                  required 
                  className="modern-input" 
                  value={formData.doc_date} 
                  onChange={e => setFormData({...formData, doc_date: e.target.value})} 
                />
            </div>
            
            {/* Registration Date: Show only in Edit Mode */}
            {isEditMode && (
                <div className="space-y-2">
                    <label className="modern-input-label !text-indigo-600 flex items-center gap-1">
                      <Calendar size={14}/> วันที่ลงทะเบียนรับเข้า <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="date" 
                      required 
                      className="modern-input !border-indigo-200 !bg-indigo-50/30 !text-indigo-800 font-semibold" 
                      value={formData.registration_date} 
                      onChange={e => setFormData({...formData, registration_date: e.target.value})} 
                    />
                </div>
            )}

            {/* Priority Field */}
            <div className="space-y-2">
                <label className="modern-input-label flex items-center gap-1">
                  <Zap size={14} className="text-amber-500"/> ความเร่งด่วน
                </label>
                <select 
                  className="modern-select font-semibold text-slate-700" 
                  value={formData.priority} 
                  onChange={e => setFormData({...formData, priority: e.target.value as DocPriority})}
                >
                    {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                        <option key={val} value={val}>{cfg.label}</option>
                    ))}
                </select>
            </div>

            {/* Admin/Staff Section: Status */}
            {isInternal && isEditMode && (
              <div className="space-y-2">
                  <label className="modern-input-label !text-indigo-600 flex items-center gap-1">
                    <CheckCircle size={14}/> สถานะหนังสือ
                  </label>
                  <select 
                    className="modern-select font-bold !text-indigo-850 !border-indigo-200 !bg-indigo-50/30" 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as DocStatus})}
                  >
                      {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                          <option key={val} value={val}>{cfg.label}</option>
                      ))}
                  </select>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <label className="modern-input-label">เรื่อง <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                required 
                className="modern-input" 
                value={formData.subject} 
                onChange={e => setFormData({...formData, subject: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="modern-input-label">จากหน่วยงาน/ผู้ยื่น <span className="text-rose-500">*</span></label>
              <SearchableSelect 
                options={agencies.map(a => ({ id: a.name, label: a.name }))} 
                allowCustomInput 
                value={formData.from_origin} 
                placeholder="ระบุผู้ส่ง..." 
                onChange={(val) => setFormData(prev => ({ ...prev, from_origin: val }))} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="modern-input-label">เรียน/เสนอ (เจ้าหน้าที่ผู้รับ) <span className="text-rose-500">*</span></label>
              <SearchableSelect 
                options={staffUsers.map(u => ({ id: u.id, label: u.full_name, subLabel: u.department_name }))} 
                value={formData.to_recipient_id} 
                placeholder="เลือกเจ้าหน้าที่..." 
                onChange={(id, label) => setFormData(prev => ({ ...prev, to_recipient_id: id, recipient_name: label || '' }))} 
                required 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="modern-input-label">รายละเอียดเพิ่มเติม</label>
            <textarea 
              rows={3} 
              className="modern-textarea" 
              value={formData.remark} 
              onChange={e => setFormData({...formData, remark: e.target.value})} 
            />
          </div>
          
          <div className="space-y-4">
              <label className="modern-input-label">เอกสารแนบต้นฉบับ (แนบได้หลายไฟล์ - PDF เท่านั้น)</label>
              
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center hover:bg-indigo-50/5 hover:shadow-inner transition-all cursor-pointer relative bg-slate-50/30">
                  <input 
                      type="file" 
                      id="file-upload" 
                      className="hidden" 
                      accept=".pdf" 
                      multiple 
                      onChange={e => {
                          if (e.target.files) {
                              const filesArray = Array.from(e.target.files);
                              setNewFiles(prev => [...prev, ...filesArray]);
                          }
                      }} 
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload size={24} className="text-slate-400 group-hover:text-indigo-500 transition-colors"/>
                      <span className="text-slate-600 font-bold text-xs">คลิกเพื่อเลือกไฟล์ PDF เพิ่มเติม (แนบได้หลายไฟล์)</span>
                  </label>
              </div>

              {/* Show Existing Attachments (Edit mode) */}
              {existingAttachments.length > 0 && (
                  <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">ไฟล์แนบเดิมในระบบ</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {existingAttachments.map((att, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-indigo-50/40 border border-indigo-100/50 rounded-xl">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg shrink-0"><FileText size={16}/></div>
                                      <span className="text-xs font-bold text-slate-700 truncate">{att.name}</span>
                                  </div>
                                  <button 
                                      type="button" 
                                      onClick={() => setExistingAttachments(prev => prev.filter((_, i) => i !== index))}
                                      className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors shrink-0"
                                      title="ลบไฟล์แนบนี้"
                                  >
                                      <X size={16}/>
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Show New Selected Files */}
              {newFiles.length > 0 && (
                  <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">ไฟล์แนบชุดใหม่ (รออัปโหลด)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {newFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-amber-50/40 border border-amber-100/50 rounded-xl">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg shrink-0"><FileText size={16}/></div>
                                      <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                                  </div>
                                  <button 
                                      type="button" 
                                      onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== index))}
                                      className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors shrink-0"
                                      title="ยกเลิกไฟล์นี้"
                                  >
                                      <X size={16}/>
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
        </div>
        <div className="bg-slate-50/30 px-6 py-5 flex items-center justify-end gap-3 border-t border-slate-200/50">
          <button 
            type="button" 
            onClick={handleCancel} 
            className="btn btn-secondary"
          >
            ยกเลิก
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary shadow-lg shadow-indigo-500/10 active:scale-97"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} บันทึกข้อมูล
          </button>
        </div>
      </form>

      {successDoc && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="glass-modal max-w-md w-full overflow-hidden shadow-2xl animate-fade-in-scale">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-650 p-10 text-center text-white relative">
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileCheck size={40} className="animate-bounce text-white" />
                      </div>
                      <h2 className="text-2xl font-black tracking-tight">ลงทะเบียนเรียบร้อย!</h2>
                  </div>
                  <div className="p-10 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 text-center shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">เลขรับ</p>
                            <p className="text-xl font-black text-indigo-650">{successDoc.book_no}/{successDoc.book_year}</p>
                          </div>
                          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 text-center shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">TRACKING CODE</p>
                            <div className="flex items-center justify-center gap-2">
                              <p className="text-lg font-mono font-bold text-slate-800">{successDoc.tracking_code}</p>
                            </div>
                          </div>
                      </div>
                      
                      <button 
                        onClick={handleCloseSuccess} 
                        className="w-full btn btn-primary !py-4 rounded-2xl shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-2"
                      >
                        ตกลง ({countdown})
                      </button>
                      <p className="text-xs text-slate-400 font-semibold text-center animate-pulse">
                        ระบบจะดำเนินการต่ออัตโนมัติใน {countdown} วินาที
                      </p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default RegisterForm;
