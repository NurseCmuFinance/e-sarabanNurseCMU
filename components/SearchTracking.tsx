import React, { useState } from 'react';
import { searchDocuments, getLogs } from '../services/mockService';
import { Document, DocumentLog } from '../types';
import { Search, Calendar, FileText, ArrowRight, User, Clock, Eye, CheckCircle, Loader2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useNavigate } from 'react-router-dom';

const SearchTracking: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Document[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [logs, setLogs] = useState<DocumentLog[]>([]);
  
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setSelectedDoc(null);
    const docs = await searchDocuments(query);
    setResults(docs);
    setSearched(true);
    setLoading(false);
  };

  const handleSelectDoc = async (doc: Document) => {
    setSelectedDoc(doc);
    const docLogs = await getLogs(doc.id);
    setLogs(docLogs);
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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center py-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">ค้นหาและติดตามสถานะ</h1>
        <p className="text-slate-500 font-semibold mt-1">กรอกเลขที่หนังสือ, เลขรับ, หรือชื่อเรื่อง เพื่อค้นหา</p>
      </div>

      {/* Search Box */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            className="w-full pl-12 pr-32 py-4 text-base border border-slate-200/60 rounded-full shadow-lg shadow-indigo-500/5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-white/80 backdrop-blur-md text-slate-800 font-semibold"
            placeholder="กรอกข้อมูลที่ต้องการค้นหา..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-indigo-600 to-accent hover:brightness-105 active:scale-97 text-white px-6 rounded-full font-bold shadow-md shadow-indigo-500/10 transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>}
            {loading ? 'กำลังค้น...' : 'ค้นหา'}
          </button>
        </form>
      </div>

      {/* Results */}
      {searched && !selectedDoc && (
        <div className="max-w-4xl mx-auto mt-8 stagger-children">
           <h3 className="font-bold text-slate-700 mb-4 px-1 flex items-center gap-2">
             ผลการค้นหา ({results.length} รายการ)
           </h3>
           {results.length === 0 ? (
             <div className="text-center p-12 glass-card text-slate-400 font-semibold italic flex flex-col items-center justify-center gap-2">
               <FileText size={40} className="opacity-25 mb-1 text-slate-500" />
               <span>ไม่พบเอกสารที่ตรงกับคำค้นหา</span>
             </div>
           ) : (
             <div className="space-y-3">
               {results.map(doc => (
                 <div 
                    key={doc.id} 
                    onClick={() => handleSelectDoc(doc)}
                    className="glass-card p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer transition-all flex items-center justify-between group"
                 >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                         <span className="font-black text-indigo-600 text-lg">เลขรับ {doc.book_no ? `${doc.book_no}/${doc.book_year}` : 'รอกดรับ'}</span>
                         <span className="text-slate-300 text-sm">|</span>
                         <span className="text-slate-500 font-bold text-xs">{doc.external_book_no || '-'}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 truncate pr-4 text-base group-hover:text-indigo-700 transition-colors">
                        {doc.subject}
                      </h4>
                      <div className="flex items-center gap-4 mt-2.5 text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1"><Calendar size={14} className="text-indigo-500"/> {new Date(doc.doc_date).toLocaleDateString('th-TH')}</span>
                        <span className="flex items-center gap-1"><User size={14} className="text-indigo-500"/> {doc.from_origin}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3.5">
                       <StatusBadge status={doc.status} />
                       <span className="text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all">
                         <ArrowRight size={18} />
                       </span>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}

      {/* Detail & Timeline View */}
      {selectedDoc && (
        <div className="max-w-4xl mx-auto mt-8 animate-fade-in-up">
           <button 
             onClick={() => setSelectedDoc(null)}
             className="text-indigo-600 hover:text-indigo-700 mb-5 flex items-center gap-1.5 text-sm font-bold active:scale-95 transition-all bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10 shadow-sm"
           >
             ← กลับไปผลการค้นหา
           </button>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Doc Info */}
              <div className="md:col-span-2 space-y-6">
                  <div className="glass-card p-6 overflow-hidden relative">
                    <div className="absolute right-6 top-6 opacity-5 pointer-events-none"><FileText size={100}/></div>
                    <div className="flex justify-between items-start gap-4 mb-6 relative z-10">
                       <h2 className="text-xl font-black text-slate-800 leading-snug tracking-tight">{selectedDoc.subject}</h2>
                       <StatusBadge status={selectedDoc.status} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm border-t border-slate-200/50 pt-5 relative z-10">
                      <div>
                        <p className="text-slate-400 font-bold mb-1 text-[10px] uppercase tracking-wider">เลขรับ</p>
                        <p className="font-extrabold text-indigo-650 text-lg">{selectedDoc.book_no ? `${selectedDoc.book_no}/${selectedDoc.book_year}` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold mb-1 text-[10px] uppercase tracking-wider">เลขที่หนังสือ</p>
                        <p className="font-bold text-slate-800">{selectedDoc.external_book_no || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold mb-1 text-[10px] uppercase tracking-wider">ลงวันที่</p>
                        <p className="font-bold text-slate-800">{new Date(selectedDoc.doc_date).toLocaleDateString('th-TH')}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold mb-1 text-[10px] uppercase tracking-wider">Tracking Code</p>
                        <p className="font-mono bg-indigo-500/5 px-2.5 py-1 rounded-lg border border-indigo-500/10 inline-block text-indigo-700 font-bold tracking-wider">{selectedDoc.tracking_code}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold mb-0.5 text-[10px] uppercase tracking-wider">จากหน่วยงาน</p>
                        <p className="font-bold text-slate-800">{selectedDoc.from_origin}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 font-bold mb-0.5 text-[10px] uppercase tracking-wider">ถึงเจ้าหน้าที่ผู้รับ</p>
                        <p className="font-bold text-slate-800">{selectedDoc.recipient_name || '-'}</p>
                      </div>
                    </div>

                    {/* Attachments Section */}
                    {(selectedDoc.attachment_url || selectedDoc.approved_attachment_url) && (
                        <div className="mt-6 pt-6 border-t border-slate-200/50">
                            <h4 className="font-black text-slate-700 mb-3.5 flex items-center gap-2 text-xs uppercase tracking-wide">
                              <FileText size={16} className="text-indigo-500"/> เอกสารแนบ
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(() => {
                                    if (!selectedDoc.attachment_url) return null;
                                    let parsed: { name: string, url: string }[] = [];
                                    try {
                                        if (selectedDoc.attachment_url.startsWith('[')) {
                                            parsed = JSON.parse(selectedDoc.attachment_url);
                                        } else {
                                            parsed = [{ name: 'เอกสารต้นฉบับ.pdf', url: selectedDoc.attachment_url }];
                                        }
                                    } catch (e) {
                                        parsed = [{ name: 'เอกสารต้นฉบับ.pdf', url: selectedDoc.attachment_url }];
                                    }

                                    return parsed.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-3.5 bg-white/60 border border-slate-200/50 rounded-xl min-w-0 shadow-sm">
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg shrink-0"><FileText size={16}/></div>
                                                <span className="text-xs font-bold text-slate-750 truncate" title={file.name}>{file.name}</span>
                                            </div>
                                            <button 
                                              onClick={() => openPdf(file.url)} 
                                              className="btn btn-sm btn-secondary shadow-sm"
                                            >
                                                <Eye size={14}/> เปิดดู
                                            </button>
                                        </div>
                                    ));
                                })()}
                                
                                {selectedDoc.approved_attachment_url && (
                                    <div className="flex items-center justify-between p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl min-w-0 sm:col-span-2 shadow-sm">
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0"><CheckCircle size={16}/></div>
                                            <span className="text-xs font-bold text-emerald-800 truncate" title="เอกสารอนุมัติ.pdf">เอกสารอนุมัติ.pdf</span>
                                        </div>
                                        <button 
                                          onClick={() => openPdf(selectedDoc.approved_attachment_url!)} 
                                          className="btn btn-sm btn-success shadow-sm"
                                        >
                                            <Eye size={14}/> เปิดดู
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                  </div>
              </div>

              {/* Timeline */}
              <div className="bg-white p-6 rounded-2xl border border-slate-250/50 shadow-md h-fit glass-card animate-fade-in-up">
                 <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200/50 pb-3">
                   <Clock size={18} className="text-indigo-500"/> ไทม์ไลน์ (Timeline)
                 </h3>
                 <div className="relative border-l border-slate-200 ml-2.5 space-y-6 pl-5 pt-1.5 pb-1.5">
                   {logs.length === 0 ? (
                       <p className="text-slate-400 text-xs italic font-semibold pl-1">ไม่มีประวัติการทำงาน</p>
                   ) : logs.map((log, index) => (
                     <div key={log.id} className="relative">
                        <div className={`absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm transition-all ${
                          index === 0 ? 'bg-indigo-650 ring-4 ring-indigo-500/10 scale-105' : 'bg-slate-300'
                        }`}></div>
                        <p className="text-[10px] text-slate-400 font-black tracking-wider mb-1 uppercase">
                          {new Date(log.timestamp).toLocaleString('th-TH')}
                        </p>
                        <p className="text-xs font-black text-slate-850 leading-snug">{log.action}</p>
                        <p className="text-[10px] text-slate-450 font-semibold mt-0.5">โดย: {log.actor_name}</p>
                        <p className="text-xs text-slate-600 mt-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/40 italic font-medium">{log.details}</p>
                     </div>
                   ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SearchTracking;