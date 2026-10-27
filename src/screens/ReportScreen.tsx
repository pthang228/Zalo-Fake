import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { ZaloHeader } from '../components/ZaloHeader';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Booking, BookingReport, BookingStatus } from '../types';

// Tong ket dat phong: khach da chot + da chuyen tien trong 1 khung gio, gop nhieu tai khoan.

type Preset = 'today' | 'yesterday' | '7d' | 'custom';
type Filter = 'all' | BookingStatus;

const DAY = 24 * 60 * 60 * 1000;
const PRESETS: [Preset, string][] = [['today', 'Hôm nay'], ['yesterday', 'Hôm qua'], ['7d', '7 ngày'], ['custom', 'Tuỳ chọn']];
const FILTERS: [Filter, string][] = [
  ['all', 'Tất cả'], ['paid_full', 'Đã trả đủ'], ['deposit_paid', 'Đã cọc'], ['proof_sent', 'Chờ xác nhận'], ['unpaid', 'Chưa chuyển'],
];
const STATUS_COLOR: Record<BookingStatus, string> = {
  paid_full: '#2ECC71', deposit_paid: '#0068FF', proof_sent: '#F5A623', unpaid: '#E4483B',
};

const pad = (n: number) => String(n).padStart(2, '0');
const startOfDay = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const fmtDate = (ts: number) => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtTime = (ts: number) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
// toLocaleString khong on dinh tren Hermes -> tu chen dau cham
const money = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
const stayDate = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };

function rangeOf(preset: Preset, custom: { fromDay: number; fromHour: number; toDay: number; toHour: number }) {
  const now = Date.now();
  const today = startOfDay(now);
  switch (preset) {
    case 'yesterday': return { from: today - DAY, to: today - 1 };
    case '7d': return { from: today - 6 * DAY, to: now };
    case 'custom': return { from: custom.fromDay + custom.fromHour * 3600000, to: custom.toDay + custom.toHour * 3600000 - 1 };
    default: return { from: today, to: now };
  }
}

