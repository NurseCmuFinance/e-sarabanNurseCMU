
import React, { useState } from 'react';
import { submitExternalDocument } from '../services/mockService';
import { Send, CheckCircle, Upload } from 'lucide-react';

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
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">ส่งเรื่องเรียบร้อยแล้ว</h2>
                  <p className="text-slate-500 mb-6">เจ้าหน้าที่จะทำการตรวจสอบและดำเนินการโดยเร็วที่สุด</p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Tracking Code ของคุณ</p>
                      <p className="text-3xl font-mono font-bold text-blue-600">{trackingCode}</p>
                  </div>
                  
                  <p className="text-sm text-slate-400 mb-6">กรุณาบันทึกรหัสนี้ไว้เพื่อติดตามสถานะเอกสาร</p>
                  
                  <button onClick={() => window.location.reload()} className="text-blue-600 font-medium hover:underline">
                      ส่งเรื่องอื่นเพิ่มเติม
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="text-center mb-8">
         <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold mx-auto mb-3 text-xl">E</div>
         <h1 className="text-3xl font-bold text-slate-800">ยื่นหนังสือราชการออนไลน์</h1>
         <p className="text-slate-500 mt-2">สำหรับบุคคลทั่วไปติดต่อหน่วยงาน</p>
      </div>

      <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 px-8 py-4">
             <h2 className="text-white font-semibold">แบบฟอร์มส่งหนังสือ</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">ชื่อเรื่อง (Subject) <span className="text-red-500">*</span></label>
                <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="ระบุเรื่องที่ต้องการติดต่อ"
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                />
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">จาก (ผู้ส่ง/หน่วยงาน) <span className="text-red-500">*</span></label>
                <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="ระบุชื่อของคุณ หรือหน่วยงาน"
                    value={formData.from}
                    onChange={e => setFormData({...formData, from: e.target.value})}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">รายละเอียดเพิ่มเติม</label>
                <textarea 
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.details}
                    onChange={e => setFormData({...formData, details: e.target.value})}
                ></textarea>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">แนบไฟล์ PDF (ถ้ามี)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <input 
                        type="file" 
                        accept=".pdf" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={e => e.target.files && setFormData({...formData, file: e.target.files[0]})}
                    />
                    <div className="flex flex-col items-center gap-2">
                        <Upload size={24} className="text-slate-400"/>
                        <span className="text-sm text-slate-600">{formData.file ? formData.file.name : 'คลิกเพื่อเลือกไฟล์'}</span>
                    </div>
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
                {loading ? 'กำลังส่งข้อมูล...' : <><Send size={20} /> ส่งเรื่อง</>}
            </button>
        </form>
      </div>
      
      <p className="mt-8 text-xs text-slate-400">© 2024 E-Saraban Government System</p>
    </div>
  );
};

export default PublicSubmission;
