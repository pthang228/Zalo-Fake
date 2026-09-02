import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ApiClient } from '../api/client';
import { WsManager } from '../api/ws';
import { Account, Call, Settings, WsEvent } from '../types';
import * as storage from './storage';
import { notifyCall, notifyMessage, setupNotifications } from '../notify';
import { DEFAULT_BACKEND_URL, DEFAULT_API_TOKEN } from '../appConfig';

interface AppState {
  ready: boolean;                 // da load xong settings tu storage chua
  settings: Settings | null;
  api: ApiClient | null;
  wsConnected: boolean;
  accounts: Account[];
  activeAccountId: string | null;
  activeAccount: Account | null;
  incomingCall: Call | null;
  unreadTotal: number;

  configure: (settings: Settings) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  setActiveAccount: (id: string) => Promise<void>;
  dismissIncomingCall: () => void;
  subscribe: (fn: (ev: WsEvent) => void) => () => void;
  refreshUnread: () => Promise<void>;
  isMuted: (threadId: string) => boolean;
  toggleMute: (threadId: string) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp phai dung trong AppProvider');
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const apiRef = useRef<ApiClient | null>(null);
  const wsRef = useRef<WsManager | null>(null);
  const listenersRef = useRef(new Set<(ev: WsEvent) => void>());
  const activeIdRef = useRef<string | null>(null);
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const mutedRef = useRef<Set<string>>(new Set());
  mutedRef.current = muted; // giu ref dong bo cho handleWsEvent

  const [api, setApi] = useState<ApiClient | null>(null);

  const isMuted = useCallback((tid: string) => muted.has(tid), [muted]);
  const toggleMute = useCallback(async (tid: string) => {
    const next = new Set(mutedRef.current);
    if (next.has(tid)) next.delete(tid); else next.add(tid);
    setMuted(next);
    try { await storage.saveMuted([...next]); } catch { /* */ }
  }, []);

  // Tinh tong tin chua doc cua tai khoan dang chon (cho badge tab Tin nhan)
  const refreshUnread = useCallback(async () => {
    const id = activeIdRef.current;
    if (!apiRef.current || !id) { setUnreadTotal(0); return; }
    try {
      const threads = await apiRef.current.listThreads(id);
      setUnreadTotal(threads.reduce((s, t) => s + (t.unread || 0), 0));
    } catch { /* */ }
  }, []);

  const subscribe = useCallback((fn: (ev: WsEvent) => void) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  const refreshAccounts = useCallback(async () => {
    if (!apiRef.current) return;
    try {
      const list = await apiRef.current.listAccounts();
      setAccounts(list);
      // Neu chua chon tai khoan, chon cai online dau tien
      setActiveAccountId((cur) => {
        if (cur && list.some((a) => a.id === cur)) return cur;
        const first = list.find((a) => a.online) || list[0];
        return first ? first.id : null;
      });
    } catch (e) {
      // giu nguyen danh sach cu
    }
  }, []);

  // Xu ly moi su kien WebSocket o cap toan cuc (thong bao + cuoc goi den)
  const handleWsEvent = useCallback((ev: WsEvent) => {
    // Chuyen tiep cho cac man hinh dang lang nghe
    listenersRef.current.forEach((l) => l(ev));

    if (ev.type === 'message' || ev.type === 'history_synced' || ev.type === 'contacts_synced') {
      refreshUnread();
    }

    if (ev.type === 'message' && !ev.message.is_self && !mutedRef.current.has(ev.message.thread_id)) {
      const name = ev.message.sender_name || 'Tin nhan moi';
      notifyMessage(name, ev.message.content || '[dinh kem]');
    } else if (ev.type === 'call') {
      setIncomingCall(ev.call);
      const who = ev.call.peer_name || 'Ai do';
      notifyCall(
        `Cuoc goi ${ev.call.call_type === 'video' ? 'video' : 'thoai'} den`,
        `${who} dang goi...`
      );
    } else if (ev.type === 'account_status') {
      refreshAccounts();
      if (ev.status === 'error') {
        notifyMessage('ZaloFake — Cần đăng nhập lại', 'Một tài khoản Zalo đã hết phiên. Mở app → Cá nhân → Đăng nhập.');
      }
    }
  }, [refreshAccounts, refreshUnread]);

  const connectWs = useCallback((s: Settings) => {
    wsRef.current?.close();
    const ws = new WsManager(s.baseUrl, s.token);
    ws.onStatusChange = (c) => setWsConnected(c);
    ws.subscribe(handleWsEvent);
    ws.connect();
    wsRef.current = ws;
  }, [handleWsEvent]);

  const configure = useCallback(async (s: Settings) => {
    await storage.saveSettings(s);
    setSettings(s);
    const client = new ApiClient(s.baseUrl, s.token);
    apiRef.current = client;
    setApi(client);
    connectWs(s);
    await refreshAccounts();
  }, [connectWs, refreshAccounts]);

  // Ngat: xoa setting da luu roi ket noi lai bang mac dinh (khong ve man Setup nua)
  const disconnect = useCallback(async () => {
    await storage.clearSettings();
    const s: Settings = { baseUrl: DEFAULT_BACKEND_URL, token: DEFAULT_API_TOKEN };
    setSettings(s);
    const client = new ApiClient(s.baseUrl, s.token);
    apiRef.current = client;
    setApi(client);
    connectWs(s);
    await refreshAccounts();
  }, [connectWs, refreshAccounts]);

  const setActiveAccount = useCallback(async (id: string) => {
    setActiveAccountId(id);
    await storage.saveActiveAccount(id);
  }, []);

  const dismissIncomingCall = useCallback(() => setIncomingCall(null), []);

  // Khoi tao: tu dong ket noi backend mac dinh (khong con man Setup bat buoc)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await setupNotifications(); } catch { /* */ }
      try { setMuted(new Set(await storage.loadMuted())); } catch { /* */ }
      let saved: Settings | null = null;
      try { saved = await storage.loadSettings(); } catch { /* */ }
      try { const active = await storage.loadActiveAccount(); if (active) setActiveAccountId(active); } catch { /* */ }
      // Dung setting da luu, neu chua co thi dung mac dinh nhung san trong code
      const s: Settings = saved || { baseUrl: DEFAULT_BACKEND_URL, token: DEFAULT_API_TOKEN };
      setSettings(s);
      try {
        const client = new ApiClient(s.baseUrl, s.token);
        apiRef.current = client;
        setApi(client);
        connectWs(s);
        await refreshAccounts();
      } catch { /* */ }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; wsRef.current?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) || null,
    [accounts, activeAccountId]
  );

  // Khi doi tai khoan -> cap nhat ref + tinh lai so tin chua doc
  useEffect(() => {
    activeIdRef.current = activeAccountId;
    refreshUnread();
  }, [activeAccountId, refreshUnread]);

  const value: AppState = {
    ready, settings, api, wsConnected, accounts, activeAccountId, activeAccount, incomingCall, unreadTotal,
    configure, disconnect, refreshAccounts, setActiveAccount, dismissIncomingCall, subscribe, refreshUnread,
    isMuted, toggleMute,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
