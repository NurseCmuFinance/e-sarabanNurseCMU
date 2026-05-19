
import { DocStatus, UserRole, PermissionType, DocPriority } from './types';
import { FileText, Send, RotateCcw, XCircle, FileCheck, Clock, Inbox, AlertTriangle, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';

export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export const STATUS_CONFIG = {
  [DocStatus.PENDING_VERIFY]: { label: 'รอตรวจสอบ (Admin)', color: 'bg-indigo-100 text-indigo-800 border border-indigo-300', icon: ShieldAlert },
  [DocStatus.PENDING_REVIEW]: { label: 'รอรับเข้า/ตรวจสอบ', color: 'bg-slate-100 text-slate-800 border border-slate-300', icon: Inbox },
  [DocStatus.PENDING_ACCEPT]: { label: 'รอรับหนังสือ', color: 'bg-amber-100 text-amber-800 border border-amber-300', icon: Clock },
  [DocStatus.REGISTERED]: { label: 'รับเข้าสารบรรณแล้ว', color: 'bg-blue-100 text-blue-800', icon: FileText },
  [DocStatus.FORWARDED]: { label: 'ส่งต่อแล้ว', color: 'bg-yellow-100 text-yellow-800', icon: Send },
  [DocStatus.RETURNED]: { label: 'ตีกลับให้แก้ไข', color: 'bg-orange-100 text-orange-800', icon: RotateCcw },
  [DocStatus.CANCELLED]: { label: 'ยกเลิก', color: 'bg-red-100 text-red-800', icon: XCircle },
  [DocStatus.PROPOSING]: { label: 'อยู่ระหว่างเสนอ', color: 'bg-purple-100 text-purple-800', icon: Clock },
  [DocStatus.APPROVED]: { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
};

export const PRIORITY_CONFIG = {
  [DocPriority.NORMAL]: { label: 'ปกติ', color: 'bg-slate-100 text-slate-600', icon: FileText },
  [DocPriority.URGENT]: { label: 'ด่วน', color: 'bg-red-100 text-red-600 font-bold', icon: AlertTriangle },
  [DocPriority.EXPRESS]: { label: 'ด่วนมาก', color: 'bg-red-600 text-white font-bold animate-pulse', icon: Zap },
};

export const MOCK_DEPARTMENTS = [
  { id: '1', name: 'สำนักปลัด' },
  { id: '2', name: 'กองคลัง' },
  { id: '3', name: 'กองช่าง' },
  { id: '4', name: 'กองการศึกษา' },
];

export const PERMISSION_LABELS: Record<PermissionType, string> = {
  VIEW_DASHBOARD: 'ดูแดชบอร์ด (Dashboard)',
  REGISTER_DOC: 'ลงทะเบียนหนังสือ (Register)',
  SEARCH_DOC: 'ค้นหา/ติดตาม (Search)',
  MANAGE_USERS: 'จัดการผู้ใช้ (User Mgmt)',
  MANAGE_SETTINGS: 'ตั้งค่าระบบ (Settings)',
  VIEW_REPORTS: 'ดูรายงาน (Reports)',
  MANAGE_MASTER_DATA: 'จัดการข้อมูลพื้นฐาน (Master Data)',
  SCAN_QR: 'สแกนรับหนังสือ (Scan QR)',
  MANAGE_NOTIFICATIONS: 'ตั้งค่าการแจ้งเตือน (Notifications)',
};

// 32 Distinct Colors for Theme
export const THEME_COLORS = [
    { name: 'Red', hex: '#dc2626' }, { name: 'Orange', hex: '#ea580c' }, { name: 'Amber', hex: '#d97706' }, { name: 'Yellow', hex: '#ca8a04' },
    { name: 'Lime', hex: '#65a30d' }, { name: 'Green', hex: '#16a34a' }, { name: 'Emerald', hex: '#059669' }, { name: 'Teal', hex: '#0d9488' },
    { name: 'Cyan', hex: '#0891b2' }, { name: 'Sky', hex: '#0284c7' }, { name: 'Blue', hex: '#2563eb' }, { name: 'Indigo', hex: '#4f46e5' },
    { name: 'Violet', hex: '#7c3aed' }, { name: 'Purple', hex: '#9333ea' }, { name: 'Fuchsia', hex: '#c026d3' }, { name: 'Pink', hex: '#db2777' },
    { name: 'Rose', hex: '#e11d48' }, { name: 'Slate', hex: '#475569' }, { name: 'Gray', hex: '#4b5563' }, { name: 'Zinc', hex: '#52525b' },
    { name: 'Neutral', hex: '#525252' }, { name: 'Stone', hex: '#57534e' }, { name: 'Tomato', hex: '#ff6347' }, { name: 'Gold', hex: '#ffd700' },
    { name: 'Navy', hex: '#000080' }, { name: 'Olive', hex: '#808000' }, { name: 'Maroon', hex: '#800000' }, { name: 'Mint', hex: '#98ff98' },
    { name: 'Coral', hex: '#ff7f50' }, { name: 'Salmon', hex: '#fa8072' }, { name: 'HotPink', hex: '#ff69b4' }, { name: 'SeaGreen', hex: '#2e8b57' }
];
