
import React, { useEffect, useState } from 'react';
import { FileText, Inbox, CheckCircle, XCircle, Search, Plus, Loader2, Link, Clock, AlertCircle, Zap, ChevronLeft, ChevronRight, ListFilter, ArrowRight, ShieldAlert, Check, Layers, CheckSquare } from 'lucide-react';
import { Document, DashboardStats, UserRole, DocStatus, Profile, DocPriority } from '../types';
import { getDocuments, getStats, updateDocumentStatus } from '../services/mockService';
import StatusBadge from './StatusBadge';
import { useNavigate } from 'react-router-dom';
import { PRIORITY_CONFIG } from '../constants';

interface DashboardProps {
  user: Profile;
  onRegisterClick: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Search state for main table
  const [searchTerm, setSearchTerm] = useState('');
  
  // Search state for tasks
  const [taskSearchTerm, setTaskSearchTerm] = useState('');

  // Search state for verification
  const [verifySearchTerm, setVerifySearchTerm] = useState('');
  
  const navigate = useNavigate();

  // Pagination State for Main Table
  const [tablePage, setTablePage] = useState(1);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(10);

  // Pagination State for Incoming Tasks
  const [taskPage, setTaskPage] = useState(1);
  const [taskRowsPerPage, setTaskRowsPerPage] = useState(10);

  // Pagination State for Verification (Admin)
  const [verifyPage, setVerifyPage] = useState(1);
  const [verifyRowsPerPage, setVerifyRowsPerPage] = useState(10);

  // Bulk Action State (Admin Only)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const isAdmin = user.role === UserRole.ADMIN;

  const fetchData = async () => {
    setLoading(true);
    try {
        const [docsData, statsData] = await Promise.all([
            getDocuments(user.id, user.role), 
            getStats(user.id, user.role)
        ]);
        setDocuments(docsData);
        setStats(statsData);
        setSelectedIds([]); // Reset selection on refresh
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleVerify = async (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`ยืนยันการตรวจสอบเอกสาร "${doc.subject}" และส่งต่อให้เจ้าหน้าที่?`)) {
        try {
            await updateDocumentStatus(doc.id, DocStatus.PENDING_ACCEPT, user, 'ตรวจสอบความถูกต้องและอนุมัติส่งต่อโดยแอดมิน');
            await fetchData();
        } catch(err: any) {
            alert(err.message);
        }
    }
  };

  const handleBulkForceReceive = async () => {
    if (selectedIds.length === 0) return;

    // Filter only documents with PENDING_ACCEPT status
    const validDocs = documents.filter(d => selectedIds.includes(d.id) && d.status === DocStatus.PENDING_ACCEPT);

    if (validDocs.length === 0) {
        alert("รายการที่เลือกไม่มีรายการใดอยู่ในสถานะ 'รอรับหนังสือ' ที่สามารถทำรายการได้");
        return;
    }

    if (!confirm(`ยืนยันการ "รับเรื่อง" สำหรับรายการที่เลือกจำนวน ${validDocs.length} รายการ? \n(เฉพาะรายการที่อยู่ในสถานะ 'รอรับหนังสือ' เท่านั้น)\nสถานะจะถูกเปลี่ยนเป็น "รับเข้าสารบรรณแล้ว"`)) return;
    
    setBulkLoading(true);
    try {
        await Promise.all(validDocs.map(doc => 
            updateDocumentStatus(doc.id, DocStatus.REGISTERED, user, 'Admin กดรับเรื่อง (Bulk Action)')
        ));
        alert(`ดำเนินการสำเร็จ ${validDocs.length} รายการ`);
        await fetchData();
    } catch (err: any) {
        alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
        setBulkLoading(false);
    }
  };

  const incomingTasks = documents.filter(d => d.status === DocStatus.PENDING_ACCEPT && d.to_recipient_id === user.id);
  const pendingVerifyDocs = documents.filter(d => d.status === DocStatus.PENDING_VERIFY);
  const regularDocs = documents.filter(d => (d.status !== DocStatus.PENDING_ACCEPT || d.to_recipient_id !== user.id) && d.status !== DocStatus.PENDING_VERIFY);

