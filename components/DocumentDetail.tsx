import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocumentById, getLogs, updateDocumentStatus, uploadApprovedFile, getUsersForSelect, forwardDocument } from '../services/mockService';
import { Document, DocumentLog, DocStatus, Profile, UserRole, DocPriority } from '../types';
import { ArrowLeft, Clock, User, FileText, CheckCircle, XCircle, RotateCcw, Send, Upload, Eye, Loader2, AlertCircle, ExternalLink, FileIcon, UserPlus, X, Edit, Zap, RefreshCw, MessageSquare, FileCheck, ChevronRight, ShieldCheck, QrCode } from 'lucide-react';
import StatusBadge from './StatusBadge';
import SearchableSelect from './SearchableSelect';
import { PRIORITY_CONFIG } from '../constants';

interface DocumentDetailProps {
    user: Profile;
    docIdProp?: string;
    onBack?: () => void;
    onEdit?: (id: string) => void;
}

const DocumentDetail: React.FC<DocumentDetailProps> = ({ user, docIdProp, onBack, onEdit }) => {
    const { id: paramId } = useParams<{ id: string }>();
    const docId = docIdProp || paramId;
    const navigate = useNavigate();
    
    const [doc, setDoc] = useState<Document | null>(null);
    const [logs, setLogs] = useState<DocumentLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [modalAction, setModalAction] = useState<'receive' | 'return' | 'cancel' | 'approve' | 'verify' | null>(null);
    const [modalReason, setModalReason] = useState('');
    const [approvedFile, setApprovedFile] = useState<File | null>(null);
    
    // Forward State
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [forwardToId, setForwardToId] = useState('');
    const [staffList, setStaffList] = useState<any[]>([]);

    // QR State
    const [showQR, setShowQR] = useState(false);
    
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const loadData = async () => {
        if (!docId) return;
        setLoading(true);
        try {
            const [d, l, s] = await Promise.all([
                getDocumentById(docId), 
                getLogs(docId),
                getUsersForSelect()
            ]);
            setDoc(d);
            setLogs(l);
            setStaffList(s);
        } catch (err: any) { 
            setStatusMessage({ type: 'error', text: "โหลดข้อมูลไม่สำเร็จ: " + err.message });
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [docId]);

    const handleBack = () => {
        if (onBack) onBack();
        else navigate(-1);
    };

    const handleEditClick = () => {
        if (!doc) return;
        if (onEdit) onEdit(doc.id);
        else navigate(`/document/edit/${doc.id}`);
    };

    const handleActionExecute = async () => {
        if (!doc || !modalAction) return;
        setActionLoading(true);
        try {
            if (modalAction === 'approve') {
                if (!approvedFile) throw new Error("กรุณาเลือกไฟล์เอกสารที่อนุมัติแล้ว");
                await uploadApprovedFile(doc.id, approvedFile, user);
                setStatusMessage({ type: 'success', text: "อนุมัติหนังสือเรียบร้อยแล้ว" });
            } else if (modalAction === 'verify') {
                await updateDocumentStatus(doc.id, DocStatus.PENDING_ACCEPT, user, "ตรวจสอบความถูกต้องและอนุมัติส่งต่อโดยแอดมิน");
                setStatusMessage({ type: 'success', text: "ตรวจสอบและส่งต่อให้เจ้าหน้าที่เรียบร้อยแล้ว" });
            } else {
                let status = DocStatus.REGISTERED;
                let successLabel = "";
                if (modalAction === 'receive') { status = DocStatus.REGISTERED; successLabel = "รับหนังสือเรียบร้อยแล้ว"; }
                else if (modalAction === 'return') { status = DocStatus.RETURNED; successLabel = "ตีกลับหนังสือเรียบร้อยแล้ว"; }
                else if (modalAction === 'cancel') { status = DocStatus.CANCELLED; successLabel = "ยกเลิกหนังสือเรียบร้อยแล้ว"; }

                await updateDocumentStatus(doc.id, status, user, modalReason);
                setStatusMessage({ type: 'success', text: successLabel });
            }
            setModalAction(null);
            setModalReason('');
            setApprovedFile(null);
            await loadData();
        } catch (err: any) { setStatusMessage({ type: 'error', text: err.message }); }
        finally { setActionLoading(false); }
    };

    const handleForwardExecute = async () => {
        if (!doc || !forwardToId) return;
        setActionLoading(true);
        try {
            const recipient = staffList.find(u => u.id === forwardToId);
            const recipientName = recipient ? recipient.full_name : 'ไม่ระบุ';
            
            await forwardDocument(doc.id, forwardToId, recipientName, user, modalReason);
            
            setStatusMessage({ type: 'success', text: `ส่งต่อให้ ${recipientName} เรียบร้อยแล้ว` });
            setShowForwardModal(false);
            setForwardToId('');
            setModalReason('');
            await loadData();
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err.message });
        } finally {
            setActionLoading(false);
        }
    };

    const openPdf = (base64: string) => {
        try {
            // Check if it's already a URL
            if (base64.startsWith('http')) {
                window.open(base64, '_blank');
                return;
            }

            // Convert Base64 Data URI to Blob for safer/better viewing
            const arr = base64.split(',');
            if (arr.length < 2) {
                console.warn("Invalid data URI format, trying raw base64");
            }
            
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
            if (!win) {
                alert("โปรดอนุญาตให้เบราว์เซอร์เปิด Pop-up เพื่อดูเอกสาร");
            }
        } catch (e) {
            console.error("Error opening PDF:", e);
            alert("ไม่สามารถเปิดไฟล์ได้: ไฟล์อาจเสียหายหรือรูปแบบไม่ถูกต้อง");
        }
    };

    const getRoleColor = (role?: UserRole | string) => {
        switch (role) {
            case UserRole.ADMIN: return 'text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold';
            case UserRole.STAFF: return 'text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold';
            default: return 'text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-md text-[10px] font-bold';
        }
    };

    if (loading) return <div className="p-20 flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-indigo-600" size={48}/><p className="text-slate-500 font-bold">กำลังดึงข้อมูล...</p></div>;
    if (!doc) return <div className="p-20 text-center flex flex-col items-center gap-4"><XCircle size={64} className="text-rose-455"/><p className="text-xl font-bold text-slate-800">ไม่พบข้อมูล</p><button onClick={handleBack} className="text-indigo-650 font-bold underline">กลับไปหน้าหลัก</button></div>;

    const isAdmin = user.role === UserRole.ADMIN;
    const isStaff = user.role === UserRole.STAFF;
    const isRecipient = doc.to_recipient_id === user.id;
    const isCreator = doc.creator_id === user.id;
    
    // Logic for button visibility
    const canAccept = doc.status === DocStatus.PENDING_ACCEPT && (isRecipient || isAdmin);
    const canVerify = doc.status === DocStatus.PENDING_VERIFY && isAdmin;
    const canApprove = (isAdmin || isStaff || isRecipient) && (doc.status === DocStatus.REGISTERED || doc.status === DocStatus.FORWARDED || doc.status === DocStatus.PROPOSING);
    const canForward = (isAdmin || isStaff || isRecipient || isCreator) && doc.status !== DocStatus.APPROVED && doc.status !== DocStatus.CANCELLED && doc.status !== DocStatus.PENDING_VERIFY;
    const canEdit = isAdmin || isCreator || isRecipient || isStaff;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20 relative animate-fade-in-up">
            {statusMessage && (
                <div className={`fixed top-20 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${statusMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                    {statusMessage.type === 'success' ? <CheckCircle size={24}/> : <AlertCircle size={24}/>}
                    <span className="font-bold">{statusMessage.text}</span>
                    <button onClick={() => setStatusMessage(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={20}/></button>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button 
                      onClick={handleBack} 
                      className="btn btn-icon btn-secondary hover:bg-slate-200/80 rounded-full"
                    >
                      <ArrowLeft size={20}/>
                    </button>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">ข้อมูลหนังสือ</h1>
                </div>
                <div className="md:ml-auto flex flex-wrap gap-2">
                    <button 
                      onClick={() => setShowQR(true)} 
                      className="btn btn-icon btn-secondary" 
                      title="ดู QR Code"
                    >
                      <QrCode size={20}/>
                    </button>
                    <button 
                      onClick={loadData} 
                      className="btn btn-icon btn-secondary text-slate-500"
                    >
                      <RefreshCw size={20}/>
                    </button>
                    {canEdit && (
                      <button 
                        onClick={handleEditClick} 
                        className="btn btn-secondary active:scale-95 shadow-sm"
                      >
                        <Edit size={18}/> แก้ไขข้อมูล
                      </button>
                    )}
                    
                    {/* Admin Actions Group */}
                    {canVerify && (
                         <button 
                           onClick={() => setModalAction('verify')} 
                           className="btn btn-primary active:scale-95 shadow-md shadow-indigo-500/10"
                         >
                           <ShieldCheck size={18}/> ตรวจสอบและส่งต่อ
                         </button>
                    )}
                    {canAccept && (
                        <>
                            <button 
                              onClick={() => setModalAction('receive')} 
                              className="btn btn-success active:scale-95 shadow-md shadow-emerald-500/10"
                            >
                              <CheckCircle size={18}/> รับหนังสือ
                            </button>
                            <button 
                              onClick={() => setModalAction('return')} 
                              className="btn btn-secondary !border-amber-250 !text-amber-700 hover:bg-amber-50 active:scale-95 shadow-sm"
                            >
                              <RotateCcw size={18}/> ตีกลับ
                            </button>
                        </>
                    )}
                    {canApprove && (
                        <button 
                          onClick={() => setModalAction('approve')} 
                          className="btn btn-success active:scale-95 shadow-md shadow-emerald-500/10"
                        >
                          <FileCheck size={18}/> อนุมัติหนังสือ
                        </button>
                    )}
                    {canForward && (
                      <button 
                        onClick={() => setShowForwardModal(true)} 
                        className="btn btn-primary active:scale-95 shadow-md shadow-indigo-500/10"
                      >
                        <UserPlus size={18}/> ส่งต่อ
                      </button>
                    )}
                    {canEdit && doc.status !== DocStatus.CANCELLED && doc.status !== DocStatus.APPROVED && (
                      <button 
                        onClick={() => setModalAction('cancel')} 
                        className="btn btn-danger active:scale-95 shadow-md shadow-rose-500/10"
                      >
                        <XCircle size={18}/> ยกเลิก
                      </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6 border-t-4 border-t-indigo-500 relative overflow-hidden animate-fade-in-up">
                        <div className="absolute right-6 top-6 opacity-5 pointer-events-none"><FileText size={140}/></div>
                        <div className="flex justify-between items-start mb-6">
                          <div className="min-w-0 flex-1 relative z-10">
                            <StatusBadge status={doc.status} />
                            <h2 className="text-2xl font-black text-slate-800 mt-3 mb-1 leading-tight tracking-tight">
                              {doc.subject}
                            </h2>
                            <p className="text-indigo-600 font-extrabold text-lg mt-1">
                              เลขรับ: {doc.book_no ? `${doc.book_no}/${doc.book_year}` : 'รอกดรับ'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8 text-sm border-t border-slate-200/50 pt-6 relative z-10">
                            <div>
                              <p className="text-slate-400 font-black mb-1 text-[10px] uppercase tracking-wider">เลขที่หนังสือ (ต้นทาง)</p>
                              <p className="font-bold text-slate-800 text-base">{doc.external_book_no || '-'}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-black mb-1 text-[10px] uppercase tracking-wider">ลงวันที่</p>
                              <p className="font-bold text-slate-800 text-base">{new Date(doc.doc_date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
                            </div>
                            <div>
                                <p className="text-indigo-650 font-black mb-1 text-[10px] uppercase tracking-wider">วันที่ลงทะเบียนรับเข้า</p>
                                <p className="font-bold text-indigo-800 text-base">
                                    {doc.registration_date ? new Date(doc.registration_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '-'}
                                </p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-black mb-1 text-[10px] uppercase tracking-wider">จากหน่วยงาน</p>
                              <p className="font-bold text-slate-800 text-base">{doc.from_origin}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-black mb-1 text-[10px] uppercase tracking-wider">เจ้าหน้าที่ผู้รับ</p>
                              <p className="font-bold text-indigo-750 text-base">{doc.recipient_name || 'ไม่ได้ระบุ'}</p>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                              <p className="text-slate-400 font-black mb-1 text-[10px] uppercase tracking-wider">Tracking Code</p>
                              <p className="font-mono bg-indigo-500/5 px-4 py-2.5 rounded-xl border border-indigo-500/10 inline-block text-indigo-700 font-bold mt-1.5 text-lg shadow-sm">
                                {doc.tracking_code}
                              </p>
                            </div>
                            {doc.remark && (
                              <div className="col-span-1 sm:col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200/50">
                                <p className="text-slate-400 font-black mb-1 text-[10px] uppercase tracking-wider">หมายเหตุ</p>
                                <p className="text-slate-700 italic font-medium">{doc.remark}</p>
                              </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden animate-fade-in-up">
                        <div className="bg-slate-50/20 px-6 py-4 border-b border-slate-200/50 backdrop-blur-md">
                          <h3 className="font-black text-slate-700 flex items-center gap-2">
                            <FileText size={18} className="text-indigo-500"/> เอกสารแนบ
                          </h3>
                        </div>
                        <div className="p-6">
                            {!doc.attachment_url && !doc.approved_attachment_url ? (
                                <div className="text-center py-10 text-slate-400 font-semibold italic flex flex-col items-center justify-center gap-2">
                                  <FileIcon size={40} className="opacity-25" />
                                  <span>ไม่พบไฟล์แนบ</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Render all original attachments */}
                                    {(() => {
                                        if (!doc.attachment_url) return null;
                                        let parsed: { name: string, url: string }[] = [];
                                        try {
                                            if (doc.attachment_url.startsWith('[')) {
                                                parsed = JSON.parse(doc.attachment_url);
                                            } else {
                                                parsed = [{ name: 'เอกสารต้นฉบับ.pdf', url: doc.attachment_url }];
                                            }
                                        } catch (e) {
                                            parsed = [{ name: 'เอกสารต้นฉบับ.pdf', url: doc.attachment_url }];
                                        }

                                        return parsed.map((file, i) => (
                                            <div 
                                              key={i} 
                                              className="flex items-center justify-between p-4 bg-white/60 border border-slate-200/50 rounded-2xl hover:bg-indigo-50/10 hover:border-indigo-200/50 transition-all group min-w-0 shadow-sm"
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-4">
                                                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                                      <FileText size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                      <p className="font-bold text-slate-800 text-sm truncate" title={file.name}>
                                                        {file.name}
                                                      </p>
                                                      <p className="text-[10px] text-slate-400 font-semibold">ไฟล์แนบ #{i+1}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                  onClick={() => openPdf(file.url)} 
                                                  className="btn btn-sm btn-secondary shadow-sm"
                                                >
                                                  <Eye size={14} /> เปิดดู
                                                </button>
                                            </div>
                                        ));
                                    })()}
                                    
                                    {/* Render Approved attachment */}
                                    {doc.approved_attachment_url && (
                                        <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl hover:bg-emerald-500/10 transition-all group min-w-0 md:col-span-2 shadow-sm">
                                            <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-4">
                                                <div className="w-10 h-10 bg-emerald-550/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                                  <CheckCircle size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="font-black text-emerald-800 text-sm truncate" title="เอกสารอนุมัติแล้ว.pdf">
                                                    เอกสารอนุมัติแล้ว.pdf
                                                  </p>
                                                  <p className="text-[10px] text-emerald-600 font-bold">ลงนามและอนุมัติเสร็จสิ้น</p>
                                                </div>
                                            </div>
                                            <button 
                                              onClick={() => openPdf(doc.approved_attachment_url!)} 
                                              className="btn btn-sm btn-success shadow-sm"
                                            >
                                              <Eye size={14} /> เปิดดู
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-6 sticky top-6 animate-fade-in-up">
                        <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200/50 pb-3">
                          <Clock size={18} className="text-indigo-500"/> ประวัติเส้นทาง
                        </h3>
                        <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="relative border-l border-slate-200/80 ml-2.5 space-y-6 pl-5 pt-1.5 pb-1.5">
                                {logs.length === 0 ? (
                                  <p className="text-slate-450 text-xs italic font-semibold">ไม่มีข้อมูลประวัติ</p>
                                ) : logs.map((log, i) => (
                                    <div key={log.id} className="relative">
                                        <div className={`absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-all ${
                                          i === 0 ? 'bg-indigo-600 ring-4 ring-indigo-500/10 scale-110' : 'bg-slate-300'
                                        }`}></div>
                                        <p className="text-[10px] text-slate-400 font-black mb-1 tracking-wider uppercase">
                                          {new Date(log.timestamp).toLocaleString('th-TH')}
                                        </p>
                                        <p className="text-xs font-black text-slate-800">{log.action}</p>
                                        <div className="mt-1 bg-white/50 p-3 rounded-xl text-xs text-slate-600 font-medium italic border border-slate-200/40 shadow-sm leading-relaxed">
                                          {log.details}
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className={getRoleColor(log.actor_role)}>{log.actor_name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Modal */}
            {showQR && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="glass-modal max-w-sm w-full p-8 text-center relative animate-fade-in-scale shadow-2xl">
                         <button 
                           onClick={() => setShowQR(false)} 
                           className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
                         >
                           <X size={20}/>
                         </button>
                         <h3 className="text-xl font-black text-slate-800 mb-2">QR Code สำหรับติดตาม</h3>
                         <p className="text-slate-500 text-xs font-semibold mb-6">ใช้แอปพลิเคชันสแกนเพื่อดูสถานะหรือรับเอกสาร</p>
                         
                         <div className="bg-white p-4 border border-slate-200 rounded-2xl inline-block mb-4 shadow-sm">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${doc.tracking_code}`} alt="QR Code" className="w-44 h-44" />
                         </div>
                         
                         <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/50 shadow-inner">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Tracking Code</p>
                            <p className="font-mono text-lg font-black text-indigo-650 tracking-widest mt-0.5">{doc.tracking_code}</p>
                         </div>
                    </div>
                </div>
            )}
            
            {/* Forward Modal */}
            {showForwardModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="glass-modal w-full max-w-md overflow-hidden animate-fade-in-scale shadow-2xl text-left">
                        <div className="p-6 border-b border-slate-200/50 flex justify-between items-center bg-indigo-50/20 text-indigo-900">
                            <h3 className="font-black flex items-center gap-2 text-lg"><UserPlus size={20} className="text-indigo-600"/> ส่งต่อหนังสือ</h3>
                            <button 
                              onClick={() => setShowForwardModal(false)}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <X size={20}/>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="modern-input-label">ส่งต่อถึงเจ้าหน้าที่</label>
                                <SearchableSelect 
                                    options={staffList.map(u => ({ id: u.id, label: u.full_name, subLabel: u.department_name }))} 
                                    value={forwardToId} 
                                    onChange={(id) => setForwardToId(id)} 
                                    placeholder="เลือกผู้รับ..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="modern-input-label">หมายเหตุ/คำสั่งการ</label>
                                <textarea 
                                    rows={3} 
                                    className="modern-textarea" 
                                    value={modalReason} 
                                    onChange={e => setModalReason(e.target.value)} 
                                    placeholder="ระบุรายละเอียด..."
                                ></textarea>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button 
                                  type="button" 
                                  onClick={() => setShowForwardModal(false)} 
                                  className="flex-1 btn btn-secondary"
                                >
                                  ยกเลิก
                                </button>
                                <button 
                                    onClick={handleForwardExecute} 
                                    disabled={actionLoading || !forwardToId} 
                                    className="flex-1 btn btn-primary shadow-lg shadow-indigo-500/10"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>} ยืนยันส่งต่อ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* General Actions Modal (Receive, Return, Cancel, Approve, Verify) */}
            {modalAction && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="glass-modal w-full max-w-md overflow-hidden animate-fade-in-scale shadow-2xl text-left">
                        <div className={`p-6 border-b border-slate-200/50 flex justify-between items-center ${
                            modalAction === 'receive' ? 'bg-emerald-500/10 text-emerald-900' : 
                            modalAction === 'return' ? 'bg-amber-500/10 text-amber-900' : 
                            modalAction === 'approve' ? 'bg-emerald-500/10 text-emerald-900' :
                            modalAction === 'verify' ? 'bg-indigo-500/10 text-indigo-900' :
                            'bg-rose-500/10 text-rose-900'
                        }`}>
                            <h3 className="font-black flex items-center gap-2 text-lg">
                                {modalAction === 'receive' && 'รับหนังสือ'}
                                {modalAction === 'return' && 'ตีกลับหนังสือ'}
                                {modalAction === 'cancel' && 'ยกเลิกหนังสือ'}
                                {modalAction === 'approve' && 'อนุมัติหนังสือ'}
                                {modalAction === 'verify' && 'ตรวจสอบและส่งต่อ'}
                            </h3>
                            <button 
                              onClick={() => setModalAction(null)}
                              className="text-slate-400 hover:text-slate-650"
                            >
                              <X size={20}/>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {modalAction === 'approve' ? (
                                <div className="space-y-4">
                                    <p className="text-slate-600 font-semibold text-sm">
                                      โปรดอัปโหลดไฟล์ PDF ที่มีการลงนามหรืออนุมัติแล้วเพื่อเปลี่ยนสถานะเป็น <span className="text-emerald-600 font-extrabold">อนุมัติแล้ว</span>
                                    </p>
                                    <div className="border-2 border-dashed border-emerald-250 hover:border-emerald-500 rounded-2xl p-8 text-center hover:bg-emerald-50/10 transition-all cursor-pointer relative bg-emerald-50/5">
                                        <input type="file" id="modal-approve-file" className="hidden" accept=".pdf" onChange={e => e.target.files && setApprovedFile(e.target.files[0])} />
                                        <label htmlFor="modal-approve-file" className="cursor-pointer flex flex-col items-center gap-3">
                                            <Upload size={32} className="text-emerald-500"/>
                                            <span className="text-emerald-800 font-bold text-xs">
                                                {approvedFile ? approvedFile.name : 'คลิกเพื่อเลือกไฟล์ PDF'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            ) : modalAction === 'verify' ? (
                                <p className="text-slate-600 font-semibold text-sm leading-relaxed">
                                  ยืนยันว่าเอกสารนี้ถูกต้องและต้องการส่งต่อให้เจ้าหน้าที่ <span className="text-indigo-650 font-extrabold">{doc.recipient_name}</span> เพื่อดำเนินการต่อ?
                                </p>
                            ) : (
                                <>
                                    <p className="text-slate-600 font-semibold text-sm">
                                      ยืนยันการดำเนินการ {modalAction === 'receive' ? 'รับเข้าสารบรรณ' : modalAction === 'return' ? 'ตีกลับเพื่อแก้ไข' : 'ยกเลิกหนังสือถาวร'}?
                                    </p>
                                    {(modalAction === 'return' || modalAction === 'cancel') && (
                                      <textarea 
                                        rows={3} 
                                        autoFocus 
                                        className="modern-textarea" 
                                        value={modalReason} 
                                        onChange={e => setModalReason(e.target.value)} 
                                        placeholder="ระบุเหตุผลประกอบ..."
                                      ></textarea>
                                    )}
                                </>
                            )}
                            <div className="pt-2 flex gap-3">
                                <button 
                                  type="button" 
                                  onClick={() => setModalAction(null)} 
                                  className="flex-1 btn btn-secondary"
                                >
                                  ยกเลิก
                                </button>
                                <button 
                                    onClick={handleActionExecute} 
                                    disabled={actionLoading || (modalAction === 'return' && !modalReason.trim()) || (modalAction === 'approve' && !approvedFile)} 
                                    className={`flex-1 btn shadow-lg ${
                                        modalAction === 'receive' ? 'btn-success shadow-emerald-500/10' : 
                                        modalAction === 'return' ? 'btn-primary bg-amber-600 hover:bg-amber-700 shadow-amber-500/10' : 
                                        modalAction === 'approve' ? 'btn-success shadow-emerald-500/10' :
                                        modalAction === 'verify' ? 'btn-primary shadow-indigo-500/10' :
                                        'btn-danger shadow-rose-500/10'
                                    }`}
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>} ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default DocumentDetail;
