
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
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="text-center space-y-3 page-header">
         <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-indigo-200/50 border border-indigo-400/30 animate-float">
            <QrCode size={30} />
         </div>
         <h1 className="page-title bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent inline-block font-extrabold text-3xl">
            สแกนรับหนังสือ (Scan to Receive)
         </h1>
         <p className="text-stone-500 text-sm font-medium">ส่องกล้องไปที่ QR Code หรือระบุรหัสเพื่อรับหนังสือเข้าระบบอัตโนมัติ</p>
      </div>

      <div className="glass-card overflow-hidden border border-white/50 shadow-xl">
         {/* Camera Viewport with Glass Border Overlay */}
         <div className="relative bg-stone-950 min-h-[300px] flex flex-col items-center justify-center overflow-hidden border-b border-stone-200/60">
            {!cameraReady && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 z-10 bg-stone-900/90 backdrop-blur-md">
                    <Loader2 size={40} className="animate-spin mb-3 text-indigo-400"/>
                    <p className="text-sm font-bold tracking-wider">กำลังเปิดกล้อง...</p>
                </div>
            )}
            
            {/* The div where html5-qrcode renders the video */}
            <div id="reader" className="w-full h-full"></div>

            {error && (error.includes('กล้อง') || error.includes('Permission') || error.includes('found')) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/95 text-white p-8 text-center z-20 backdrop-blur-sm">
                    <Camera size={44} className="mb-3 opacity-60 text-indigo-400"/>
                    <p className="mb-3 font-bold text-sm leading-relaxed">{error}</p>
                    <p className="text-xs text-stone-400 mb-5 max-w-xs leading-relaxed">หากใช้บนมือถือ โปรดตรวจสอบว่าได้อนุญาตให้เบราว์เซอร์เข้าถึงกล้องและรีเฟรชหน้าจอแล้ว</p>
                    <button 
                        onClick={handleRetryCamera} 
                        className="btn btn-secondary font-bold text-xs flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 bg-white text-stone-900 border-none hover:bg-stone-200 shadow-md"
                    >
                        <RefreshCw size={15}/> ลองเปิดกล้องใหม่
                    </button>
                </div>
            )}
         </div>

         <div className="p-6 space-y-5 relative -mt-4 bg-white rounded-t-3xl border-t border-white/60 z-10 shadow-inner">
            <form onSubmit={(e) => handleSearch(e)} className="relative">
                <input 
                    ref={inputRef}
                    type="text" 
                    className="w-full pl-12 pr-12 py-3.5 text-lg border-2 border-stone-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100/50 outline-none transition-all font-mono font-bold text-center tracking-widest uppercase bg-stone-50/50"
                    placeholder="รหัสหนังสือ / SCANNING..."
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    autoComplete="off"
                />
                <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={22} />
                {scanCode && (
                    <button 
                        type="button" 
                        onClick={handleClear} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                )}
            </form>

            <button 
                onClick={() => handleSearch()} 
                disabled={loading || !scanCode}
                className="w-full btn btn-primary py-3.5 rounded-xl font-bold hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>} ค้นหาเอกสาร
            </button>

            {error && (!error.includes('กล้อง') && !error.includes('Permission') && !error.includes('found')) && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3 animate-fade-in-up">
                    <AlertCircle size={20} className="shrink-0 text-rose-500 mt-0.5"/>
                    <div className="text-xs font-bold leading-relaxed">{error}</div>
                </div>
            )}

            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-start gap-3 animate-fade-in-up">
                    <CheckCircle size={20} className="shrink-0 text-emerald-500 mt-0.5"/>
                    <div className="text-xs font-bold leading-relaxed">{successMsg}</div>
                </div>
            )}
         </div>
      </div>

      {doc && (
        <div className="glass-card border border-indigo-100/70 overflow-hidden shadow-xl animate-fade-in-scale">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 px-6 py-4 flex justify-between items-center text-white">
                <h3 className="font-bold flex items-center gap-2 text-sm"><CheckCircle size={18}/> พบเอกสารในระบบสารบรรณ</h3>
                <StatusBadge status={doc.status} />
            </div>
            <div className="p-6 space-y-5">
                <div>
                    <h2 className="text-lg font-bold text-stone-850 mb-1 leading-snug">{doc.subject}</h2>
                    <p className="text-stone-400 text-xs font-medium">
                        เลขที่หนังสือ: <span className="font-bold text-stone-600">{doc.external_book_no || '-'}</span> | ลงวันที่: {new Date(doc.doc_date).toLocaleDateString('th-TH')}
                    </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-stone-50/50 p-4 rounded-2xl border border-stone-200/50 text-xs">
                    <div className="space-y-1">
                        <p className="text-stone-400 font-bold uppercase tracking-wider text-[9px]">จากหน่วยงานต้นทาง</p>
                        <p className="font-bold text-stone-700">{doc.from_origin}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-stone-400 font-bold uppercase tracking-wider text-[9px]">ถึงเจ้าหน้าที่ผู้รับ</p>
                        <p className="font-bold text-stone-700">{doc.recipient_name}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-stone-400 font-bold uppercase tracking-wider text-[9px]">Tracking Code</p>
                        <p className="font-mono font-extrabold text-indigo-600">{doc.tracking_code}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-stone-400 font-bold uppercase tracking-wider text-[9px]">เลขรับในระบบสารบรรณ</p>
                        <p className="font-bold text-stone-700">{doc.book_no ? `${doc.book_no}/${doc.book_year}` : '-'}</p>
                    </div>
                </div>

                <div className="pt-1">
                    {doc.status === DocStatus.REGISTERED ? (
                         <button 
                            disabled 
                            className="w-full btn btn-secondary text-stone-400 bg-stone-100 hover:bg-stone-100 border border-stone-200 font-bold py-3.5 rounded-xl cursor-not-allowed text-xs"
                         >
                            เอกสารนี้ถูกดำเนินการรับเข้าระบบเรียบร้อยแล้ว
                         </button>
                    ) : (
                        <button 
                            onClick={handleConfirmReceive}
                            disabled={processing}
                            className="w-full btn btn-success py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 text-sm"
                        >
                            {processing ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle size={20}/>} ยืนยันการรับหนังสือ (Register Document)
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