function Stepper({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={onPrev} hitSlop={8}><Ionicons name="chevron-back" size={20} color={colors.primary} /></TouchableOpacity>
      <Text style={styles.stepperText}>{label}</Text>
      <TouchableOpacity onPress={onNext} hitSlop={8}><Ionicons name="chevron-forward" size={20} color={colors.primary} /></TouchableOpacity>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ReportScreen({ navigation }: any) {
  const { api, accounts, setActiveAccount } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [preset, setPreset] = useState<Preset>('today');
  const today = startOfDay(Date.now());
  const [custom, setCustom] = useState({ fromDay: today, fromHour: 0, toDay: today, toHour: 24 });
  const [report, setReport] = useState<BookingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);

  // Mac dinh chon tat ca tai khoan
  useEffect(() => {
    if (accounts.length && !selected.length) setSelected(accounts.map((a) => a.id));
  }, [accounts, selected.length]);

  const run = useCallback(async () => {
    if (!api) return;
    const { from, to } = rangeOf(preset, custom);
    if (from > to) { setError('Giờ bắt đầu phải trước giờ kết thúc.'); return; }
    setLoading(true);
    setError(null);
    try {
      setReport(await api.bookingReport(from, to, selected));
    } catch (e: any) {
      setError(e?.message || 'Không tải được báo cáo');
    } finally {
      setLoading(false);
    }
  }, [api, preset, custom, selected]);

  // Tu chay 1 lan khi vao man hinh
  const [autoRan, setAutoRan] = useState(false);
  useEffect(() => {
    if (!autoRan && api && selected.length) { setAutoRan(true); run(); }
  }, [autoRan, api, selected.length, run]);

  const toggleAccount = (id: string) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.length > 1 ? cur.filter((x) => x !== id) : cur;
      return [...cur, id];
    });
  };

  const shiftDay = (key: 'fromDay' | 'toDay', d: number) => setCustom((c) => ({ ...c, [key]: c[key] + d * DAY }));
  const shiftHour = (key: 'fromHour' | 'toHour', d: number) =>
    setCustom((c) => ({ ...c, [key]: Math.min(24, Math.max(0, c[key] + d)) }));

  const openChat = async (b: Booking) => {
    await setActiveAccount(b.account_id);
    navigation.navigate('Chat', { threadId: b.thread_id, threadType: 'user', name: b.customer_name, avatar: b.customer_avatar });
  };

  const list = useMemo(
    () => (report?.bookings || []).filter((b) => filter === 'all' || b.status === filter),
    [report, filter]
  );

  const t = report?.totals;
  const header = (
    <View>
      <View style={styles.section}>
        <Text style={styles.label}>Tài khoản</Text>
        <View style={styles.chips}>
          {accounts.map((a) => (
            <Chip key={a.id} label={a.display_name || a.id} active={selected.includes(a.id)} onPress={() => toggleAccount(a.id)} />
          ))}
        </View>

        <Text style={styles.label}>Khung thời gian</Text>
        <View style={styles.chips}>
          {PRESETS.map(([p, l]) => <Chip key={p} label={l} active={preset === p} onPress={() => setPreset(p)} />)}
        </View>
        {preset === 'custom' && (
          <View style={styles.custom}>
            {([['Từ', 'fromDay', 'fromHour'], ['Đến', 'toDay', 'toHour']] as const).map(([l, dk, hk]) => (
              <View key={l} style={styles.customRow}>
                <Text style={styles.customLabel}>{l}</Text>
                <Stepper label={fmtDate(custom[dk])} onPrev={() => shiftDay(dk, -1)} onNext={() => shiftDay(dk, 1)} />
                <Stepper label={`${pad(custom[hk])}:00`} onPrev={() => shiftHour(hk, -1)} onNext={() => shiftHour(hk, 1)} />
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={[styles.runBtn, loading && { opacity: 0.6 }]} onPress={run} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.runText}>Tổng kết</Text>}
        </TouchableOpacity>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      {t && (
        <View style={styles.section}>
          <View style={styles.cards}>
            <View style={styles.card}><Text style={styles.cardNum}>{t.bookings}</Text><Text style={styles.cardLabel}>Khách đã chốt</Text></View>
            <View style={styles.card}><Text style={[styles.cardNum, { color: colors.success }]}>{money(t.received_in_range)}</Text><Text style={styles.cardLabel}>Tiền nhận trong khung</Text></View>
            <View style={styles.card}><Text style={styles.cardNum}>{money(t.revenue)}</Text><Text style={styles.cardLabel}>Tổng giá trị</Text></View>
          </View>
          <Text style={styles.counts}>
            Đã trả đủ {t.paid_full} · Đã cọc {t.deposit_paid} · Gửi ảnh, chưa xác nhận {t.proof_sent} · Chưa chuyển {t.unpaid}
          </Text>
        </View>
      )}

      {!!report?.warnings.length && (
        <View style={styles.warnBox}>
          {report.warnings.map((w, i) => <Text key={i} style={styles.warnText}>⚠ {w}</Text>)}
        </View>
      )}

      {report && (
        <View style={[styles.chips, { paddingHorizontal: 12, paddingVertical: 8 }]}>
          {FILTERS.map(([f, l]) => <Chip key={f} label={l} active={filter === f} onPress={() => setFilter(f)} />)}
        </View>
      )}
    </View>
  );

  const renderItem = ({ item: b }: { item: Booking }) => {
    const line2 = [b.room && `Phòng ${b.room}`, b.stay_date && stayDate(b.stay_date), [b.slot, b.time_text].filter(Boolean).join(' ')]
      .filter(Boolean).join(' · ');
    const line3 = [b.price != null && `Giá ${money(b.price)}`, `Đã nhận ${money(b.paid)}`, b.remaining != null && `Còn ${money(b.remaining)}`]
      .filter(Boolean).join(' · ');
    const open = expanded === b.key;
    return (
      <View style={styles.item}>
        <Pressable onPress={() => setExpanded(open ? null : b.key)} style={styles.itemRow}>
          <Avatar uri={b.customer_avatar} name={b.customer_name || 'Khách'} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={1}>
              {b.customer_name || 'Khách'} <Text style={styles.itemAcc}>· {b.account_name}</Text>
            </Text>
            {!!line2 && <Text style={styles.itemLine}>{line2}</Text>}
            <Text style={styles.itemLine}>{line3}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLOR[b.status] }]}>
              <Text style={styles.badgeText}>{b.status_label}</Text>
            </View>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </Pressable>

        {open && (
          <View style={styles.evidence}>
            {b.evidence.map((e, i) => (
              <View key={i} style={styles.evRow}>
                <Text style={styles.evMeta}>{fmtTime(e.ts)} · {e.is_self ? 'Bạn' : 'Khách'}</Text>
                {!!e.text && <Text style={styles.evText}>{e.text}</Text>}
                {!!e.image && (
                  <Pressable onPress={() => setViewer(e.image)}>
                    <Image source={{ uri: e.image }} style={styles.evImg} contentFit="cover" />
                  </Pressable>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.chatBtn} onPress={() => openChat(b)}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
              <Text style={styles.chatText}>Mở chat</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ZaloHeader title="Tổng kết đặt phòng" />
      <FlatList
        data={list}
        keyExtractor={(b) => b.key}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={report && !loading ? <Text style={styles.empty}>Không có khách chốt trong khung giờ này.</Text> : null}
        refreshControl={<RefreshControl refreshing={loading && !!report} onRefresh={run} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          {viewer && <Image source={{ uri: viewer }} style={StyleSheet.absoluteFill} contentFit="contain" />}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMuted },
  section: { backgroundColor: colors.bg, padding: 12, marginBottom: 8 },
  label: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.bgMuted, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  custom: { gap: 8, marginVertical: 6 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customLabel: { width: 32, color: colors.text, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 },
  stepperText: { fontSize: 15, color: colors.text, minWidth: 44, textAlign: 'center' },
  runBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  runText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: colors.danger, marginTop: 8 },
  cards: { flexDirection: 'row', gap: 8 },
  card: { flex: 1, backgroundColor: colors.bgMuted, borderRadius: 10, padding: 10 },
  cardNum: { fontSize: 17, fontWeight: '800', color: colors.text },
  cardLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  counts: { fontSize: 13, color: colors.textMuted, marginTop: 10 },
  warnBox: { backgroundColor: '#FFF7E0', marginHorizontal: 12, marginBottom: 8, borderRadius: 8, padding: 10, gap: 4 },
  warnText: { color: '#8A6100', fontSize: 13 },
  item: { backgroundColor: colors.bg, marginHorizontal: 12, marginBottom: 8, borderRadius: 10, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', gap: 10, padding: 12, alignItems: 'flex-start' },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemAcc: { fontSize: 13, fontWeight: '400', color: colors.textMuted },
  itemLine: { fontSize: 14, color: colors.text, marginTop: 3 },
  badge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  evidence: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, padding: 12, gap: 10 },
  evRow: { gap: 4 },
  evMeta: { fontSize: 12, color: colors.textMuted },
  evText: { fontSize: 14, color: colors.text },
  evImg: { width: 120, height: 200, borderRadius: 8, backgroundColor: colors.bgMuted },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6 },
  chatText: { color: colors.primary, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, padding: 30 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
});
