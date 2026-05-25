
import React, { useState, useEffect, useRef } from 'react';
import { getReportData, getUsers, getMasterItems } from '../services/mockService';
import { Document, Profile, DocStatus, MasterData, UserRole, DocPriority } from '../types';
import { Download, Printer, Filter, Calendar, AlertCircle, X, Info, Check, Search, ChevronDown, FileSpreadsheet, Loader2, FileText, ArrowLeft, Eye, Zap } from 'lucide-react';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../constants';
import * as XLSX from 'xlsx';

interface ReportsProps {
  user?: Profile;
  onBack?: () => void;
}

const Reports: React.FC<ReportsProps> = ({ user, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<MasterData[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Default startDate to current date (Today)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<DocStatus | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<DocPriority | ''>('');

  // Refs
  const recipientDropdownRef = useRef<HTMLDivElement>(null);
  const deptDropdownRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Multi-select state
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  useEffect(() => {
    const loadMasterData = async () => {
        try {
            const [u, d] = await Promise.all([getUsers(), getMasterItems('departments')]);
            setUsers(u);
            setDepartments(d);
        } catch (err: any) {
            setError(err.message);
        }
    };
    loadMasterData();
    handleGenerate();

    const handleClickOutside = (event: MouseEvent) => {
        if (recipientDropdownRef.current && !recipientDropdownRef.current.contains(event.target as Node)) {
            setShowRecipientDropdown(false);
        }
        if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target as Node)) {
            setShowDeptDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
        const data = await getReportData(
            startDate, 
            endDate, 
            selectedRecipientIds.length > 0 ? selectedRecipientIds : undefined, 
            selectedStatus || undefined,
            selectedDepartmentIds.length > 0 ? selectedDepartmentIds : undefined,
            user?.role === UserRole.USER ? user.id : undefined,
            selectedPriority || undefined
        );
        
        // Sort data by Year then Book No (Numeric Sort)
        const sortedData = (data || []).sort((a, b) => {
            if (a.book_year !== b.book_year) return a.book_year - b.book_year;
            const noA = a.book_no ?? Infinity;
            const noB = b.book_no ?? Infinity;
            if (noA !== noB) return noA - noB;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        setDocuments(sortedData);
    } catch (err: any) {
        setError(err.message || "ไม่สามารถดึงข้อมูลรายงานได้");
    } finally {
        setLoading(false);
    }
  };

  const handlePrint = () => {
      const printContent = document.getElementById('report-print-container');
      if (!printContent) return;

      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (!printWindow) {
          alert("กรุณาอนุญาต Pop-up เพื่อทำการพิมพ์");
          return;
      }

      const content = printContent.innerHTML;
      
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <title>Print Report</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { 
                font-family: 'Sarabun', sans-serif !important; 
                padding: 10px;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-color: white;
            }
            @page { size: landscape; margin: 5mm; } /* Narrow Margins */
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { 
                border: 1px solid #94a3b8; 
                padding: 6px 8px;
                font-family: 'Sarabun', sans-serif !important;
                font-size: 10pt;
                line-height: 1.4;
                vertical-align: top;
                word-wrap: break-word;
                overflow-wrap: break-word;
                word-break: break-word;
            }
            th { background-color: #f1f5f9; font-weight: bold; text-align: center; color: black; }
            td { color: black; }
            .subject-cell { 
                font-weight: normal; 
                white-space: normal; 
                text-align: left;
            }
            .qr-cell {
                padding: 2px !important;
                vertical-align: middle !important;
                text-align: center;
            }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = () => {
                setTimeout(() => {
                    window.print();
                }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
  };

  const handleOpenPDFWindow = () => {
    const printContent = document.getElementById('report-print-container');
    if (!printContent) return;

    const pdfWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!pdfWindow) {
        alert("กรุณาอนุญาต Pop-up เพื่อเปิดหน้าต่าง PDF");
        return;
    }

    const content = printContent.innerHTML;
    const filename = `Report_esaraban_${startDate}_to_${endDate}`;

    pdfWindow.document.open();
    pdfWindow.document.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <title>${filename}</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            /* Screen Styles (Preview Mode) */
            body { 
                font-family: 'Sarabun', sans-serif !important; 
                background-color: #525659;
                margin: 0;
                display: flex;
                flex-direction: column;
                height: 100vh;
                overflow: hidden;
            }
            .toolbar {
                background-color: #323639;
                color: white;
                padding: 1rem 2rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                z-index: 50;
                flex-shrink: 0;
            }
            .content-wrapper {
                flex: 1;
                overflow: auto;
                padding: 2rem;
                display: flex;
                justify-content: center;
                background-color: #525659;
            }
            .pdf-page {
                background-color: white;
                width: 297mm; /* A4 Landscape */
                min-height: 210mm;
                padding: 15px;
                box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);
                margin-bottom: 2rem;
            }
            
            /* Table Styling */
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { 
                border: 1px solid #94a3b8; 
                padding: 8px;
                font-size: 11pt;
                line-height: 1.4;
                vertical-align: top;
                word-wrap: break-word;
                color: black;
            }
            th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
            
            .subject-cell { 
                white-space: normal; 
                text-align: left;
            }
            .qr-cell {
                padding: 2px !important;
                vertical-align: middle !important;
                text-align: center;
            }

            /* Print Styles (The actual PDF generation) */
            @media print {
                @page { size: landscape; margin: 5mm; }
                body { 
                    background-color: white; 
                    height: auto; 
                    display: block; 
                    overflow: visible; 
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .toolbar { display: none !important; }
                .content-wrapper { 
                    padding: 0; 
                    display: block; 
                    overflow: visible; 
                    background: white; 
                }
                .pdf-page { 
                    width: 100%; 
                    box-shadow: none; 
                    margin: 0; 
                    padding: 0; 
                    min-height: auto; 
                }
                /* Hide scrollbars */
                ::-webkit-scrollbar { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:bold; font-size:1.1rem;">ตัวอย่างก่อนพิมพ์ (Print Preview)</span>
                <span style="font-size:0.8rem; color:#cbd5e1;">${filename}</span>
            </div>
            <button id="print-btn" class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v8H6z"></path></svg>
               พิมพ์ / บันทึกเป็น PDF
            </button>
          </div>
          
          <div class="content-wrapper">
            <div class="pdf-page">
                ${content}
            </div>
          </div>

          <script>
            document.getElementById('print-btn').addEventListener('click', function() {
                window.print();
            });
          </script>
        </body>
        </html>
    `);
    pdfWindow.document.close();
  };

  const exportToExcel = () => {
      if (documents.length === 0) return;
      
      const excelData = documents.map(doc => {
          const priority = doc.priority || DocPriority.NORMAL;
          return {
              'เลขรับ': doc.book_no ? `${doc.book_no}/${doc.book_year}` : doc.tracking_code,
              'เลขที่หนังสือ': doc.external_book_no || '-',
              'ลงวันที่': new Date(doc.doc_date).toLocaleDateString('th-TH'),
              'เรื่อง': doc.subject,
              'จากหน่วยงาน': doc.from_origin,
              'เจ้าหน้าที่ผู้รับ': doc.recipient_name || '-',
              'ความเร่งด่วน': PRIORITY_CONFIG[priority]?.label || 'ปกติ',
              'สถานะ': STATUS_CONFIG[doc.status]?.label || doc.status,
              'Tracking Code': doc.tracking_code,
              'หมายเหตุ/ลงนาม': doc.remark || ''
          };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      XLSX.writeFile(workbook, `Report_esaraban_${startDate}_to_${endDate}.xlsx`);
  };

  const toggleRecipient = (id: string) => {
      setSelectedRecipientIds(prev => 
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
  };

  const toggleDept = (id: string) => {
    setSelectedDepartmentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredUsers = users.filter(u => u.full_name.toLowerCase().includes(recipientSearch.toLowerCase()));
  const filteredDepts = departments.filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print animate-fade-in-down">
        <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack} 
                className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
                title="ย้อนกลับ"
              >
                <ArrowLeft size={24}/>
              </button>
            )}
            <div>
                <h1 className="text-2xl font-extrabold text-white">รายงาน (Reports)</h1>
                <p className="text-slate-400 font-medium text-sm mt-0.5">{user?.role === UserRole.USER ? 'สรุปการยื่นเรื่องของคุณ' : 'สรุปการรับ-ส่งเอกสารราชการ'}</p>
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
            <button 
                onClick={exportToExcel} 
                disabled={documents.length === 0 || loading}
                className="btn btn-success px-4 py-2.5 font-bold shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
            >
                <FileSpreadsheet size={18} /> Excel
            </button>
            <button 
                onClick={handlePrint} 
                disabled={documents.length === 0 || loading}
                className="px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 hover:shadow-lg transition-all active:scale-95 font-bold shadow-md disabled:opacity-50 border border-slate-700/50 flex items-center gap-2"
            >
                <Printer size={18} /> พิมพ์
            </button>
            <button 
                onClick={handleOpenPDFWindow} 
                disabled={documents.length === 0 || loading}
                className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl hover:bg-rose-500/20 flex items-center gap-2 transition-all active:scale-95 font-bold shadow-md disabled:opacity-50 hover:text-rose-200"
            >
                <FileText size={18} /> PDF
            </button>
        </div>
      </div>
 
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl flex items-center gap-3 animate-fade-in no-print">
            <AlertCircle size={20} className="text-red-400"/>
            <span className="font-bold">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto opacity-50 hover:opacity-100 text-white"><X size={18}/></button>
        </div>
      )}
 
      {/* Filter Section - No print */}
      <div className="glass-card border border-indigo-500/10 shadow-xl p-6 no-print bg-slate-900/40 backdrop-blur-md animate-fade-in-up">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-indigo-300 uppercase px-1 tracking-wider">ตั้งแต่วันที่</label>
            <input 
              type="date" 
              className="w-full px-4 py-2.5 border border-indigo-500/20 rounded-xl outline-none bg-slate-950/40 text-white focus:bg-slate-900/60 focus:border-indigo-500 transition-all font-medium" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-indigo-300 uppercase px-1 tracking-wider">ถึงวันที่</label>
            <input 
              type="date" 
              className="w-full px-4 py-2.5 border border-indigo-500/20 rounded-xl outline-none bg-slate-950/40 text-white focus:bg-slate-900/60 focus:border-indigo-500 transition-all font-medium" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
 
          <div className="space-y-1.5 relative" ref={deptDropdownRef}>
            <label className="text-xs font-extrabold text-indigo-300 uppercase px-1 tracking-wider">แผนก</label>
            <button 
              onClick={() => setShowDeptDropdown(!showDeptDropdown)} 
              className="w-full px-4 py-2.5 border border-indigo-500/20 rounded-xl bg-slate-950/40 text-white flex items-center justify-between text-sm font-medium hover:border-indigo-500/50 hover:bg-slate-900/40 transition-all"
            >
                <span className="truncate">{selectedDepartmentIds.length === 0 ? '-- ทั้งหมด --' : `${selectedDepartmentIds.length} แผนก`}</span>
                <ChevronDown size={16} className="text-slate-400" />
            </button>
            {showDeptDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/90 border border-indigo-500/20 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar backdrop-blur-xl animate-fade-in-scale">
                    {filteredDepts.length === 0 ? (
                        <p className="p-3 text-slate-500 text-xs text-center">ไม่พบแผนก</p>
                    ) : (
                        filteredDepts.map(dept => (
                            <label key={dept.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer text-white transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                                  checked={selectedDepartmentIds.includes(dept.id)} 
                                  onChange={() => toggleDept(dept.id)} 
                                />
                                <span className="text-sm font-medium">{dept.name}</span>
                            </label>
                        ))
                    )}
                </div>
            )}
          </div>
 
          <div className="space-y-1.5 relative" ref={recipientDropdownRef}>
            <label className="text-xs font-extrabold text-indigo-300 uppercase px-1 tracking-wider">ผู้รับ</label>
            <button 
              onClick={() => setShowRecipientDropdown(!showRecipientDropdown)} 
              className="w-full px-4 py-2.5 border border-indigo-500/20 rounded-xl bg-slate-950/40 text-white flex items-center justify-between text-sm font-medium hover:border-indigo-500/50 hover:bg-slate-900/40 transition-all"
            >
                <span className="truncate">{selectedRecipientIds.length === 0 ? '-- ทั้งหมด --' : `${selectedRecipientIds.length} รายชื่อ`}</span>
                <ChevronDown size={16} className="text-slate-400" />
            </button>
            {showRecipientDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/90 border border-indigo-500/20 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar backdrop-blur-xl animate-fade-in-scale">
                    {filteredUsers.length === 0 ? (
                        <p className="p-3 text-slate-500 text-xs text-center">ไม่พบรายชื่อ</p>
                    ) : (
                        filteredUsers.map(u => (
                            <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer text-white transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                                  checked={selectedRecipientIds.includes(u.id)} 
                                  onChange={() => toggleRecipient(u.id)} 
                                />
                                <span className="text-sm font-medium">{u.full_name}</span>
                            </label>
                        ))
                    )}
                </div>
            )}
          </div>
 
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-indigo-300 uppercase px-1 tracking-wider">ความเร่งด่วน</label>
            <select 
              className="w-full px-4 py-2.5 border border-indigo-500/20 rounded-xl outline-none bg-slate-950/40 text-white focus:bg-slate-900 focus:border-indigo-500 transition-all text-sm font-medium cursor-pointer" 
              value={selectedPriority} 
              onChange={e => setSelectedPriority(e.target.value as DocPriority)}
            >
              <option value="" className="bg-slate-900 text-white">-- ทั้งหมด --</option>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => <option key={key} value={key} className="bg-slate-900 text-white">{cfg.label}</option>)}
            </select>
          </div>
 
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-indigo-300 uppercase px-1 tracking-wider">สถานะ</label>
            <select 
              className="w-full px-4 py-2.5 border border-indigo-500/20 rounded-xl outline-none bg-slate-950/40 text-white focus:bg-slate-900 focus:border-indigo-500 transition-all text-sm font-medium cursor-pointer" 
              value={selectedStatus} 
              onChange={e => setSelectedStatus(e.target.value as DocStatus)}
            >
              <option value="" className="bg-slate-900 text-white">-- ทั้งหมด --</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key} className="bg-slate-900 text-white">{cfg.label}</option>)}
            </select>
          </div>
 
          <div className="lg:col-span-3 flex justify-center mt-4">
            <button 
              onClick={handleGenerate} 
              disabled={loading} 
              className="btn btn-primary px-10 py-3 font-bold w-full sm:w-auto justify-center shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={18}/> : <Filter size={18} />} แสดงข้อมูลรายงาน
            </button>
          </div>
        </div>
      </div>
 
      {/* Report View Area */}
      <div className="glass-card border border-indigo-500/10 overflow-hidden shadow-2xl animate-fade-in-up" ref={printAreaRef} id="report-print-container">
        <div className="p-10 flex flex-col items-center bg-slate-950/30 border-b border-indigo-500/10 text-center print:bg-white print:border-slate-300">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl border border-indigo-400/20 print:bg-slate-800 print:text-white print:border">E</div>
                <h2 className="font-extrabold text-white text-2xl print:text-black">ระบบสารบรรณอิเล็กทรอนิกส์ (E-Saraban)</h2>
            </div>
            <h3 className="font-bold text-slate-200 text-xl mb-1 print:text-slate-800">รายงานสรุปข้อมูลเอกสาร {user?.role === UserRole.USER ? `ของคุณ ${user.full_name}` : ''}</h3>
            <p className="text-slate-400 text-sm print:text-slate-500">ประจำวันที่ {new Date(startDate).toLocaleDateString('th-TH', { dateStyle: 'long' })} ถึง {new Date(endDate).toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
            <div className="mt-4 bg-indigo-500/10 px-4 py-1.5 rounded-full text-xs font-bold text-indigo-300 border border-indigo-500/20 uppercase print:bg-transparent print:border-none print:text-slate-600">
              รวมทั้งสิ้น {documents.length} รายการ
            </div>
        </div>
        
        <div className="p-4 print:p-0">
            <table className="modern-table text-sm text-left border-collapse pdf-optimized-table">
              <thead>
                <tr className="bg-slate-950/50 text-indigo-300 border-b border-indigo-500/10 print:bg-slate-100 print:text-black print:border-slate-300">
                  <th className="px-3 py-4 text-center" style={{ width: '50px' }}>ลำดับ</th>
                  <th className="px-3 py-4 text-center" style={{ width: '125px' }}>เลขรับ/ยื่น</th>
                  <th className="px-3 py-4 text-center" style={{ width: '110px' }}>ลงวันที่</th>
                  <th className="px-3 py-4" style={{ width: 'auto' }}>เรื่อง</th>
                  <th className="px-3 py-4" style={{ width: '180px' }}>ผู้รับ/เสนอ</th>
                  <th className="px-3 py-4 text-center" style={{ width: '90px' }}>ความเร่งด่วน</th>
                  <th className="px-3 py-4 text-center" style={{ width: '135px' }}>สถานะ</th>
                  <th className="px-3 py-4 text-center" style={{ width: '70px' }}>QR</th>
                  <th className="px-3 py-4 text-center" style={{ width: '120px' }}>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500 font-bold border border-indigo-500/5 print:border-slate-300">ไม่พบข้อมูลรายงานสำหรับเงื่อนไขนี้</td></tr>
                ) : documents.map((doc, idx) => {
                    const priority = doc.priority || DocPriority.NORMAL;
                    const isUrgent = priority !== DocPriority.NORMAL;
                    return (
                      <tr key={doc.id} className="border-b border-indigo-500/5 hover:bg-indigo-600/5 transition-all print:border-slate-200">
                        <td className="px-3 py-4 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="px-3 py-4 font-bold text-indigo-400 print:text-black text-center text-xs">
                          {doc.book_no ? `${doc.book_no}/${doc.book_year}` : doc.tracking_code}
                        </td>
                        <td className="px-3 py-4 text-slate-300 print:text-slate-700 text-center text-xs">{new Date(doc.doc_date).toLocaleDateString('th-TH')}</td>
                        <td className="px-3 py-4 text-white print:text-black subject-cell font-medium text-xs leading-relaxed">
                            {doc.subject}
                        </td>
                        <td className="px-3 py-4 text-slate-300 print:text-slate-700 text-xs">{doc.recipient_name || '-'}</td>
                        <td className="px-3 py-4 text-center text-xs">
                            {isUrgent ? (
                                <span className="text-red-400 font-bold flex items-center justify-center gap-1 print:text-red-600">
                                    <Zap size={12} className="print:hidden text-red-400"/> {PRIORITY_CONFIG[priority]?.label}
                                </span>
                            ) : (
                                <span className="text-slate-400 print:text-slate-500">{PRIORITY_CONFIG[priority]?.label}</span>
                            )}
                        </td>
                        <td className="px-3 py-4 text-center text-xs">
                            <span className="text-xs font-bold text-slate-300 print:text-slate-800 uppercase bg-slate-800/40 px-2.5 py-1 rounded-md border border-slate-700/50 print:bg-transparent print:border-none print:p-0">
                                {STATUS_CONFIG[doc.status]?.label || doc.status}
                            </span>
                        </td>
                        <td className="px-2 py-2 text-center qr-cell">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${doc.tracking_code}`} 
                                alt="QR" 
                                className="border border-indigo-500/25 rounded-md p-0.5 bg-white print:border-none print:p-0"
                                style={{ width: '40px', height: '40px', display: 'block', margin: '0 auto' }} 
                            />
                        </td>
                        <td className="px-3 py-4 text-left text-xs text-slate-400 print:text-slate-600 break-words whitespace-pre-wrap leading-relaxed">
                            {doc.remark || '-'}
                        </td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
        </div>
      </div>
 
      <style>{`
        .subject-cell { 
            white-space: normal; 
            text-align: left;
        }
        .qr-cell {
            padding: 2px !important;
            vertical-align: middle !important;
            text-align: center;
        }
 
        @media print {
            @page {
                size: landscape;
                margin: 5mm; /* Narrow Margin */
            }
            
            body {
                background-color: white !important;
            }
 
            /* Hide Sidebar, Header, and Filter controls */
            body > * {
                visibility: hidden;
            }
 
            /* Show only the report container */
            #report-print-container, #report-print-container * {
                visibility: visible;
            }
 
            #report-print-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                margin: 0;
                padding: 0;
                border: none !important;
                box-shadow: none !important;
                background-color: white !important;
            }
 
            .no-print {
                display: none !important;
            }
            
            /* Table Styling for Print */
            table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
            }
            
            th, td {
                border: 1px solid #94a3b8 !important; /* slate-400 */
                padding: 6px 8px !important;
                font-family: 'Sarabun', sans-serif !important;
                font-size: 10pt !important;
                line-height: 1.4 !important;
                vertical-align: top !important;
                color: black !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-word !important;
            }
 
            th {
                background-color: #f1f5f9 !important; /* slate-100 */
                font-weight: bold !important;
                text-align: center !important;
            }
            
            .subject-cell {
                font-weight: normal !important;
                white-space: normal !important;
                text-align: left !important;
            }
 
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                font-family: 'Sarabun', sans-serif !important;
            }
        }
      `}</style>
    </div>
  );
};

export default Reports;
