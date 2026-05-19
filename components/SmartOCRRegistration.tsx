import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw, Save, X, FileText, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { createDocument, getUsersForSelect, getMasterItems } from '../services/mockService';
import { Profile, DocPriority } from '../types';
import SearchableSelect from './SearchableSelect';

interface SmartOCRRegistrationProps {
  user: Profile;
}

const SmartOCRRegistration: React.FC<SmartOCRRegistrationProps> = ({ user }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    external_book_no: '',
    doc_date: '',
    subject: '',
    from_origin: '',
    to_recipient_id: '',
    remark: '',
    priority: DocPriority.NORMAL,
  });

  const [users, setUsers] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, agenciesData] = await Promise.all([
        getUsersForSelect(),
        getMasterItems('agencies')
      ]);
      setUsers(usersData);
      setAgencies(agenciesData);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    
    // Start processing immediately
    await processImage(file);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Extract just the base64 part
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const convertThaiDateToISO = (thaiDateStr: string) => {
    // Basic conversion logic for "23 กุมภาพันธ์ 2569" to "YYYY-MM-DD"
    // If it fails, return the original or empty
    if (!thaiDateStr) return '';
    try {
      const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
      ];
      const parts = thaiDateStr.trim().split(/\s+/);
      if (parts.length >= 3) {
        let day = parseInt(parts[0]).toString().padStart(2, '0');
        let monthIndex = months.findIndex(m => parts[1].includes(m));
        let month = (monthIndex + 1).toString().padStart(2, '0');
        let year = parseInt(parts[2]);
        if (year > 2500) year -= 543; // Convert Buddhist year to Gregorian
        
        if (monthIndex !== -1 && !isNaN(year)) {
          return `${year}-${month}-${day}`;
        }
      }
    } catch (e) {
      console.error("Date conversion error", e);
    }
    return ''; // Return empty to let user pick manually if parsing fails
  };

  const convertThaiNumerals = (text: string) => {
    if (!text) return '';
    const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return text.replace(/[๐-๙]/g, (match) => thaiNumerals.indexOf(match).toString());
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const base64Data = await fileToBase64(file);
      const apiKey = localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("ไม่พบ API Key สำหรับ Gemini กรุณาตั้งค่าในหน้าตั้งค่าการแจ้งเตือน (แท็บ Gemini API)");
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
        ทำหน้าที่เป็น OCR สกัดข้อมูลจากรูปภาพหนังสือราชการ (บันทึกข้อความ) ตามเงื่อนไขต่อไปนี้อย่างเคร่งครัด:
        1. เลขที่หนังสือ (external_book_no): มองหาหลังคำว่า "ที่" ตัดตัวอักษรภาษาไทยด้านหน้าสุดทิ้ง (เช่น "อว", "ศธ", "มท") ให้เหลือเฉพาะกลุ่มตัวเลขและเครื่องหมาย เช่น "8393(7.11.3)/ 12" แปลงเลขไทยเป็นอารบิกทั้งหมด
        2. ลงวันที่ (doc_date): มองหาหลังคำว่า "วันที่" บริเวณส่วนบนของเอกสาร แปลงเลขไทยเป็นอารบิก (เช่น 23 กุมภาพันธ์ 2569)
        3. เรื่อง (subject): มองหาหลังคำว่า "เรื่อง" ดึงข้อความมาทั้งหมดจนจบประโยค แปลงเลขไทยเป็นอารบิกทั้งหมด
        4. จาก (from_origin): มองหาหลังคำว่า "ส่วนงาน" หรือ "ส่วนราชการ" ตัดคำว่า "โทร.", "โทรศัพท์", "โทรสาร" และตัวเลขเบอร์โทรที่ตามหลังทิ้งทั้งหมด เอาเฉพาะชื่อหน่วยงาน
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data,
              },
            },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              external_book_no: { type: Type.STRING, description: "เลขที่หนังสือ (ตัดตัวอักษรไทยด้านหน้าออก แปลงเลขไทยเป็นอารบิก)" },
              doc_date: { type: Type.STRING, description: "วันที่ (เช่น 23 กุมภาพันธ์ 2569 แปลงเลขไทยเป็นอารบิก)" },
              subject: { type: Type.STRING, description: "เรื่อง (แปลงเลขไทยเป็นอารบิก)" },
              from_origin: { type: Type.STRING, description: "จากหน่วยงาน (ตัดเบอร์โทรออก)" }
            },
            required: ["external_book_no", "doc_date", "subject", "from_origin"]
          }
        }
      });

      const jsonStr = response.text?.trim() || "{}";
      const extractedData = JSON.parse(jsonStr);

      // Map to form data
      setFormData(prev => ({
        ...prev,
        external_book_no: convertThaiNumerals(extractedData.external_book_no || ''),
        doc_date: convertThaiDateToISO(extractedData.doc_date) || '',
        subject: convertThaiNumerals(extractedData.subject || ''),
        from_origin: extractedData.from_origin || '',
      }));

      setSuccess("สกัดข้อมูลสำเร็จ กรุณาตรวจสอบและแก้ไขข้อมูลให้ถูกต้องก่อนบันทึก");

    } catch (err: any) {
      console.error("OCR Error:", err);
      setError(`เกิดข้อผิดพลาดในการอ่านเอกสาร: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!formData.external_book_no || !formData.subject || !formData.to_recipient_id) {
      setError("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (เลขที่, เรื่อง, ผู้รับ)");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Prepare payload for createDocument
      const payload = {
        external_book_no: formData.external_book_no,
        doc_date: formData.doc_date || new Date().toISOString().split('T')[0],
        subject: formData.subject,
        from_origin: formData.from_origin,
        to_recipient_id: formData.to_recipient_id,
        remark: formData.remark,
        priority: formData.priority,
      };

      await createDocument(payload, user);
      
      setSuccess("บันทึกข้อมูลเข้าระบบสารบรรณเรียบร้อยแล้ว");
      
      // Reset form after 2 seconds
      setTimeout(() => {
        handleReset();
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({
      external_book_no: '',
      doc_date: '',
      subject: '',
      from_origin: '',
      to_recipient_id: '',
      remark: '',
      priority: DocPriority.NORMAL,
    });
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Step 1: Camera / Upload Mode
  if (!imagePreview) {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Camera className="text-blue-600" /> ลงทะเบียนรับหนังสือด้วยกล้อง (Smart OCR)
          </h1>
          <p className="text-slate-500 mt-1">ถ่ายรูปเอกสารเพื่อสกัดข้อมูลและกรอกฟอร์มอัตโนมัติ</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Camera size={48} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">ถ่ายรูปเอกสาร</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            กรุณาจัดวางเอกสารให้อยู่ในกรอบ แสงสว่างเพียงพอ และตัวหนังสือตั้งตรง เพื่อความแม่นยำในการอ่านข้อมูล
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Camera size={24} /> เปิดกล้อง / เลือกรูปภาพ
            </button>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    );
  }

  // Step 2 & 3: Processing & Review Mode
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> ตรวจสอบข้อมูล (Review & Edit)
          </h1>
          <p className="text-slate-500 mt-1">ตรวจสอบความถูกต้องและแก้ไขข้อมูลก่อนบันทึก</p>
        </div>
        <button 
          onClick={handleReset}
          className="px-4 py-2 text-slate-500 font-bold border rounded-xl hover:bg-slate-50 flex items-center gap-2 transition-colors"
        >
          <RefreshCw size={18} /> ถ่ายใหม่
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5"/> 
          <div>
            <span className="font-bold block mb-1">เกิดข้อผิดพลาด</span>
            {error}
          </div>
        </div>
      )}

      {success && !isProcessing && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm mb-6 border border-green-100 flex items-center gap-2">
          <CheckCircle2 size={20} className="shrink-0"/> <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Image Preview */}
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-inner relative flex items-center justify-center min-h-[400px] lg:min-h-[600px]">
          {isProcessing ? (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
              <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
              <p className="font-bold text-lg animate-pulse">กำลังสกัดข้อมูลด้วย AI...</p>
              <p className="text-slate-400 text-sm mt-2">โปรดรอสักครู่</p>
            </div>
          ) : null}
          <img 
            src={imagePreview} 
            alt="Document Preview" 
            className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${isProcessing ? 'opacity-30' : 'opacity-100'}`}
          />
        </div>

        {/* Right Side: Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex-1 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">เลขที่หนังสือ (ที่) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  value={formData.external_book_no}
                  onChange={e => setFormData({...formData, external_book_no: e.target.value})}
                  disabled={isProcessing || isSaving}
                  placeholder="เช่น 8393(7.11.3)/12"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">ลงวันที่</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  value={formData.doc_date}
                  onChange={e => setFormData({...formData, doc_date: e.target.value})}
                  disabled={isProcessing || isSaving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">เรื่อง <span className="text-red-500">*</span></label>
              <textarea 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24" 
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
                disabled={isProcessing || isSaving}
                placeholder="เรื่องของหนังสือ"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">จาก (หน่วยงานเจ้าของเรื่อง)</label>
              <SearchableSelect 
                  options={agencies.map(a => ({ id: a.name, label: a.name }))}
                  value={formData.from_origin}
                  onChange={(val) => setFormData({...formData, from_origin: val})}
                  placeholder="พิมพ์หรือเลือกหน่วยงาน..."
                  allowCustomInput={true}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">เจ้าหน้าที่ผู้รับหนังสือ <span className="text-red-500">*</span></label>
              <SearchableSelect 
                  options={users.map(u => ({ id: u.id, label: u.full_name, subLabel: u.department_name || 'ไม่ระบุหน่วยงาน' }))}
                  value={formData.to_recipient_id}
                  onChange={(val) => setFormData({...formData, to_recipient_id: val})}
                  placeholder="พิมพ์ค้นหาชื่อเจ้าหน้าที่..."
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">รายละเอียดเพิ่มเติม</label>
              <textarea 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-20" 
                value={formData.remark}
                onChange={e => setFormData({...formData, remark: e.target.value})}
                disabled={isProcessing || isSaving}
                placeholder="หมายเหตุ หรือรายละเอียดเพิ่มเติม..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">ความเร่งด่วน</label>
              <select 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value as DocPriority})}
                disabled={isProcessing || isSaving}
              >
                <option value={DocPriority.NORMAL}>ปกติ</option>
                <option value={DocPriority.URGENT}>ด่วน</option>
                <option value={DocPriority.EXPRESS}>ด่วนที่สุด</option>
              </select>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t flex gap-4">
            <button 
              onClick={handleReset}
              disabled={isProcessing || isSaving}
              className="flex-1 px-6 py-4 text-slate-600 font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button 
              onClick={handleSave}
              disabled={isProcessing || isSaving}
              className="flex-2 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              บันทึกข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartOCRRegistration;
