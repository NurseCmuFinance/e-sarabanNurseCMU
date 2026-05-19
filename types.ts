
export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  USER = 'user'
}

export enum DocStatus {
  PENDING_VERIFY = 'pending_verify',
  PENDING_REVIEW = 'pending_review',
  PENDING_ACCEPT = 'pending_accept',
  REGISTERED = 'registered',
  FORWARDED = 'forwarded',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
  PROPOSING = 'proposing',
  APPROVED = 'approved'
}

export enum DocPriority {
  NORMAL = 'normal',
  URGENT = 'urgent',
  EXPRESS = 'express'
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  department_id: string;
  avatar_url?: string;
  department_name?: string;
  is_online?: boolean;
  is_approved?: boolean;
  is_locked?: boolean;
  ban_reason?: string; // New field for ban reason
  login_attempts?: number;
  email: string;
}

export interface Document {
  id: string;
  book_no: number | null;
  book_year: number;
  external_book_no: string;
  doc_date: string;
  registration_date?: string; 
  from_origin: string;
  to_recipient_id: string;
  recipient_name?: string;
  subject: string;
  status: DocStatus;
  priority: DocPriority;
  remark?: string;
  attachment_url?: string;
  approved_attachment_url?: string;
  is_cancelled: boolean;
  cancel_reason?: string;
  tracking_code: string;
  created_at: string;
  updated_at: string;
  sender_type?: 'internal' | 'external';
  creator_id?: string;
}

export interface DocumentLog {
  id: string;
  document_id: string;
  timestamp: string;
  action: string;
  actor_id: string;
  actor_name: string;
  details: string;
  actor_role?: UserRole; 
}

export type PermissionType = 
  | 'VIEW_DASHBOARD'
  | 'REGISTER_DOC'
  | 'SEARCH_DOC'
  | 'MANAGE_USERS'
  | 'MANAGE_SETTINGS'
  | 'VIEW_REPORTS'
  | 'MANAGE_MASTER_DATA'
  | 'SCAN_QR'
  | 'MANAGE_NOTIFICATIONS'; 

export interface DashboardStats {
  totalReceived: number;
  pending: number;
  pendingAccept: number;
  pendingReview: number;
  completed: number;
  cancelled: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  participants: string[];
  last_message: string;
  updated_at: string;
  unread_count: Record<string, number>;
  type: 'direct' | 'support';
}

export interface DataSourceConfig {
  type: 'local_mock' | 'supabase' | 'google_sheets';
  url?: string;
  key?: string;
}

export interface RunningConfig {
  currentYear: number;
  lastBookNo: number;
  mascotEnabled?: boolean;
  mascotId?: string; // Selected Character ID (1-50)
  mascotAction?: string; // Selected Action ID (1-30)
  mascotAutoRotate?: boolean; // New: Auto change character
  mascotInterval?: number; // New: Interval in minutes
}

export interface StorageConfig {
  provider: 'local' | 'google_drive' | 'onedrive';
  googleDriveEnabled: boolean;
  googleDriveClientId?: string;
  googleDriveClientSecret?: string;
  googleDriveFolderId?: string;
  googleDriveRefreshToken?: string;
}

export interface MasterData {
  id: string;
  name: string;
  position?: string;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  // Gmail API Config
  gmailClientId?: string;
  gmailClientSecret?: string; 
  gmailAccessToken?: string;
  gmailRefreshToken?: string; // เพิ่มฟิลด์สำหรับ Refresh Token (ถาวร)
  gmailTokenExpiry?: number;
  gmailUserEmail?: string; 
  // Line API
  lineEnabled: boolean;
  lineChannelAccessToken: string;
  lineChannelSecret: string;
}
