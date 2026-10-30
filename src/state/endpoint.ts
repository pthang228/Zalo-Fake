// Chon dia chi backend: o nha (chung Wi-Fi) dung dia chi LAN cho nhanh; ra ngoai dung Cloudflare Tunnel.
// Dia chi tunnel mien phi (…trycloudflare.com) DOI moi lan backend khoi dong lai -> moi lan ket noi duoc
// thi hoi backend dia chi tunnel moi nhat (/api/tunnel) va luu lai.
import type { Settings } from '../types';

export const isTunnelUrl = (u?: string | null) => !!u && /^https:\/\//i.test(u);
// Chi tin dia chi tunnel dung dang nay (bang tin la kenh cong khai -> khong de bi dan sang trang la)
const TRYCF = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;
// Dia chi Wi-Fi rieng (router doi IP dien thoai sau mat mang -> backend dang IP moi len bang tin)
const PRIVATE_LAN = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)[\d.]+:\d+$/;
const BEACON_SERVER = 'https://ntfy.sh';
const clean = (u: string) => u.replace(/\/$/, '');

async function alive(url: string, ms: number): Promise<boolean> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(`${clean(url)}/api/health`, { signal: c.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

// Nguoi dung nhap 1 dia chi -> xep vao LAN hay tunnel
export function withEnteredUrl(s: Settings): Settings {
  const url = clean(s.baseUrl);
  return isTunnelUrl(url) ? { ...s, baseUrl: url, tunnelUrl: url } : { ...s, baseUrl: url, lanUrl: url };
}

// Dia chi tunnel moi nhat backend da dang len bang tin (ntfy giu tin ~12h, backend dang lai moi 3h)
async function fromBeacon(topic: string): Promise<{ url?: string; lan?: string }> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 10000);
  try {
    const r = await fetch(`${BEACON_SERVER}/${encodeURIComponent(topic)}/json?poll=1&since=24h`, { signal: c.signal });
    const found: { url?: string; lan?: string } = {};
    for (const line of (await r.text()).split(/\r?\n/)) {
      try {
        const ev = JSON.parse(line);
        const msg = ev?.event === 'message' ? JSON.parse(ev.message) : null;
        if (typeof msg?.url === 'string' && TRYCF.test(msg.url)) found.url = msg.url; // lay tin moi nhat
        if (typeof msg?.lan === 'string' && PRIVATE_LAN.test(msg.lan)) found.lan = msg.lan;
      } catch { /* dong khong hop le */ }
    }
    return found;
  } catch {
    return {};
  } finally {
    clearTimeout(t);
  }
}

export async function resolveBackend(s: Settings): Promise<Settings> {
  let lan = s.lanUrl ?? (!isTunnelUrl(s.baseUrl) ? s.baseUrl : undefined);
  let tunnel = s.tunnelUrl ?? (isTunnelUrl(s.baseUrl) ? s.baseUrl : undefined);
  let pick: string | undefined;
  let beacon = s.beacon;
  if (lan && await alive(lan, 3000)) pick = lan;
  else if (tunnel && await alive(tunnel, 8000)) pick = tunnel;
  else if (beacon) {
    // Ca Wi-Fi lan tunnel cu deu chet (vd. router cap IP moi, tunnel doi dia chi) -> hoi bang tin
    const fresh = await fromBeacon(beacon);
    if (fresh.lan && fresh.lan !== lan && await alive(fresh.lan, 3000)) { pick = fresh.lan; lan = fresh.lan; }
    else if (fresh.url && fresh.url !== tunnel && await alive(fresh.url, 8000)) { pick = fresh.url; tunnel = fresh.url; }
  }
  if (!pick) return { ...s, lanUrl: lan, tunnelUrl: tunnel };
  try {
    const r = await fetch(`${clean(pick)}/api/tunnel`, { headers: { Authorization: `Bearer ${s.token}` } });
    const j = await r.json();
    if (typeof j?.url === 'string' && TRYCF.test(j.url)) tunnel = clean(j.url);
    if (typeof j?.lan === 'string' && PRIVATE_LAN.test(j.lan)) lan = clean(j.lan);
    if (typeof j?.beacon === 'string' && j.beacon) beacon = j.beacon;
  } catch { /* backend cu chua co /api/tunnel */ }
  return { ...s, baseUrl: clean(pick), lanUrl: lan, tunnelUrl: tunnel, beacon };
}
