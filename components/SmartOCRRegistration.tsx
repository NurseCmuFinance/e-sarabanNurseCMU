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
      const apiKey = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
      
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
        model: 'gemini-3.5-flash',
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
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <Camera className="text-indigo-600 animate-float animate-pulse" size={28} />
            ลงทะเบียนรับหนังสือด้วยกล้อง (Smart OCR)
          </h1>
          <p className="text-stone-500 text-sm font-medium mt-1">ถ่ายรูปเอกสารเพื่อสกัดข้อมูลและกรอกฟอร์มอัตโนมัติด้วย AI Gemini</p>
        </div>

        <div className="glass-card p-10 text-center border border-white/50 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 text-indigo-600 rounded-full flex items-center justify-center mb-6 border border-indigo-200/30 shadow-inner relative animate-float">
            <Camera size={44} className="text-indigo-600" />
            <div className="absolute inset-0 rounded-full border border-indigo-400/20 animate-ping opacity-75"></div>
          </div>
          
          <h2 className="text-xl font-extrabold text-stone-800 mb-2">ถ่ายรูปหรืออัปโหลดเอกสาร</h2>
          <p className="text-stone-500 text-xs font-semibold mb-8 max-w-md leading-relaxed">
            กรุณาจัดวางเอกสาร (เช่น ใบเสนอราคา บันทึกข้อความ) ให้อยู่ในกรอบ มีแสงสว่างเพียงพอ และตัวหนังสือตั้งตรง เพื่อความแม่นยำสูงสุดในการประมวลผลด้วยปัญญาประดิษฐ์
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary font-bold px-8 py-4 shadow-lg shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center justify-center gap-2.5 w-full sm:w-auto"
            >
              <Camera size={20} /> เปิดกล้อง / เลือกรูปภาพ
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
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <FileText className="text-indigo-600 animate-float" size={28} />
            ตรวจสอบข้อมูลและสแกนด้วย AI (Review & Edit)
          </h1>
          <p className="text-stone-500 text-sm font-medium mt-1">สกัดข้อมูลสำเร็จแล้ว ตรวจสอบความถูกต้องและปรับแต่งรายละเอียดก่อนบันทึกเข้าระบบ</p>
        </div>
        <button 
          onClick={handleReset}
          className="btn text-stone-600 font-bold border border-stone-200 hover:bg-stone-50/80 rounded-xl px-4 py-2.5 flex items-center gap-2 transition-all text-xs"
        >
          <RefreshCw size={14} className="animate-spin-slow" /> ถ่ายใหม่ / อัปโหลดใหม่
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-xs mb-6 border border-rose-200 flex items-start gap-3 animate-fade-in">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-500"/> 
          <div>
            <span className="font-extrabold block mb-1">เกิดข้อผิดพลาดในการสกัดข้อมูล</span>
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        </div>
      )}

      {success && !isProcessing && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-xs mb-6 border border-emerald-200 flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-500"/> 
          <span className="font-extrabold">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Image Preview */}
        <div className="lg:col-span-5 glass-card p-4 overflow-hidden border border-white/50 shadow-xl flex items-center justify-center min-h-[400px] lg:min-h-[560px] bg-stone-900/90 relative rounded-2xl group">
          {isProcessing ? (
            <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-md flex flex-col items-center justify-center text-white z-10 p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 border border-white/10 shadow-lg animate-spin">
                <Loader2 size={32} className="animate-spin text-white" />
              </div>
              <p className="font-extrabold text-lg bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-transparent animate-pulse">
                กำลังวิเคราะห์และสกัดข้อมูลด้วย Gemini AI...
              </p>
              <p className="text-stone-400 text-xs font-semibold mt-2 leading-relaxed max-w-xs">
                ระบบกำลังอ่านลายมือ เขียนเลขที่หนังสือ วันที่ และหัวข้อหลักอย่างชาญฉลาด
              </p>
            </div>
          ) : null}
          <img 
            src={imagePreview} 
            alt="Document Preview" 
            className={`max-w-full max-h-[500px] lg:max-h-[520px] object-contain rounded-lg shadow-lg border border-white/10 transition-all duration-500 ${isProcessing ? 'opacity-20 scale-95' : 'opacity-100 scale-100 hover:scale-[1.02]'}`}
          />
        </div>

        {/* Right Side: Form */}
        <div className="lg:col-span-7 glass-card p-6 md:p-8 border border-white/50 shadow-xl flex flex-col rounded-2xl">
          <div className="border-b border-stone-200/60 pb-4 mb-6">
            <h3 className="text-base font-extrabold text-stone-850 flex items-center gap-2">
              <FileText className="text-indigo-650" size={20}/> ข้อมูลที่สกัดได้จากเอกสาร
            </h3>
            <p className="text-xs text-stone-500 font-medium mt-1">กรุณาตรวจสอบความถูกต้องของข้อมูลที่ AI อ่านได้ หากไม่ตรงท่านสามารถแก้ไขได้ทันที</p>
          </div>

          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="modern-input-label px-1">เลขที่หนังสือภายนอก (ที่) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="modern-input font-semibold" 
                  value={formData.external_book_no}
                  onChange={e => setFormData({...formData, external_book_no: e.target.value})}
                  disabled={isProcessing || isSaving}
                  placeholder="เช่น 8393(7.11.3)/12"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="modern-input-label px-1">ลงวันที่ในหนังสือ</label>
                <input 
                  type="date" 
                  className="modern-input font-semibold text-stone-700" 
                  value={formData.doc_date}
                  onChange={e => setFormData({...formData, doc_date: e.target.value})}
                  disabled={isProcessing || isSaving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="modern-input-label px-1">เรื่อง / หัวข้อหนังสือ <span className="text-red-500">*</span></label>
              <textarea 
                className="modern-input min-h-[90px] font-semibold leading-relaxed" 
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
                disabled={isProcessing || isSaving}
                placeholder="เรื่องของหนังสือที่แสดงบนเอกสาร..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="modern-input-label px-1">จาก (หน่วยงานเจ้าของเรื่อง)</label>
              <SearchableSelect 
                  options={agencies.map(a => ({ id: a.name, label: a.name }))}
                  value={formData.from_origin}
                  onChange={(val) => setFormData({...formData, from_origin: val})}
                  placeholder="พิมพ์หรือเลือกหน่วยงานเจ้าของเรื่อง..."
                  allowCustomInput={true}
              />
            </div>

            <div className="space-y-1.5">
              <label className="modern-input-label px-1">ส่งถึง / เจ้าหน้าที่ผู้รับหนังสือ <span className="text-red-500">*</span></label>
              <SearchableSelect 
                  options={users.map(u => ({ id: u.id, label: u.full_name, subLabel: u.department_name || 'ไม่ระบุหน่วยงาน' }))}
                  value={formData.to_recipient_id}
                  onChange={(val) => setFormData({...formData, to_recipient_id: val})}
                  placeholder="พิมพ์ค้นหาชื่อเจ้าหน้าที่ผู้รับ..."
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="modern-input-label px-1">รายละเอียดเพิ่มเติม / หมายเหตุ</label>
              <textarea 
                className="modern-input min-h-[70px] font-medium text-xs leading-relaxed" 
                value={formData.remark}
                onChange={e => setFormData({...formData, remark: e.target.value})}
                disabled={isProcessing || isSaving}
                placeholder="หมายเหตุ หรือคำสั่งการเพิ่มเติม (ถ้ามี)..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="modern-input-label px-1">ความเร่งด่วน</label>
              <div className="relative">
                <select 
                  className="modern-input font-bold appearance-none cursor-pointer pr-10"
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value as DocPriority})}
                  disabled={isProcessing || isSaving}
                >
                  <option value={DocPriority.NORMAL}>🟢 ปกติ</option>
                  <option value={DocPriority.URGENT}>🟡 ด่วน</option>
                  <option value={DocPriority.EXPRESS}>🔴 ด่วนที่สุด</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-500">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-stone-200/60 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleReset}
              disabled={isProcessing || isSaving}
              className="btn text-stone-600 font-bold border border-stone-200 hover:bg-stone-50/80 rounded-xl px-6 py-3.5 transition-all text-xs flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <X size={16} /> ยกเลิก
            </button>
            <button 
              onClick={handleSave}
              disabled={isProcessing || isSaving || !formData.external_book_no || !formData.subject || !formData.to_recipient_id}
              className="btn btn-primary font-bold px-8 py-3.5 shadow-lg shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 text-xs flex-[2] flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              บันทึกข้อมูลเข้าระบบสารบรรณ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartOCRRegistration;
