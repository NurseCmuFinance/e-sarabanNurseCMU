import React, { useState } from 'react';
import { submitExternalDocument } from '../services/mockService';
import { Send, CheckCircle, Upload, ArrowLeft, FileText, Loader2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const PublicSubmission: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    from: '',
    details: '',
    file: null as File | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const code = await submitExternalDocument(formData);
    setTrackingCode(code);
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
      return (
          <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
              {/* Ambient glows */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-emerald-100/30 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
                  <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-indigo-100/30 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4"></div>
              </div>

              <div className="glass-card max-w-md w-full border border-white/60 shadow-2xl p-8 md:p-10 text-center relative overflow-hidden rounded-3xl animate-fade-in-scale">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500"></div>

                  <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-200/30 shadow-inner relative animate-float">
                      <CheckCircle size={32} />
                      <div className="absolute inset-0 rounded-2xl border border-emerald-400/20 animate-ping opacity-75"></div>
                  </div>
                  
                  <h2 className="text-xl font-extrabold text-stone-850 mb-2">ส่งเรื่องคำร้องเรียบร้อยแล้ว</h2>
                  <p className="text-stone-500 text-xs font-semibold mb-8 max-w-xs mx-auto leading-relaxed">
                      เจ้าหน้าที่หน่วยงานสารบรรณ คณะพยาบาลศาสตร์ ได้รับเอกสารแล้วและจะดำเนินการพิจารณาโดยเร็วที่สุด
                  </p>
                  
                  <div className="bg-stone-50/50 border border-stone-200/60 shadow-inner rounded-2xl p-5 mb-6">
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider font-extrabold mb-1">รหัสติดตามเอกสาร (Tracking Code)</p>
                      <p className="text-2xl font-mono font-black text-indigo-600 tracking-widest uppercase selection:bg-indigo-100">{trackingCode}</p>
                  </div>
                  
                  <p className="text-[11px] text-stone-400 font-semibold mb-6">กรุณาบันทึกรหัสนี้ไว้เพื่อใช้ตรวจสอบสถานะการดำเนินงานของท่าน</p>
                  
                  <div className="pt-2 border-t border-stone-200/60 flex flex-col gap-3">
                      <button 
                          onClick={() => window.location.reload()} 
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors py-1.5"
                      >
                          + ยื่นคำร้องเรื่องอื่นเพิ่มเติม
                      </button>
                      <Link 
                          to="/public" 
                          className="text-[11px] font-bold text-stone-500 hover:text-stone-700 transition-colors"
                      >
                          ไปหน้าบริการติดตามสถานะ
                      </Link>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
          <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-purple-200/30 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4"></div>
      </div>

      <div className="text-center mb-6 relative z-10">
         <Link to="/" className="inline-flex items-center gap-1.5 text-stone-500 hover:text-indigo-600 font-bold text-xs transition-colors mb-4">
             <ArrowLeft size={14}/> กลับหน้าหลัก
         </Link>
         <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
             <Sparkles size={24} className="text-indigo-600 animate-float" />
             ยื่นหนังสือราชการออนไลน์
         </h1>
         <p className="text-stone-500 text-xs font-semibold mt-1">แบบฟอร์มยื่นคำเสนอแนะ เอกสาร หรือคำร้องทั่วไปสำหรับบุคคลภายนอก</p>
      </div>

      <div className="glass-card max-w-xl w-full border border-white/50 shadow-2xl overflow-hidden relative rounded-3xl z-10 animate-fade-in-scale">
         <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
         
         <div className="bg-stone-50/50 border-b border-stone-200/60 px-8 py-5">
              <h2 className="text-stone-850 font-extrabold text-sm flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" /> กรอกรายละเอียดคำขอ
              </h2>
         </div>

         <form onSubmit={handleSubmit} className="p-8 space-y-5">
             <div className="space-y-1.5">
                 <label className="modern-input-label px-1">ชื่อเรื่องติดต่อ (Subject) <span className="text-red-500">*</span></label>
                 <input 
                     type="text" 
                     required
                     className="modern-input font-bold"
                     placeholder="ระบุเรื่องที่ต้องการติดต่อ เช่น ขอความอนุเคราะห์สถานที่..."
                     value={formData.subject}
                     onChange={e => setFormData({...formData, subject: e.target.value})}
                 />
             </div>
             
             <div className="space-y-1.5">
                 <label className="modern-input-label px-1">จาก (ชื่อผู้ยื่น / หน่วยงานเจ้าของเรื่อง) <span className="text-red-500">*</span></label>
                 <input 
                     type="text" 
                     required
                     className="modern-input font-bold"
                     placeholder="ระบุชื่อจริง นามสกุล หรือหน่วยงานต้นสังกัดของคุณ"
                     value={formData.from}
                     onChange={e => setFormData({...formData, from: e.target.value})}
                 />
             </div>

             <div className="space-y-1.5">
                 <label className="modern-input-label px-1">รายละเอียดเพิ่มเติม</label>
                 <textarea 
                     rows={3}
                     className="modern-input min-h-[90px] font-semibold leading-relaxed"
                     placeholder="ระบุรายละเอียดเพิ่มเติม หรือคำร้องขอของคุณต่อหน่วยงาน..."
                     value={formData.details}
                     onChange={e => setFormData({...formData, details: e.target.value})}
                 ></textarea>
             </div>

             <div className="space-y-1.5">
                 <label className="modern-input-label px-1">แนบเอกสาร หรือหนังสือในรูปแบบไฟล์ PDF (ถ้ามี)</label>
                 <div className="border-2 border-dashed border-stone-200 hover:border-indigo-400 hover:bg-stone-50/40 rounded-2xl p-6 text-center transition-all cursor-pointer relative group">
                     <input 
                         type="file" 
                         accept=".pdf" 
                         className="absolute inset-0 opacity-0 cursor-pointer z-10"
                         onChange={e => e.target.files && setFormData({...formData, file: e.target.files[0]})}
                     />
                     <div className="flex flex-col items-center gap-2">
                         <div className="w-10 h-10 bg-stone-100 group-hover:bg-indigo-50 text-stone-400 group-hover:text-indigo-650 rounded-xl flex items-center justify-center transition-all shadow-sm border border-stone-200/50">
                             <Upload size={18}/>
                         </div>
                         <span className="text-xs font-bold text-stone-700 group-hover:text-indigo-600 transition-colors">
                             {formData.file ? formData.file.name : 'คลิกหรือลากไฟล์ PDF มาวางที่นี่เพื่ออัปโหลด'}
                         </span>
                         <span className="text-[10px] text-stone-400 font-semibold">รองรับไฟล์ประเภท PDF เท่านั้น ขนาดไม่เกิน 10MB</span>
                     </div>
                 </div>
             </div>

             <button 
                 type="submit" 
                 disabled={loading || !formData.subject || !formData.from}
                 className="w-full btn btn-primary font-bold py-3.5 shadow-lg shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none"
             >
                 {loading ? (
                     <>
                         <Loader2 className="animate-spin" size={18} />
                         กำลังส่งข้อมูลคำขอ...
                     </>
                 ) : (
                     <>
                         <Send size={18} /> 
                         ยื่นหนังสือเข้าระบบสารบรรณ
                     </>
                 )}
             </button>
         </form>
      </div>
      
      <p className="mt-8 text-[10px] text-stone-400 font-extrabold uppercase tracking-wide">© 2026 E-Saraban Nurse CMU Public System</p>
    </div>
  );
};

export default PublicSubmission;