  // Filter Tasks
  const filteredTasks = incomingTasks.filter(doc => 
    doc.subject.toLowerCase().includes(taskSearchTerm.toLowerCase()) || 
    (doc.book_no && doc.book_no.toString().includes(taskSearchTerm)) ||
    (doc.external_book_no && doc.external_book_no.toLowerCase().includes(taskSearchTerm.toLowerCase())) ||
    doc.from_origin.toLowerCase().includes(taskSearchTerm.toLowerCase())
  );

  // Filter Verify Docs
  const filteredVerifyDocs = pendingVerifyDocs.filter(doc => 
    doc.subject.toLowerCase().includes(verifySearchTerm.toLowerCase()) || 
    doc.tracking_code.toLowerCase().includes(verifySearchTerm.toLowerCase()) ||
    doc.from_origin.toLowerCase().includes(verifySearchTerm.toLowerCase())
  );

  // Filter Main Docs
  const filteredDocs = regularDocs.filter(doc => 
    doc.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (doc.book_no && doc.book_no.toString().includes(searchTerm)) ||
    (doc.external_book_no && doc.external_book_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedDocs = paginate(filteredDocs, tablePage, tableRowsPerPage);

  // --- Helper for Pagination ---
  function paginate(items: any[], page: number, rows: number) {
    if (rows === -1) return items;
    const start = (page - 1) * rows;
    return items.slice(start, start + rows);
  }

  const toggleSelectAll = (currentPageDocs: Document[]) => {
      const allSelected = currentPageDocs.every(d => selectedIds.includes(d.id));
      if (allSelected) {
          setSelectedIds(prev => prev.filter(id => !currentPageDocs.find(d => d.id === id)));
      } else {
          const newIds = currentPageDocs.map(d => d.id);
          setSelectedIds(prev => Array.from(new Set([...prev, ...newIds])));
      }
  };

  const toggleSelectOne = (id: string) => {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const renderPaginationControls = (
      totalItems: number, 
      page: number, 
      setPage: (p: number) => void, 
      rowsPerPage: number, 
      setRowsPerPage: (r: number) => void,
      label: string
  ) => {
      const totalPages = rowsPerPage === -1 ? 1 : Math.ceil(totalItems / rowsPerPage);
      
      return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
                <span>แสดง {label}:</span>
                <select 
                    value={rowsPerPage} 
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                    className="border border-slate-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={-1}>ทั้งหมด</option>
                </select>
                <span>รายการ</span>
            </div>
            
            <div className="flex items-center gap-2">
                <span>หน้า {page} จาก {totalPages} ({totalItems} รายการ)</span>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                    <button 
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 hover:bg-slate-100 disabled:opacity-50 disabled:bg-slate-50 border-r border-slate-300"
                    >
                        <ChevronLeft size={16}/>
                    </button>
                    <button 
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages || totalPages === 0}
                        className="px-3 py-1 hover:bg-slate-100 disabled:opacity-50 disabled:bg-slate-50"
                    >
                        <ChevronRight size={16}/>
                    </button>
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">แดชบอร์ด (Dashboard)</h1>
          <p className="text-slate-500 font-medium">ยินดีต้อนรับคุณ {user.full_name}</p>
        </div>
        
        <div className="flex gap-2">
            {user.role !== UserRole.USER && (
                <button onClick={() => navigate('/register')} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
                    <Plus size={20} /> รับหนังสือใหม่
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Inbox size={24} /></div>
          <div><p className="text-sm font-bold text-slate-400">ทั้งหมด</p><p className="text-2xl font-bold text-slate-800">{stats?.totalReceived || 0}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={24} /></div>
          <div><p className="text-sm font-bold text-slate-400">รอกดรับ</p><p className="text-2xl font-bold text-slate-800">{stats?.pendingAccept || 0}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle size={24} /></div>
          <div><p className="text-sm font-bold text-slate-400">อนุมัติแล้ว</p><p className="text-2xl font-bold text-slate-800">{stats?.completed || 0}</p></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl"><XCircle size={24} /></div>
          <div><p className="text-sm font-bold text-slate-400">ยกเลิก</p><p className="text-2xl font-bold text-slate-800">{stats?.cancelled || 0}</p></div>
        </div>
      </div>

      {/* ADMIN Verification Queue Section */}
      {user.role === UserRole.ADMIN && pendingVerifyDocs.length > 0 && (
         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 border-l-4 border-l-indigo-500">
            <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/50">
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <ShieldAlert className="text-indigo-600" size={24}/> 
                    คำร้องจากบุคคลทั่วไป (รอตรวจสอบ) ({pendingVerifyDocs.length})
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="ค้นหาคำร้อง..." className="w-full sm:w-64 pl-9 pr-4 py-2.5 text-sm border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm" value={verifySearchTerm} onChange={(e) => { setVerifySearchTerm(e.target.value); setVerifyPage(1); }} />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-indigo-50 text-indigo-900 font-bold border-b border-indigo-100">
                    <tr>
                      <th className="px-6 py-4">วันที่ยื่น</th>
                      <th className="px-6 py-4">เรื่อง</th>
                      <th className="px-6 py-4">จาก</th>
                      <th className="px-6 py-4">Tracking Code</th>
                      <th className="px-6 py-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginate(filteredVerifyDocs, verifyPage, verifyRowsPerPage).map((doc) => (
                        <tr key={doc.id} className="hover:bg-indigo-50/30 cursor-pointer group transition-colors" onClick={() => navigate(`/document/${doc.id}`)}>
                            <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{new Date(doc.created_at).toLocaleDateString('th-TH')}</td>
                            <td title={doc.subject} className="px-6 py-4 text-slate-800 truncate max-w-[300px] font-bold group-hover:text-indigo-700">
                                {doc.subject}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{doc.from_origin}</td>
                            <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{doc.tracking_code}</td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={(e) => handleVerify(doc, e)} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1 ml-auto"
                                >
                                    <Check size={14}/> ตรวจสอบ
                                </button>
                            </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
            </div>

            {!loading && filteredVerifyDocs.length > 0 && (
                 <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                    {renderPaginationControls(filteredVerifyDocs.length, verifyPage, setVerifyPage, verifyRowsPerPage, setVerifyRowsPerPage, "รายการ")}
                 </div>
            )}
         </div>
      )}

      {/* 4. Incoming Tasks Section (Table View) */}
      {incomingTasks.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 border-l-4 border-l-amber-500">
              <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50/50">
                  <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      <AlertCircle className="text-amber-500" size={24}/> 
                      หนังสือรอการตอบรับ ({incomingTasks.length})
                  </h2>
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="text" placeholder="ค้นหาในงานที่รอ..." className="w-full sm:w-64 pl-9 pr-4 py-2.5 text-sm border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-sm" value={taskSearchTerm} onChange={(e) => { setTaskSearchTerm(e.target.value); setTaskPage(1); }} />
                  </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-amber-50 text-slate-600 font-bold border-b border-amber-100">
                    <tr>
                      <th className="px-6 py-4">วันที่ลง</th>
                      <th className="px-6 py-4">เรื่อง</th>
                      <th className="px-6 py-4">จาก</th>
                      <th className="px-6 py-4">ความเร่งด่วน</th>
                      <th className="px-6 py-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginate(filteredTasks, taskPage, taskRowsPerPage).map((doc) => {
                        const priority = doc.priority || DocPriority.NORMAL;
                        const priorityConfig = PRIORITY_CONFIG[priority];
                        return (
                            <tr key={doc.id} className="hover:bg-amber-50/30 cursor-pointer group transition-colors" onClick={() => navigate(`/document/${doc.id}`)}>
                            <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{new Date(doc.doc_date).toLocaleDateString('th-TH')}</td>
                            <td title={doc.subject} className="px-6 py-4 text-slate-800 truncate max-w-[300px] font-bold group-hover:text-amber-700">
                                {doc.subject}
                                <div className="text-[10px] text-slate-400 font-normal mt-0.5">{doc.external_book_no || '-'}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{doc.from_origin}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm ${priorityConfig.color}`}>
                                    {priority !== DocPriority.NORMAL && <Zap size={10}/>}
                                    {priorityConfig.label}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button className="p-2 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors">
                                    <ArrowRight size={18}/>
                                </button>
                            </td>
                            </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
              
              {!loading && filteredTasks.length > 0 && (
                 <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                    {renderPaginationControls(filteredTasks.length, taskPage, setTaskPage, taskRowsPerPage, setTaskRowsPerPage, "รายการ")}
                 </div>
              )}
          </div>
      )}

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            {isAdmin && selectedIds.length > 0 ? (
                <div className="flex-1 flex items-center justify-between bg-green-50 px-4 py-2 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2">
                    <span className="font-bold text-green-700 text-sm flex items-center gap-2">
                        <CheckSquare size={18}/> เลือกอยู่ {selectedIds.length} รายการ
                    </span>
                    <button 
                        onClick={handleBulkForceReceive}
                        disabled={bulkLoading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                        {bulkLoading ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>} รับเรื่อง
                    </button>
                </div>
            ) : (
                <>
                    <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2"><ListFilter size={20}/> รายการหนังสือในระบบ</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="ค้นหาชื่อเรื่อง, เลขที่..." className="w-full sm:w-64 pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setTablePage(1); }} />
                    </div>
                </>
            )}
          </div>
          
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b">
                <tr>
                  {isAdmin && (
                      <th className="px-4 py-4 w-12 text-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={paginatedDocs.length > 0 && paginatedDocs.every(d => selectedIds.includes(d.id))}
                            onChange={() => toggleSelectAll(paginatedDocs)}
                          />
                      </th>
                  )}
                  <th className="px-6 py-4">เลขรับ</th>
                  <th className="px-6 py-4">เรื่อง</th>
                  <th className="px-6 py-4">ความเร่งด่วน</th>
                  <th className="px-6 py-4">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></td></tr>
                ) : filteredDocs.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 5 : 4} className="px-6 py-20 text-center text-slate-400 font-bold italic">ไม่พบข้อมูลในรายการ</td></tr>
                ) : paginatedDocs.map((doc) => {
                    const priority = doc.priority || DocPriority.NORMAL;
                    const priorityConfig = PRIORITY_CONFIG[priority];
                    return (
                        <tr key={doc.id} className={`hover:bg-blue-50/50 cursor-pointer group transition-colors ${selectedIds.includes(doc.id) ? 'bg-blue-50' : ''}`} onClick={() => navigate(`/document/${doc.id}`)}>
                        {isAdmin && (
                            <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={selectedIds.includes(doc.id)}
                                    onChange={() => toggleSelectOne(doc.id)}
                                />
                            </td>
                        )}
                        <td className="px-6 py-4 font-bold text-blue-600 whitespace-nowrap">{doc.book_no ? `${doc.book_no}/${doc.book_year}` : '-'}</td>
                        <td title={doc.subject} className="px-6 py-4 text-slate-800 truncate max-w-[300px] group-hover:text-blue-700 font-bold">
                            {doc.subject}
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{doc.external_book_no}</div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm ${priorityConfig.color}`}>
                                {priority !== DocPriority.NORMAL && <Zap size={10}/>}
                                {priorityConfig.label}
                            </span>
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={doc.status} /></td>
                        </tr>
                    );
                })
                }
              </tbody>
            </table>
          </div>

          {/* Pagination for Table */}
          {!loading && filteredDocs.length > 0 && (
             <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                {renderPaginationControls(filteredDocs.length, tablePage, setTablePage, tableRowsPerPage, setTableRowsPerPage, "แถว")}
             </div>
          )}
      </div>
    </div>
  );
};

export default Dashboard;
