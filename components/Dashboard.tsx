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
    (doc.external_book_no && doc.external_book_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (doc.recipient_name && doc.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2">
                <span>แสดง {label}:</span>
                <select 
                    value={rowsPerPage} 
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                    className="modern-select !py-1.5 !px-3 !pr-9 w-20 text-xs font-semibold bg-white/50 border border-slate-200 rounded-lg outline-none"
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={-1}>ทั้งหมด</option>
                </select>
                <span>รายการ</span>
            </div>
            
            <div className="flex items-center gap-3">
                <span>หน้า {page} จาก {totalPages} ({totalItems} รายการ)</span>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white/60 shadow-sm backdrop-blur-sm">
                    <button 
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="p-2 hover:bg-slate-100/80 disabled:opacity-50 disabled:bg-transparent border-r border-slate-200 transition-colors"
                    >
                        <ChevronLeft size={16}/>
                    </button>
                    <button 
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages || totalPages === 0}
                        className="p-2 hover:bg-slate-100/80 disabled:opacity-50 disabled:bg-transparent transition-colors"
                    >
                        <ChevronRight size={16}/>
                    </button>
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">แดชบอร์ด (Dashboard)</h1>
          <p className="text-slate-500 font-semibold mt-0.5">ยินดีต้อนรับคุณ {user.full_name}</p>
        </div>
        
        <div className="flex gap-2">
            {user.role !== UserRole.USER && (
                <button 
                  onClick={() => navigate('/register')} 
                  className="btn btn-primary shadow-lg shadow-indigo-500/10 active:scale-95"
                >
                    <Plus size={20} /> รับหนังสือใหม่
                </button>
            )}
        </div>
      </div>

      {/* Stat cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div className="stat-card glass-card flex items-center gap-4">
          <div className="stat-icon bg-indigo-500/10 text-indigo-600"><Inbox size={24} /></div>
          <div>
            <p className="stat-label">ทั้งหมด</p>
            <p className="stat-value text-slate-800">{stats?.totalReceived || 0}</p>
          </div>
        </div>
        <div className="stat-card glass-card flex items-center gap-4">
          <div className="stat-icon bg-amber-500/10 text-amber-600"><Clock size={24} /></div>
          <div>
            <p className="stat-label">รอกดรับ</p>
            <p className="stat-value text-slate-800">{stats?.pendingAccept || 0}</p>
          </div>
        </div>
        <div className="stat-card glass-card flex items-center gap-4">
          <div className="stat-icon bg-emerald-500/10 text-emerald-600"><CheckCircle size={24} /></div>
          <div>
            <p className="stat-label">อนุมัติแล้ว</p>
            <p className="stat-value text-slate-800">{stats?.completed || 0}</p>
          </div>
        </div>
        <div className="stat-card glass-card flex items-center gap-4">
          <div className="stat-icon bg-rose-500/10 text-rose-600"><XCircle size={24} /></div>
          <div>
            <p className="stat-label">ยกเลิก</p>
            <p className="stat-value text-slate-800">{stats?.cancelled || 0}</p>
          </div>
        </div>
      </div>

      {/* ADMIN Verification Queue Section */}
      {user.role === UserRole.ADMIN && pendingVerifyDocs.length > 0 && (
         <div className="glass-card overflow-hidden border-l-4 border-l-indigo-500 animate-fade-in-up">
            <div className="p-5 border-b border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/20 backdrop-blur-md">
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <ShieldAlert className="text-indigo-600" size={24}/> 
                    คำร้องจากบุคคลทั่วไป (รอตรวจสอบ) ({pendingVerifyDocs.length})
                </h2>
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="ค้นหาคำร้อง..." 
                      className="modern-input !py-2 pl-9 w-full sm:w-64" 
                      value={verifySearchTerm} 
                      onChange={(e) => { setVerifySearchTerm(e.target.value); setVerifyPage(1); }} 
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th className="px-6 py-4">วันที่ยื่น</th>
                      <th className="px-6 py-4">เรื่อง</th>
                      <th className="px-6 py-4">จาก</th>
                      <th className="px-6 py-4">Tracking Code</th>
                      <th className="px-6 py-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(filteredVerifyDocs, verifyPage, verifyRowsPerPage).map((doc) => (
                        <tr 
                          key={doc.id} 
                          className="cursor-pointer group hover:bg-indigo-50/10" 
                          onClick={() => navigate(`/document/${doc.id}`)}
                        >
                            <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{new Date(doc.created_at).toLocaleDateString('th-TH')}</td>
                            <td title={doc.subject} className="px-6 py-4 text-slate-800 truncate max-w-[300px] font-bold group-hover:text-indigo-700">
                                {doc.subject}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{doc.from_origin}</td>
                            <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{doc.tracking_code}</td>
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <button 
                                    onClick={(e) => handleVerify(doc, e)} 
                                    className="btn btn-sm btn-primary shadow-sm shadow-indigo-500/10"
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
                 <div className="px-6 py-4 border-t border-slate-200/50 bg-slate-50/30">
                    {renderPaginationControls(filteredVerifyDocs.length, verifyPage, setVerifyPage, verifyRowsPerPage, setVerifyRowsPerPage, "รายการ")}
                 </div>
            )}
         </div>
      )}

      {/* Incoming Tasks Section (Table View) */}
      {incomingTasks.length > 0 && (
          <div className="glass-card overflow-hidden border-l-4 border-l-amber-500 animate-fade-in-up">
              <div className="p-5 border-b border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50/20 backdrop-blur-md">
                  <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      <AlertCircle className="text-amber-500" size={24}/> 
                      หนังสือรอการตอบรับ ({incomingTasks.length})
                  </h2>
                  <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="ค้นหาในงานที่รอ..." 
                        className="modern-input !py-2 pl-9 w-full sm:w-64" 
                        value={taskSearchTerm} 
                        onChange={(e) => { setTaskSearchTerm(e.target.value); setTaskPage(1); }} 
                      />
                  </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th className="px-6 py-4">วันที่ลง</th>
                      <th className="px-6 py-4">เรื่อง</th>
                      <th className="px-6 py-4">จาก</th>
                      <th className="px-6 py-4">ความเร่งด่วน</th>
                      <th className="px-6 py-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(filteredTasks, taskPage, taskRowsPerPage).map((doc) => {
                        const priority = doc.priority || DocPriority.NORMAL;
                        const priorityConfig = PRIORITY_CONFIG[priority];
                        return (
                            <tr 
                              key={doc.id} 
                              className="cursor-pointer group hover:bg-amber-50/10" 
                              onClick={() => navigate(`/document/${doc.id}`)}
                            >
                            <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{new Date(doc.doc_date).toLocaleDateString('th-TH')}</td>
                            <td title={doc.subject} className="px-6 py-4 text-slate-800 truncate max-w-[300px] font-bold group-hover:text-amber-700">
                                {doc.subject}
                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{doc.external_book_no || '-'}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{doc.from_origin}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm ${priorityConfig.color}`}>
                                    {priority !== DocPriority.NORMAL && <Zap size={10}/>}
                                    {priorityConfig.label}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={() => navigate(`/document/${doc.id}`)}
                                  className="btn btn-icon btn-sm btn-secondary bg-amber-500/10 border-0 text-amber-600 hover:bg-amber-500/20"
                                >
                                    <ArrowRight size={16}/>
                                </button>
                            </td>
                            </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
              
              {!loading && filteredTasks.length > 0 && (
                 <div className="px-6 py-4 border-t border-slate-200/50 bg-slate-50/30">
                    {renderPaginationControls(filteredTasks.length, taskPage, setTaskPage, taskRowsPerPage, setTaskRowsPerPage, "รายการ")}
                 </div>
              )}
          </div>
      )}

      {/* Main Table Section */}
      <div className="glass-card overflow-hidden animate-fade-in-up">
          <div className="p-5 border-b border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/20 backdrop-blur-md">
            {isAdmin && selectedIds.length > 0 ? (
                <div className="flex-1 flex items-center justify-between bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20 animate-fade-in-down">
                    <span className="font-bold text-emerald-700 text-sm flex items-center gap-2">
                        <CheckSquare size={18} className="text-emerald-600"/> เลือกอยู่ {selectedIds.length} รายการ
                    </span>
                    <button 
                        onClick={handleBulkForceReceive}
                        disabled={bulkLoading}
                        className="btn btn-sm btn-success shadow-md shadow-emerald-500/10"
                    >
                        {bulkLoading ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>} รับเรื่อง
                    </button>
                </div>
            ) : (
                <>
                    <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2"><ListFilter size={20} className="text-indigo-500"/> รายการหนังสือในระบบ</h2>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="ค้นหาชื่อเรื่อง, เลขที่..." 
                          className="modern-input !py-2 pl-9 w-full sm:w-64" 
                          value={searchTerm} 
                          onChange={(e) => { setSearchTerm(e.target.value); setTablePage(1); }} 
                        />
                    </div>
                </>
            )}
          </div>
          
          <div className="overflow-x-auto min-h-[300px]">
            <table className="modern-table">
              <thead>
                <tr>
                  {isAdmin && (
                      <th className="px-4 py-4 w-12 text-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={paginatedDocs.length > 0 && paginatedDocs.every(d => selectedIds.includes(d.id))}
                            onChange={() => toggleSelectAll(paginatedDocs)}
                          />
                      </th>
                  )}
                  <th className="px-6 py-4">เลขรับ</th>
                  <th className="px-6 py-4">เรื่อง</th>
                  <th className="px-6 py-4">ความเร่งด่วน</th>
                  <th className="px-6 py-4">เจ้าหน้าที่ผู้รับ</th>
                  <th className="px-6 py-4">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                        <span className="text-sm font-semibold text-slate-400">กำลังโหลดข้อมูล...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                          <FileText size={48} className="text-slate-300 stroke-[1.5] mb-2"/>
                          <span className="font-bold text-slate-500">ไม่พบข้อมูลในรายการ</span>
                          <span className="text-xs">ไม่มีเอกสารที่ตรงตามเงื่อนไขการค้นหาของคุณ</span>
                        </div>
                      </td>
                    </tr>
                ) : paginatedDocs.map((doc) => {
                    const priority = doc.priority || DocPriority.NORMAL;
                    const priorityConfig = PRIORITY_CONFIG[priority];
                    return (
                        <tr 
                          key={doc.id} 
                          className={`cursor-pointer group hover:bg-indigo-50/10 ${selectedIds.includes(doc.id) ? 'bg-indigo-500/5' : ''}`} 
                          onClick={() => navigate(`/document/${doc.id}`)}
                        >
                        {isAdmin && (
                            <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={selectedIds.includes(doc.id)}
                                    onChange={() => toggleSelectOne(doc.id)}
                                />
                            </td>
                        )}
                        <td className="px-6 py-4 font-bold text-indigo-600 whitespace-nowrap">{doc.book_no ? `${doc.book_no}/${doc.book_year}` : '-'}</td>
                        <td title={doc.subject} className="px-6 py-4 text-slate-800 truncate max-w-[300px] group-hover:text-indigo-700 font-bold">
                            {doc.subject}
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{doc.external_book_no}</div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm ${priorityConfig.color}`}>
                                {priority !== DocPriority.NORMAL && <Zap size={10}/>}
                                {priorityConfig.label}
                            </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600 whitespace-nowrap">{doc.recipient_name || '-'}</td>
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
             <div className="px-6 py-4 border-t border-slate-200/50 bg-slate-50/30">
                {renderPaginationControls(filteredDocs.length, tablePage, setTablePage, tableRowsPerPage, setTableRowsPerPage, "แถว")}
             </div>
          )}
      </div>
    </div>
  );
};

export default Dashboard;
