// Kieu du lieu khop voi backend ZaloFake

export interface Settings {
  baseUrl: string; // dia chi dang dung, vd http://192.168.1.10:8080
  token: string;
  lanUrl?: string;     // dia chi trong nha (chung Wi-Fi)
  tunnelUrl?: string;  // dia chi Cloudflare Tunnel (https://…trycloudflare.com), tu cap nhat
  beacon?: string;     // kenh ntfy.sh noi backend dang dia chi tunnel moi (hoc tu backend khi o nha)
}

export interface Account {
  id: string;
  display_name: string | null;
  phone: string | null;
  avatar: string | null;
  login_method: 'cookie' | 'qr';
  status: 'online' | 'offline' | 'error';
  last_error: string | null;
  last_login: number | null;
  created_at: number;
  online: boolean;
}

export interface Contact {
  id: string;
  type: 'user' | 'group';
  name: string | null;
  avatar: string | null;
}

export interface Thread {
  account_id: string;
  id: string;
  type: 'user' | 'group';
  name: string | null;
  avatar: string | null;
  last_message: string | null;
  last_ts: number;
  unread: number;
}

export interface Message {
  account_id: string;
  id: string;
  thread_id: string;
  thread_type: 'user' | 'group';
  sender_id: string | null;
  sender_name: string | null;
  content: string | null;
  msg_type: string;
  attachments: any | null;
  ts: number;
  is_self: boolean;
  reactions?: Record<string, string[]> | null;
  recalled?: boolean;
}

// Phim tat gui nhanh (anh+video phong, quy dinh, khuyen mai, bang gia, QR, dia chi)
export interface ShortcutItem {
  id: string;
  kind: 'image' | 'video' | 'text' | 'file';
  text?: string;
  name?: string;
  url?: string | null;
  thumb?: string | null;
  duration?: number;
}
export interface Shortcut {
  id: string;
  name: string;
  category: string | null;
  items: ShortcutItem[];
}

export interface Call {
  id: string;
  account_id: string;
  peer_id: string | null;
  peer_name: string | null;
  direction: 'incoming' | 'outgoing';
  call_type: 'audio' | 'video';
  state: 'ringing' | 'missed' | 'ended' | 'answered';
  ts: number;
}

// --- Tong ket dat phong (GET /api/report/bookings) ---
export type BookingStatus = 'paid_full' | 'deposit_paid' | 'proof_sent' | 'unpaid';

export interface BookingEvidence {
  ts: number;
  kind: 'confirm' | 'deposit_request' | 'deposit_ack' | 'full_ack' | 'customer_text' | 'customer_photo';
  is_self: boolean;
  text: string | null;
  image: string | null;   // anh chuyen khoan cua khach
  amount: number | null;  // VND
}

export interface Booking {
  key: string;
  account_id: string;
  account_name: string | null;
  thread_id: string;
  customer_name: string | null;
  customer_avatar: string | null;
  room: string | null;
  stay_date: string | null;   // YYYY-MM-DD
  slot: string | null;
  time_text: string | null;
  price: number | null;
  deposit_requested: number | null;
  paid: number;
  remaining: number | null;
  status: BookingStatus;
  status_label: string;
  confirmed_at: number | null;
  last_event_at: number;
  received_in_range: number;
  evidence: BookingEvidence[];
  review?: string[];          // ly do "Can xem lai" (luat khong chac / AI doc khac)
  thread_last_ts?: number;    // tin moi nhat cua hoi thoai (xep giong tab Tin nhan)
  ai?: { status: BookingStatus; status_label: string; price: number | null; confidence: string | null; evidence: string[]; note: string | null };
}

// Don chi AI thay (luat khong ra)
export interface AiOnlyBooking {
  key: string; account_id: string; account_name: string | null; thread_id: string;
  customer_name: string | null; customer_avatar: string | null;
  room: string | null; stay_date: string | null; time_text: string | null; price: number | null;
  status: BookingStatus; status_label: string; confidence: string | null; evidence: string[]; note: string | null; review: string[];
  thread_last_ts?: number;
}

export interface AiReviewStatus {
  state: 'idle' | 'running' | 'done';
  total: number; done: number; failed: number; error?: string | null;
  startedAt?: number; finishedAt?: number | null; workerOnline: boolean;
}

export type PhoneSyncState =
  | 'idle' | 'starting' | 'requesting' | 'waiting_phone' | 'downloading' | 'importing' | 'finishing'
  | 'done' | 'error' | 'cancelled';

export interface PhoneSyncStatus {
  state: PhoneSyncState;
  message: string;
  startedAt?: number;
  finishedAt?: number | null;
  result?: { totals: { files: number; saved: number; skipped: number; failed: number } } | null;
}

export interface BookingReport {
  from: number;
  to: number;
  accounts: { id: string; name: string | null; online: boolean; data_from: number | null; data_to: number | null }[];
  warnings: string[];
  totals: { bookings: number; paid_full: number; deposit_paid: number; proof_sent: number; unpaid: number; revenue: number; received_in_range: number; review?: number; ai_only?: number };
  bookings: Booking[];
  ai_only?: AiOnlyBooking[];
  ai?: AiReviewStatus;
}

export type WsEvent =
  | { type: 'connected'; ts: number }
  | { type: 'message'; accountId: string; message: Message }
  | { type: 'history_message'; accountId: string; message: Message }
  | { type: 'history_synced'; accountId: string; count?: number; groupMessagesSaved?: number }
  | { type: 'call'; accountId: string; call: Call }
  | { type: 'account_status'; accountId: string; status: string; error?: string }
  | { type: 'qr'; qrId?: string; image: string }
  | { type: 'qr_success'; account: Account }
  | { type: 'qr_failed'; error: string }
  | { type: 'contacts_synced'; accountId: string; friends: number; groups: number }
  | { type: 'reaction'; accountId: string; msgId: string; reactions: Record<string, string[]> }
  | { type: 'recalled'; accountId: string; msgId: string }
  | { type: 'deleted'; accountId: string; threadId: string; msgIds: string[] }
  | { type: 'typing'; accountId: string; threadId: string }
  | { type: 'seen'; accountId: string; threadId: string }
  | { type: 'delivered'; accountId: string; threadId: string };
