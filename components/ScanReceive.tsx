
import React, { useState, useEffect, useRef } from 'react';
import { getDocumentByTrackingCode, updateDocumentStatus } from '../services/mockService';
import { Document, DocStatus, Profile, UserRole } from '../types';
import { QrCode, Search, CheckCircle, AlertCircle, Loader2, Camera, X, RefreshCw } from 'lucide-react';
import StatusBadge from './StatusBadge';
// @ts-ignore
import { Html5Qrcode } from 'html5-qrcode';

interface ScanReceiveProps {
  user: Profile;
}

const ScanReceive: React.FC<ScanReceiveProps> = ({ user }) => {
  const [scanCode, setScanCode] = useState('');
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const scannerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  const startScanner = async () => {
    if (!mountedRef.current) return;
    setError(null);
    setCameraReady(false);

    // Cleanup existing instance if any
    if (scannerRef.current) {
        try {
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }
            scannerRef.current.clear();
        } catch (e) {
            console.error("Cleanup error:", e);
        }
        scannerRef.current = null;
    }

    // Give DOM time to update
    await new Promise(r => setTimeout(r, 100));
    if (!document.getElementById("reader")) return;

    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    const qrCodeSuccessCallback = (decodedText: string) => {
         if (decodedText) {
            setScanCode(decodedText);
            handleSearch(undefined, decodedText);
            
            // Pause to avoid multiple scans of same code
            try {
                html5QrCode.pause();
            } catch(e) {}
            
            setTimeout(() => {
                try { 
                    if (mountedRef.current && scannerRef.current) html5QrCode.resume(); 
                } catch(e) {}
            }, 2000);
        }
    };

    try {
        // Step 1: Enumerate cameras first. This triggers permission request implicitly.
        // This prevents "NotFoundError" when requesting specific constraints on devices that don't match them.
        const devices = await Html5Qrcode.getCameras();

        if (devices && devices.length > 0) {
            // Devices found. Try to start scanning.
            
            try {
                // Attempt 1: Try Environment/Back Camera using constraints (Preferred for mobile)
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    config, 
                    qrCodeSuccessCallback, 
                    () => {}
                );
            } catch (configError) {
                console.warn("Environment camera constraint failed, trying specific device...", configError);
                
                // Attempt 2: Fallback to the first available device ID
                // This bypasses "NotFoundError" related to facingMode constraints on laptops/webcams
                const firstDeviceId = devices[0].id;
                await html5QrCode.start(
                    firstDeviceId, 
                    config, 
                    qrCodeSuccessCallback, 
                    () => {}
                );
            }

            if (mountedRef.current) {
                setCameraReady(true);
                setPermissionGranted(true);
            }
        } else {
            throw new Error("ไม่พบกล้องในอุปกรณ์นี้ (No cameras found)");
        }
    } catch (err: any) {
        console.error("Camera start error:", err);
        if (mountedRef.current) {
            let msg = "ไม่สามารถเปิดกล้องได้";
            // Check specific error types
            if (err?.name === 'NotAllowedError' || err?.message?.includes('permission')) {
                msg = "กรุณาอนุญาตสิทธิ์การใช้งานกล้องในเบราว์เซอร์";
            } else if (err?.name === 'NotFoundError' || err?.message?.includes('found')) {
                msg = "ไม่พบกล้องในอุปกรณ์นี้";
            } else if (err?.message) {
                msg = `เกิดข้อผิดพลาด: ${err.message}`;
            }
            setError(msg);
        }
    }
  };

  // Initialize Scanner on Mount
  useEffect(() => {
    mountedRef.current = true;
    
    // Slight delay to ensure render
    const timer = setTimeout(() => {
        startScanner();
    }, 500);

    return () => {
        mountedRef.current = false;
        clearTimeout(timer);
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch((e: any) => console.error("Stop error", e));
                }
                scannerRef.current.clear();
            } catch (e) { console.error("Unmount cleanup error", e); }
        }
    };
  }, []);

  const handleSearch = async (e?: React.FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault();
    
    const code = codeOverride || scanCode;
    if (!code || !code.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setDoc(null);

    try {
        const foundDoc = await getDocumentByTrackingCode(code.trim());
        
        if (foundDoc) {
            // Check permissions based on Role
            if (user.role === UserRole.ADMIN) {
                setDoc(foundDoc);
            } else if (user.role === UserRole.STAFF) {
                if (foundDoc.to_recipient_id === user.id) {
                    setDoc(foundDoc);
                } else {
                    setError(`ไม่พบเอกสาร หรือคุณไม่มีสิทธิ์รับเอกสารนี้ (เอกสารส่งถึง: ${foundDoc.recipient_name})`);
                }
            } else {
                setError("ไม่มีสิทธิ์ใช้งานฟังก์ชันนี้");
            }
        } else {
            setError("ไม่พบเอกสารที่มีรหัสนี้ในระบบ");
        }
    } catch (err: any) {
        setError("ไม่พบข้อมูล หรือรหัสไม่ถูกต้อง");
    } finally {
        setLoading(false);
    }
  };

  const handleConfirmReceive = async () => {
    if (!doc) return;
    setProcessing(true);
    try {
        await updateDocumentStatus(doc.id, DocStatus.REGISTERED, user, "รับเข้าสารบรรณผ่านระบบสแกน QR Code");
        setSuccessMsg(`รับหนังสือเลขที่ ${doc.book_no}/${doc.book_year} เรียบร้อยแล้ว`);
        setDoc(null);
        setScanCode('');
        
        // Resume scanner if it was paused
        if (scannerRef.current) {
            try { scannerRef.current.resume(); } catch(e) {}
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setProcessing(false);
    }
  };

  const handleClear = () => {
      setScanCode('');
      setDoc(null);
      setError(null);
      setSuccessMsg(null);
      if (inputRef.current) inputRef.current.focus();
      if (scannerRef.current) {
          try { scannerRef.current.resume(); } catch(e) {}
      }
  };

  const handleRetryCamera = () => {
      setError(null);
      startScanner();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
         <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <QrCode size={32} />
         </div>
         <h1 className="text-2xl font-bold text-slate-800">สแกนรับหนังสือ (Scan to Receive)</h1>
         <p className="text-slate-500">ส่องกล้องไปที่ QR Code เพื่อรับหนังสือเข้าระบบอัตโนมัติ</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
         {/* Camera Viewport */}
         <div className="relative bg-black min-h-[300px] flex flex-col items-center justify-center overflow-hidden">
            {!cameraReady && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-10 bg-slate-900">
                    <Loader2 size={48} className="animate-spin mb-4"/>
                    <p>กำลังเปิดกล้อง...</p>
                </div>
            )}
            
            {/* The div where html5-qrcode renders the video */}
            <div id="reader" className="w-full h-full"></div>

            {error && (error.includes('กล้อง') || error.includes('Permission') || error.includes('found')) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center z-20">
                    <Camera size={48} className="mb-4 opacity-50"/>
                    <p className="mb-4 font-bold">{error}</p>
                    <p className="text-xs text-slate-400 mb-6">หากใช้บนมือถือ โปรดตรวจสอบว่าอนุญาตให้เบราว์เซอร์เข้าถึงกล้องแล้ว</p>
                    <button onClick={handleRetryCamera} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-colors">
                        <RefreshCw size={18}/> ลองเปิดกล้องใหม่
                    </button>
                </div>
            )}
         </div>

         <div className="p-8 space-y-6 relative -mt-4 bg-white rounded-t-3xl z-10">
            <form onSubmit={(e) => handleSearch(e)} className="relative">
                <input 
                    ref={inputRef}
                    type="text" 
                    className="w-full pl-12 pr-4 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-mono font-bold text-center tracking-wider uppercase"
                    placeholder="SCANNING..."
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    autoComplete="off"
                />
                <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                {scanCode && (
                    <button type="button" onClick={handleClear} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                )}
            </form>

            <button 
                onClick={() => handleSearch()} 
                disabled={loading || !scanCode}
                className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={20}/> : <Search size={20}/>} ค้นหาด้วยรหัส
            </button>

            {error && (!error.includes('กล้อง') && !error.includes('Permission') && !error.includes('found')) && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={24} className="shrink-0"/>
                    <span className="font-bold">{error}</span>
                </div>
            )}

            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle size={24} className="shrink-0"/>
                    <span className="font-bold">{successMsg}</span>
                </div>
            )}
         </div>
      </div>

      {doc && (
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle size={20}/> พบเอกสารในระบบ</h3>
                <StatusBadge status={doc.status} />
            </div>
            <div className="p-6 space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-1">{doc.subject}</h2>
                    <p className="text-slate-500 text-sm">เลขที่หนังสือ: <span className="font-bold text-slate-700">{doc.external_book_no || '-'}</span> | ลงวันที่: {new Date(doc.doc_date).toLocaleDateString('th-TH')}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                    <div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase">จากหน่วยงาน</p>
                        <p className="font-bold text-slate-800">{doc.from_origin}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase">ถึงเจ้าหน้าที่</p>
                        <p className="font-bold text-slate-800">{doc.recipient_name}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase">Tracking Code</p>
                        <p className="font-mono font-bold text-blue-600">{doc.tracking_code}</p>
                    </div>
                    <div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase">เลขรับปัจจุบัน</p>
                        <p className="font-bold text-slate-800">{doc.book_no ? `${doc.book_no}/${doc.book_year}` : '-'}</p>
                    </div>
                </div>

                <div className="pt-2">
                    {doc.status === DocStatus.REGISTERED ? (
                         <button disabled className="w-full bg-slate-100 text-slate-400 py-3 rounded-xl font-bold cursor-not-allowed border border-slate-200">
                            เอกสารนี้ถูกรับเข้าระบบแล้ว
                         </button>
                    ) : (
                        <button 
                            onClick={handleConfirmReceive}
                            disabled={processing}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
                        >
                            {processing ? <Loader2 className="animate-spin" size={24}/> : <CheckCircle size={24}/>} ยืนยันการรับหนังสือ (Register)
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ScanReceive;
