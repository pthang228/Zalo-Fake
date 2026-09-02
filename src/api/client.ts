import { Account, Call, Contact, Message, Thread } from '../types';

// REST client goi backend ZaloFake. Tao voi baseUrl + token.
export class ApiClient {
  baseUrl: string;
  token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async req<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data as T;
  }

  health() {
    return this.req<{ ok: boolean; ts: number }>('/health');
  }

  // --- accounts ---
  listAccounts() {
    return this.req<{ accounts: Account[] }>('/accounts').then((r) => r.accounts);
  }
  loginCookie(payload: { cookie: any; imei: string; userAgent: string }) {
    return this.req<{ account: Account }>('/accounts/login/cookie', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.account);
  }
  loginQR() {
    // Chay nen: tra ve ngay. Ma QR + ket qua den qua WebSocket ('qr'/'qr_success'/'qr_failed').
    return this.req<{ started: boolean }>('/accounts/login/qr', { method: 'POST' });
  }
  removeAccount(id: string, remove = false) {
    return this.req<{ ok: boolean }>(`/accounts/${id}?remove=${remove}`, { method: 'DELETE' });
  }
  reconnectAccount(id: string) {
    return this.req<{ account: Account }>(`/accounts/${id}/reconnect`, { method: 'POST' }).then((r) => r.account);
  }
  syncContacts(id: string) {
    return this.req<{ ok: boolean }>(`/accounts/${id}/sync`, { method: 'POST' });
  }
  getContacts(id: string) {
    return this.req<{ friends: Contact[]; groups: Contact[] }>(`/accounts/${id}/contacts`);
  }
  fetchHistory(id: string, groupCount = 50) {
    return this.req<{ ok: boolean }>(`/accounts/${id}/history`, {
      method: 'POST',
      body: JSON.stringify({ groupCount }),
    });
  }

  // --- threads ---
  listThreads(accountId: string) {
    return this.req<{ threads: Thread[] }>(`/accounts/${accountId}/threads`).then((r) => r.threads);
  }
  markRead(accountId: string, threadId: string) {
    return this.req<{ ok: boolean }>(`/accounts/${accountId}/threads/${threadId}/read`, { method: 'POST' });
  }
  clearHistory(accountId: string, threadId: string) {
    return this.req<{ ok: boolean }>(`/accounts/${accountId}/threads/${threadId}/history`, { method: 'DELETE' });
  }
  markAllRead(accountId: string) {
    return this.req<{ ok: boolean }>(`/accounts/${accountId}/read-all`, { method: 'POST' });
  }

  // --- messages ---
  listMessages(accountId: string, threadId: string, opts: { limit?: number; before?: number } = {}) {
    const q = new URLSearchParams();
    if (opts.limit) q.set('limit', String(opts.limit));
    if (opts.before) q.set('before', String(opts.before));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.req<{ messages: Message[] }>(`/accounts/${accountId}/threads/${threadId}/messages${qs}`)
      .then((r) => r.messages);
  }
  // Tra ve ca tin nhan + moc da xem/da nhan cua hoi thoai
  loadThread(accountId: string, threadId: string, opts: { limit?: number } = {}) {
    const q = new URLSearchParams();
    if (opts.limit) q.set('limit', String(opts.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.req<{ messages: Message[]; seenTs: number; deliveredTs: number }>(`/accounts/${accountId}/threads/${threadId}/messages${qs}`);
  }
  sendMessage(accountId: string, payload: { threadId: string; threadType: string; text: string; replyToMsgId?: string }) {
    // Tin da gui se ve qua WebSocket (selfListen echo), khong tra ve message o day
    return this.req<{ ok: boolean }>(`/accounts/${accountId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  reactMessage(accountId: string, payload: { msgId: string; threadId: string; threadType: string; icon: string }) {
    return this.req<{ ok: boolean }>(`/accounts/${accountId}/reaction`, { method: 'POST', body: JSON.stringify(payload) });
  }
  undoMessage(accountId: string, payload: { msgId: string; threadId: string; threadType: string }) {
    return this.req<{ ok: boolean }>(`/accounts/${accountId}/undo`, { method: 'POST', body: JSON.stringify(payload) });
  }
  searchMessages(accountId: string, q: string, threadId?: string) {
    const p = new URLSearchParams({ q });
    if (threadId) p.set('threadId', threadId);
    return this.req<{ messages: Message[] }>(`/accounts/${accountId}/search?${p.toString()}`).then((r) => r.messages);
  }
  sendTyping(accountId: string, payload: { threadId: string; threadType: string }) {
    return this.req<{ ok: boolean }>(`/accounts/${accountId}/typing`, { method: 'POST', body: JSON.stringify(payload) });
  }
  sendSeen(accountId: string, payload: { threadId: string; threadType: string }) {
    return this.req<{ ok: boolean }>(`/accounts/${accountId}/seen`, { method: 'POST', body: JSON.stringify(payload) });
  }
  sendFriendRequest(accountId: string, payload: { userId: string; msg?: string }) {
    return this.req<{ ok: boolean }>(`/accounts/${accountId}/friend-request`, { method: 'POST', body: JSON.stringify(payload) });
  }
  searchStickers(accountId: string, q: string) {
    return this.req<{ stickers: { stickerId: number; cateId: number; type: number; url: string | null }[] }>(`/accounts/${accountId}/stickers?q=${encodeURIComponent(q)}`).then((r) => r.stickers);
  }
  sendSticker(accountId: string, payload: { stickerId: number; cateId: number; type: number; threadId: string; threadType: string }) {
    return this.req<{ ok: boolean }>(`/accounts/${accountId}/sticker`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async sendVoice(accountId: string, opts: { uri: string; name: string; mime: string; threadId: string; threadType: string }): Promise<void> {
    const form = new FormData();
    form.append('file', { uri: opts.uri, name: opts.name, type: opts.mime } as any);
    form.append('threadId', opts.threadId);
    form.append('threadType', opts.threadType);
    const res = await fetch(`${this.baseUrl}/api/accounts/${accountId}/voice`, {
      method: 'POST', headers: { Authorization: `Bearer ${this.token}` }, body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  }

  // Gui NHIEU anh/video trong 1 tin (album, toi da 15/tin - goi tach batch o tren)
  async sendMedia(accountId: string, opts: {
    assets: { uri: string; name: string; mime: string; width?: number; height?: number }[];
    kind: 'image' | 'video' | 'file'; threadId: string; threadType: string; caption?: string;
  }): Promise<void> {
    const form = new FormData();
    const widths: number[] = [], heights: number[] = [];
    for (const a of opts.assets) {
      form.append('files', { uri: a.uri, name: a.name, type: a.mime } as any);
      widths.push(a.width || 0);
      heights.push(a.height || 0);
    }
    form.append('threadId', opts.threadId);
    form.append('threadType', opts.threadType);
    form.append('kind', opts.kind);
    form.append('widths', JSON.stringify(widths));
    form.append('heights', JSON.stringify(heights));
    if (opts.caption) form.append('caption', opts.caption);
    // KHONG dat Content-Type -> de fetch tu them boundary cho multipart
    const res = await fetch(`${this.baseUrl}/api/accounts/${accountId}/attachment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    // Tin da gui se ve qua WebSocket (selfListen echo)
  }

  forwardMessage(accountId: string, payload: { msgId?: string; text?: string; targets: { id: string; type: string }[] }) {
    return this.req<{ ok: boolean; forwarded: number }>(`/accounts/${accountId}/forward`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- calls ---
  listCalls(accountId: string) {
    return this.req<{ calls: Call[] }>(`/accounts/${accountId}/calls`).then((r) => r.calls);
  }
}
