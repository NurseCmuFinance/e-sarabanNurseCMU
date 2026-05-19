import React, { useState } from 'react';
import { searchDocuments, getLogs } from '../services/mockService';
import { Document, DocumentLog } from '../types';
import { Search, Calendar, FileText, ArrowRight, User, Clock, Eye, CheckCircle } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">ค้นหาและติดตามสถานะ</h1>
        <p className="text-slate-500">กรอกเลขที่หนังสือ, เลขรับ, หรือชื่อเรื่อง เพื่อค้นหา</p>
      </div>

      {/* Search Box */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            className="w-full pl-12 pr-4 py-4 text-lg border border-slate-300 rounded-full shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
            placeholder="ค้นหา..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-full font-medium transition-colors"
          >
            {loading ? '...' : 'ค้นหา'}
          </button>
        </form>
      </div>

      {/* Results */}
      {searched && !selectedDoc && (
        <div className="max-w-4xl mx-auto mt-8">
           <h3 className="font-semibold text-slate-700 mb-4">ผลการค้นหา ({results.length} รายการ)</h3>
           {results.length === 0 ? (
             <div className="text-center p-8 bg-white rounded-xl border border-slate-200 text-slate-500">
               ไม่พบเอกสารที่ตรงกับคำค้นหา
             </div>
           ) : (
             <div className="space-y-3">
               {results.map(doc => (
                 <div 
                    key={doc.id} 
                    onClick={() => handleSelectDoc(doc)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all flex items-center justify-between group"
                 >
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-blue-600 text-lg">เลขรับ {doc.book_no}/{doc.book_year}</span>
                        <span className="text-slate-400 text-sm">|</span>
                        <span className="text-slate-600 font-medium">{doc.external_book_no}</span>
                     </div>
                     <h4 className="font-medium text-slate-800 truncate pr-4">{doc.subject}</h4>
                     <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                       <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(doc.doc_date).toLocaleDateString('th-TH')}</span>
                       <span className="flex items-center gap-1"><User size={14}/> {doc.from_origin}</span>
                     </div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={doc.status} />
                      <span className="text-slate-400 group-hover:translate-x-1 transition-transform">
                        <ArrowRight size={20} />
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
        <div className="max-w-4xl mx-auto mt-8">
           <button 
             onClick={() => setSelectedDoc(null)}
             className="text-slate-500 hover:text-blue-600 mb-4 flex items-center gap-1 text-sm font-medium"
           >
             ← กลับไปผลการค้นหา
           </button>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Doc Info */}
              <div className="md:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                       <h2 className="text-xl font-bold text-slate-800 leading-snug">{selectedDoc.subject}</h2>
                       <StatusBadge status={selectedDoc.status} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                      <div>
                        <p className="text-slate-500 mb-1">เลขรับ</p>
                        <p className="font-medium text-slate-900 text-lg">{selectedDoc.book_no ? `${selectedDoc.book_no}/${selectedDoc.book_year}` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">เลขที่หนังสือ</p>
                        <p className="font-medium text-slate-900">{selectedDoc.external_book_no || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">ลงวันที่</p>
                        <p className="font-medium text-slate-900">{new Date(selectedDoc.doc_date).toLocaleDateString('th-TH')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Tracking Code</p>
                        <p className="font-mono bg-slate-100 px-2 py-1 rounded inline-block text-slate-600">{selectedDoc.tracking_code}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-500 mb-1">จาก</p>
                        <p className="font-medium text-slate-900">{selectedDoc.from_origin}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-500 mb-1">ถึง</p>
                        <p className="font-medium text-slate-900">{selectedDoc.recipient_name || '-'}</p>
                      </div>
                    </div>

                    {/* Attachments Section */}
                    {(selectedDoc.attachment_url || selectedDoc.approved_attachment_url) && (
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide"><FileText size={16}/> เอกสารแนบ</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {selectedDoc.attachment_url && (
                                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-white rounded-lg border border-slate-200"><FileText size={16} className="text-blue-500"/></div>
                                            <span className="text-sm font-bold text-slate-700">เอกสารต้นฉบับ</span>
                                        </div>
                                        <button onClick={() => openPdf(selectedDoc.attachment_url!)} className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline bg-white px-2 py-1 rounded border border-blue-100 shadow-sm">
                                            <Eye size={14}/> เปิดดู
                                        </button>
                                    </div>
                                )}
                                {selectedDoc.approved_attachment_url && (
                                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-white rounded-lg border border-green-200"><CheckCircle size={16} className="text-green-500"/></div>
                                            <span className="text-sm font-bold text-green-800">ฉบับอนุมัติ</span>
                                        </div>
                                        <button onClick={() => openPdf(selectedDoc.approved_attachment_url!)} className="text-green-700 text-xs font-bold flex items-center gap-1 hover:underline bg-white px-2 py-1 rounded border border-green-200 shadow-sm">
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
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <Clock size={18} /> ไทม์ไลน์ (Timeline)
                 </h3>
                 <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                   {logs.length === 0 ? (
                       <p className="text-slate-400 text-sm italic pl-6">ไม่มีประวัติ</p>
                   ) : logs.map((log, index) => (
                     <div key={log.id} className="relative pl-6">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${index === 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                        <p className="text-xs text-slate-400 mb-1">
                          {new Date(log.timestamp).toLocaleString('th-TH')}
                        </p>
                        <p className="font-medium text-slate-800 text-sm">{log.action}</p>
                        <p className="text-xs text-slate-500 mt-1">โดย: {log.actor_name}</p>
                        <p className="text-sm text-slate-600 mt-1 bg-slate-50 p-2 rounded">{log.details}</p>
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