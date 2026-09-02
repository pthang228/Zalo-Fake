// Kieu du lieu khop voi backend ZaloFake

export interface Settings {
  baseUrl: string; // vd http://192.168.1.10:8080
  token: string;
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
  | { type: 'typing'; accountId: string; threadId: string }
  | { type: 'seen'; accountId: string; threadId: string }
  | { type: 'delivered'; accountId: string; threadId: string };
