
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
            // Data URI format: "data:application/pdf;base64,..."
            const arr = base64.split(',');
            if (arr.length < 2) {
                // Try treating the whole string as raw base64 if no prefix
                // Or inform user if data is invalid
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
            case UserRole.ADMIN: return 'text-orange-600';
            case UserRole.STAFF: return 'text-purple-600';
            default: return 'text-slate-500';
        }
    };

    if (loading) return <div className="p-20 flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-blue-600" size={48}/><p className="text-slate-500 font-bold">กำลังดึงข้อมูล...</p></div>;
    if (!doc) return <div className="p-20 text-center flex flex-col items-center gap-4"><XCircle size={64} className="text-red-400"/><p className="text-xl font-bold text-slate-800">ไม่พบข้อมูล</p><button onClick={handleBack} className="text-blue-600 font-bold underline">กลับไปหน้าหลัก</button></div>;

    const isAdmin = user.role === UserRole.ADMIN;
    const isStaff = user.role === UserRole.STAFF;
    const isRecipient = doc.to_recipient_id === user.id;
    const isCreator = doc.creator_id === user.id;
    
    // Logic for button visibility
    const canAccept = doc.status === DocStatus.PENDING_ACCEPT && (isRecipient || isAdmin);
    const canVerify = doc.status === DocStatus.PENDING_VERIFY && isAdmin; // New Logic
    const canApprove = (isAdmin || isStaff || isRecipient) && (doc.status === DocStatus.REGISTERED || doc.status === DocStatus.FORWARDED || doc.status === DocStatus.PROPOSING);
    const canForward = (isAdmin || isStaff || isRecipient || isCreator) && doc.status !== DocStatus.APPROVED && doc.status !== DocStatus.CANCELLED && doc.status !== DocStatus.PENDING_VERIFY;
    const canEdit = isAdmin || isCreator || isRecipient || isStaff;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20 relative">
            {statusMessage && (
                <div className={`fixed top-20 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${statusMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {statusMessage.type === 'success' ? <CheckCircle size={24}/> : <AlertCircle size={24}/>}
                    <span className="font-bold">{statusMessage.text}</span>
                    <button onClick={() => setStatusMessage(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={20}/></button>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4"><button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={24}/></button><h1 className="text-2xl font-bold text-slate-800">ข้อมูลหนังสือ</h1></div>
                <div className="md:ml-auto flex flex-wrap gap-2">
                    <button onClick={() => setShowQR(true)} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm" title="ดู QR Code"><QrCode size={20}/></button>
                    <button onClick={loadData} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><RefreshCw size={20}/></button>
                    {canEdit && <button onClick={handleEditClick} className="bg-white border text-slate-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"><Edit size={18}/> แก้ไขข้อมูล</button>}
                    
                    {/* Admin Actions Group */}
                    {canVerify && (
                         <button onClick={() => setModalAction('verify')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-md"><ShieldCheck size={18}/> ตรวจสอบและส่งต่อ</button>
                    )}
                    {canAccept && (
                        <>
                            <button onClick={() => setModalAction('receive')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 active:scale-95 transition-all shadow-md"><CheckCircle size={18}/> รับหนังสือ</button>
                            <button onClick={() => setModalAction('return')} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-600 active:scale-95 transition-all shadow-md"><RotateCcw size={18}/> ตีกลับ</button>
                        </>
                    )}
                    {canApprove && (
                        <button onClick={() => setModalAction('approve')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all shadow-md"><FileCheck size={18}/> อนุมัติหนังสือ</button>
                    )}
                    {canForward && <button onClick={() => setShowForwardModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all shadow-md"><UserPlus size={18}/> ส่งต่อ</button>}
                    {canEdit && doc.status !== DocStatus.CANCELLED && doc.status !== DocStatus.APPROVED && <button onClick={() => setModalAction('cancel')} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-600 active:scale-95 transition-all shadow-md"><XCircle size={18}/> ยกเลิก</button>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border p-6 shadow-sm border-t-4 border-t-blue-600 relative">
                        <div className="absolute right-6 top-6 opacity-10 pointer-events-none"><FileText size={120}/></div>
                        <div className="flex justify-between items-start mb-6"><div className="min-w-0 flex-1 relative z-10"><StatusBadge status={doc.status} /><h2 className="text-2xl font-bold text-slate-900 mt-2 mb-1 leading-tight">{doc.subject}</h2><p className="text-blue-600 font-bold text-lg">เลขรับ: {doc.book_no ? `${doc.book_no}/${doc.book_year}` : 'รอกดรับ'}</p></div></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8 text-sm border-t pt-6 relative z-10">
                            <div><p className="text-slate-500 font-bold mb-1 text-[10px] uppercase">เลขที่หนังสือ (ต้นทาง)</p><p className="font-bold text-slate-800 text-base">{doc.external_book_no || '-'}</p></div>
                            <div><p className="text-slate-500 font-bold mb-1 text-[10px] uppercase">ลงวันที่</p><p className="font-bold text-slate-800 text-base">{new Date(doc.doc_date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</p></div>
                            <div>
                                <p className="text-slate-500 font-bold mb-1 text-[10px] uppercase text-blue-600">วันที่ลงทะเบียนรับเข้า</p>
                                <p className="font-bold text-blue-800 text-base">
                                    {doc.registration_date ? new Date(doc.registration_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '-'}
                                </p>
                            </div>
                            <div><p className="text-slate-500 font-bold mb-1 text-[10px] uppercase">จากหน่วยงาน</p><p className="font-bold text-slate-800 text-base">{doc.from_origin}</p></div>
                            <div><p className="text-slate-500 font-bold mb-1 text-[10px] uppercase">เจ้าหน้าที่ผู้รับ</p><p className="font-bold text-blue-700 text-base">{doc.recipient_name || 'ไม่ได้ระบุ'}</p></div>
                            <div className="col-span-1 sm:col-span-2"><p className="text-slate-500 font-bold mb-1 text-[10px] uppercase">Tracking Code</p><p className="font-mono bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 inline-block text-blue-700 font-bold mt-1 text-lg">{doc.tracking_code}</p></div>
                            {doc.remark && <div className="col-span-1 sm:col-span-2 bg-slate-50 p-4 rounded-xl border"><p className="text-slate-500 font-bold mb-1 text-[10px] uppercase">หมายเหตุ</p><p className="text-slate-800 italic">{doc.remark}</p></div>}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b"><h3 className="font-bold text-slate-700 flex items-center gap-2"><FileText size={20}/> เอกสารแนบ</h3></div>
                        <div className="p-6">
                            {!doc.attachment_url && !doc.approved_attachment_url ? (
                                <div className="text-center py-10 text-slate-400 italic"><FileIcon size={40} className="mx-auto mb-3 opacity-20" />ไม่พบไฟล์แนบ</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {doc.attachment_url && (
                                        <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl hover:bg-blue-50 transition-all group">
                                            <div className="flex items-center gap-4"><div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><FileText size={20} /></div><div><p className="font-bold text-slate-800 text-sm">เอกสารต้นฉบับ</p></div></div>
                                            <button onClick={() => openPdf(doc.attachment_url!)} className="bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5 text-sm"><Eye size={16} /> เปิดดู</button>
                                        </div>
                                    )}
                                    {doc.approved_attachment_url && (
                                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-all group">
                                            <div className="flex items-center gap-4"><div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center"><CheckCircle size={20} /></div><div><p className="font-bold text-green-800 text-sm">เอกสารอนุมัติแล้ว</p></div></div>
                                            <button onClick={() => openPdf(doc.approved_attachment_url!)} className="bg-white border border-green-200 text-green-600 px-4 py-2 rounded-lg font-bold hover:bg-green-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5 text-sm"><Eye size={16} /> เปิดดู</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl border p-6 shadow-sm sticky top-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-3"><Clock size={18}/> ประวัติเส้นทาง</h3>
                        <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="relative border-l-2 border-slate-100 ml-2 space-y-8 pl-6 pt-2 pb-2">
                                {logs.length === 0 ? <p className="text-slate-400 text-xs italic">ไม่มีข้อมูลประวัติ</p> : logs.map((log, i) => (
                                    <div key={log.id} className="relative">
                                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${i === 0 ? 'bg-blue-600 ring-4 ring-blue-50' : 'bg-slate-300'}`}></div>
                                        <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">{new Date(log.timestamp).toLocaleString('th-TH')}</p>
                                        <p className="text-sm font-bold text-slate-800">{log.action}</p>
                                        <div className="mt-1 bg-slate-50 p-3 rounded-lg text-xs text-slate-600 italic border border-slate-100">{log.details}</div>
                                        <div className="mt-2 flex items-center gap-1.5">
                                            <User size={14} className={getRoleColor(log.actor_role)}/>
                                            <p className={`text-sm font-bold ${getRoleColor(log.actor_role)}`}>{log.actor_name}</p>
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative animate-in zoom-in-95 duration-200">
                         <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                         <h3 className="text-xl font-bold text-slate-800 mb-2">QR Code สำหรับติดตาม</h3>
                         <p className="text-slate-500 text-sm mb-6">ใช้แอปพลิเคชันสแกนเพื่อดูสถานะหรือรับเอกสาร</p>
                         
                         <div className="bg-white p-4 border-2 border-slate-900 rounded-xl inline-block mb-4 shadow-inner">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${doc.tracking_code}`} alt="QR Code" className="w-48 h-48" />
                         </div>
                         
                         <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Tracking Code</p>
                            <p className="font-mono text-lg font-bold text-blue-600 tracking-wider">{doc.tracking_code}</p>
                         </div>
                    </div>
                </div>
            )}
            
            {/* Forward Modal */}
            {showForwardModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                        <div className="p-6 border-b flex justify-between items-center bg-blue-50 text-blue-800">
                            <h3 className="font-bold flex items-center gap-2"><UserPlus size={20}/> ส่งต่อหนังสือ</h3>
                            <button onClick={() => setShowForwardModal(false)}><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">ส่งต่อถึงเจ้าหน้าที่</label>
                                <SearchableSelect 
                                    options={staffList.map(u => ({ id: u.id, label: u.full_name, subLabel: u.department_name }))} 
                                    value={forwardToId} 
                                    onChange={(id) => setForwardToId(id)} 
                                    placeholder="เลือกผู้รับ..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">หมายเหตุ/คำสั่งการ</label>
                                <textarea 
                                    rows={3} 
                                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                                    value={modalReason} 
                                    onChange={e => setModalReason(e.target.value)} 
                                    placeholder="ระบุรายละเอียด..."
                                ></textarea>
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowForwardModal(false)} className="flex-1 px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl border transition-all">ยกเลิก</button>
                                <button 
                                    onClick={handleForwardExecute} 
                                    disabled={actionLoading || !forwardToId} 
                                    className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 hover:bg-blue-700"
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
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                        <div className={`p-6 border-b flex justify-between items-center ${
                            modalAction === 'receive' ? 'bg-green-50 text-green-800' : 
                            modalAction === 'return' ? 'bg-orange-50 text-orange-800' : 
                            modalAction === 'approve' ? 'bg-emerald-50 text-emerald-800' :
                            modalAction === 'verify' ? 'bg-indigo-50 text-indigo-800' :
                            'bg-red-50 text-red-800'
                        }`}>
                            <h3 className="font-bold flex items-center gap-2">
                                {modalAction === 'receive' && 'รับหนังสือ'}
                                {modalAction === 'return' && 'ตีกลับหนังสือ'}
                                {modalAction === 'cancel' && 'ยกเลิกหนังสือ'}
                                {modalAction === 'approve' && 'อนุมัติหนังสือ'}
                                {modalAction === 'verify' && 'ตรวจสอบและส่งต่อ'}
                            </h3>
                            <button onClick={() => setModalAction(null)}><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {modalAction === 'approve' ? (
                                <div className="space-y-4">
                                    <p className="text-slate-600 font-medium">โปรดอัปโหลดไฟล์ PDF ที่มีการลงนามหรืออนุมัติแล้วเพื่อเปลี่ยนสถานะเป็น <span className="text-emerald-600 font-bold">อนุมัติแล้ว</span></p>
                                    <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-8 text-center hover:bg-emerald-50 transition-all cursor-pointer relative bg-emerald-50/20">
                                        <input type="file" id="modal-approve-file" className="hidden" accept=".pdf" onChange={e => e.target.files && setApprovedFile(e.target.files[0])} />
                                        <label htmlFor="modal-approve-file" className="cursor-pointer flex flex-col items-center gap-3">
                                            <Upload size={32} className="text-emerald-500"/>
                                            <span className="text-emerald-700 font-bold text-sm">
                                                {approvedFile ? approvedFile.name : 'คลิกเพื่อเลือกไฟล์ PDF'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            ) : modalAction === 'verify' ? (
                                <p className="text-slate-600 font-medium">ยืนยันว่าเอกสารนี้ถูกต้องและต้องการส่งต่อให้เจ้าหน้าที่ <span className="text-indigo-600 font-bold">{doc.recipient_name}</span> เพื่อดำเนินการต่อ?</p>
                            ) : (
                                <>
                                    <p className="text-slate-600 font-medium">ยืนยันการดำเนินการ {modalAction === 'receive' ? 'รับเข้าสารบรรณ' : modalAction === 'return' ? 'ตีกลับเพื่อแก้ไข' : 'ยกเลิกหนังสือถาวร'}?</p>
                                    {(modalAction === 'return' || modalAction === 'cancel') && <textarea rows={3} autoFocus className="w-full px-4 py-3 border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={modalReason} onChange={e => setModalReason(e.target.value)} placeholder="ระบุเหตุผล..."></textarea>}
                                </>
                            )}
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setModalAction(null)} className="flex-1 px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl border transition-all">ยกเลิก</button>
                                <button 
                                    onClick={handleActionExecute} 
                                    disabled={actionLoading || (modalAction === 'return' && !modalReason.trim()) || (modalAction === 'approve' && !approvedFile)} 
                                    className={`flex-1 text-white font-bold py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${
                                        modalAction === 'receive' ? 'bg-green-600 hover:bg-green-700' : 
                                        modalAction === 'return' ? 'bg-orange-500 hover:bg-orange-600' : 
                                        modalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                        modalAction === 'verify' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                        'bg-red-600 hover:bg-red-700'
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
