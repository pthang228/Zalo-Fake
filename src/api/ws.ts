import { WsEvent } from '../types';

type Listener = (ev: WsEvent) => void;

// Quan ly ket noi WebSocket toi backend, tu dong ket noi lai khi rot.
export class WsManager {
  private url: string;
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectTimer: any = null;
  private closedByUser = false;
  onStatusChange?: (connected: boolean) => void;

  constructor(baseUrl: string, token: string) {
    // http(s)://host:port -> ws(s)://host:port/ws?token=...
    const wsBase = baseUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    this.url = `${wsBase}/ws?token=${encodeURIComponent(token)}`;
  }

  connect() {
    this.closedByUser = false;
    this.open();
  }

  private open() {
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => this.onStatusChange?.(true);

    this.ws.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as WsEvent;
        this.listeners.forEach((l) => l(ev));
      } catch { /* bo qua */ }
    };

    this.ws.onclose = () => {
      this.onStatusChange?.(false);
      if (!this.closedByUser) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      try { this.ws?.close(); } catch { /* */ }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closedByUser) this.open();
    }, 3000);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.closedByUser = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    try { this.ws?.close(); } catch { /* */ }
    this.ws = null;
  }
}
