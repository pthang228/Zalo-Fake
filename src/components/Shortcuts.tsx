import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state/AppContext';
import { colors } from '../theme';
import { Shortcut } from '../types';

// "8 ảnh · 1 video · 2 tin"
export function shortcutSummary(sc: Shortcut) {
  const n = { image: 0, video: 0, text: 0, file: 0 };
  for (const it of sc.items) n[it.kind]++;
  const parts = [n.image && `${n.image} ảnh`, n.video && `${n.video} video`, n.file && `${n.file} file`, n.text && `${n.text} tin`].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Chưa có nội dung';
}
export const shortcutCover = (sc: Shortcut) => sc.items.find((it) => it.thumb)?.thumb ?? null;

// Gom theo nhom, giu thu tu xuat hien
export function groupShortcuts(list: Shortcut[]) {
  const groups: { title: string; data: Shortcut[] }[] = [];
  for (const sc of list) {
    const title = sc.category || 'Khác';
    let g = groups.find((x) => x.title === title);
    if (!g) { g = { title, data: [] }; groups.push(g); }
    g.data.push(sc);
  }
  return groups;
}

export function useShortcuts(active: boolean) {
  const { api } = useApp();
  const [list, setList] = useState<Shortcut[] | null>(null);
  const reload = useCallback(async () => {
    if (!api) return;
    try { setList(await api.listShortcuts()); } catch { setList((l) => l ?? []); }
  }, [api]);
  useEffect(() => { if (active) reload(); }, [active, reload]);
  return { list, reload };
}

function Cover({ sc, size }: { sc: Shortcut; size: number }) {
  const cover = shortcutCover(sc);
  const onlyText = !cover && sc.items.length > 0;
  return (
    <View style={[styles.cover, { width: size, height: size }]}>
      {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
        : <Ionicons name={onlyText ? 'chatbubble-ellipses-outline' : 'flash-outline'} size={size * 0.38} color={colors.primary} />}
      {sc.items.some((it) => it.kind === 'video') ? <View style={styles.coverBadge}><Ionicons name="play" size={10} color="#fff" /></View> : null}
    </View>
  );
}

// Bang phim tat mo tu nut tia set tren thanh nhap tin. Cham 1 o -> xac nhan -> gui.
export function ShortcutPanel({ visible, onClose, onSend, onManage }: {
  visible: boolean; onClose: () => void; onSend: (sc: Shortcut) => void; onManage: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { list } = useShortcuts(visible);
  const groups = useMemo(() => groupShortcuts(list ?? []), [list]);

  const pick = (sc: Shortcut) => {
    if (!sc.items.length) {
      Alert.alert(sc.name, 'Phím tắt này chưa có nội dung. Giữ tay lên tin nhắn (vd. trong My Documents) → "Thêm vào phím tắt".');
      return;
    }
    Alert.alert(`Gửi "${sc.name}"?`, shortcutSummary(sc), [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Gửi', onPress: () => { onClose(); onSend(sc); } },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <Text style={styles.title}>Phím tắt</Text>
            <TouchableOpacity onPress={() => { onClose(); onManage(); }} hitSlop={8} style={styles.manageBtn}>
              <Ionicons name="settings-outline" size={16} color={colors.primary} />
              <Text style={styles.manage}>Quản lý</Text>
            </TouchableOpacity>
          </View>
          {list === null ? <ActivityIndicator style={{ margin: 30 }} color={colors.primary} /> : (
            <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
              {groups.map((g) => (
                <View key={g.title}>
                  <Text style={styles.section}>{g.title}</Text>
                  <View style={styles.grid}>
                    {g.data.map((sc) => (
                      <TouchableOpacity key={sc.id} style={styles.card} onPress={() => pick(sc)} activeOpacity={0.7}>
                        <Cover sc={sc} size={64} />
                        <Text style={styles.cardName} numberOfLines={1}>{sc.name}</Text>
                        <Text style={[styles.cardSub, !sc.items.length && styles.cardEmpty]} numberOfLines={1}>{shortcutSummary(sc)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              {!groups.length ? <Text style={styles.empty}>Chưa có phím tắt. Bấm "Quản lý" để tạo.</Text> : null}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Chon phim tat de THEM tin dang giu vao (hoac tao phim tat moi)
export function ShortcutPicker({ visible, count, onClose, onPick }: {
  visible: boolean; count: number; onClose: () => void; onPick: (sc: Shortcut) => void;
}) {
  const { api } = useApp();
  const insets = useSafeAreaInsets();
  const { list, reload } = useShortcuts(visible);
  const groups = useMemo(() => groupShortcuts(list ?? []), [list]);

  const createNew = () => {
    Alert.prompt('Phím tắt mới', 'Đặt tên (vd. Phòng 201, Quy định)', async (name) => {
      if (!name?.trim() || !api) return;
      try { const sc = await api.createShortcut(name.trim(), 'Thông tin'); await reload(); onPick(sc); }
      catch (e: any) { Alert.alert('Lỗi', e.message); }
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <Text style={[styles.title, { paddingHorizontal: 16, marginBottom: 4 }]}>Thêm {count > 1 ? `${count} mục` : 'tin này'} vào phím tắt</Text>
          {list === null ? <ActivityIndicator style={{ margin: 30 }} color={colors.primary} /> : (
            <ScrollView>
              <TouchableOpacity style={styles.row} onPress={createNew}>
                <View style={[styles.cover, { width: 40, height: 40 }]}><Ionicons name="add" size={24} color={colors.primary} /></View>
                <Text style={[styles.rowName, { color: colors.primary }]}>Tạo phím tắt mới</Text>
              </TouchableOpacity>
              {groups.map((g) => (
                <View key={g.title}>
                  <Text style={styles.section}>{g.title}</Text>
                  {g.data.map((sc) => (
                    <TouchableOpacity key={sc.id} style={styles.row} onPress={() => onPick(sc)}>
                      <Cover sc={sc} size={40} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName}>{sc.name}</Text>
                        <Text style={[styles.cardSub, { textAlign: 'left' }]}>{shortcutSummary(sc)}</Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color={colors.textLight} />
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '78%', paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 2 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  manage: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  section: { fontSize: 13, color: colors.textMuted, fontWeight: '600', paddingHorizontal: 16, marginTop: 12, marginBottom: 6, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  card: { width: '25%', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12 },
  cover: { borderRadius: 14, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverBadge: { position: 'absolute', right: 4, bottom: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 13, color: colors.text, fontWeight: '500', marginTop: 6, textAlign: 'center' },
  cardSub: { fontSize: 11, color: colors.textMuted, marginTop: 1, textAlign: 'center' },
  cardEmpty: { color: colors.textLight, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: colors.textMuted, margin: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  rowName: { fontSize: 16, color: colors.text },
});
