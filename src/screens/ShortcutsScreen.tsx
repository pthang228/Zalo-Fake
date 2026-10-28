import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useApp } from '../state/AppContext';
import { colors } from '../theme';
import { Shortcut, ShortcutItem } from '../types';
import { groupShortcuts, shortcutCover, shortcutSummary } from '../components/Shortcuts';

// Danh sach phim tat: sap thu tu, tao moi, mo de sua
export function ShortcutsScreen({ navigation }: any) {
  const { api } = useApp();
  const [list, setList] = useState<Shortcut[] | null>(null);

  const load = useCallback(async () => {
    if (!api) return;
    try { setList(await api.listShortcuts()); } catch (e: any) { setList([]); Alert.alert('Lỗi', e.message); }
  }, [api]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = () => {
    Alert.prompt('Phím tắt mới', 'Đặt tên (vd. Phòng 201, Quy định)', async (name) => {
      if (!name?.trim() || !api) return;
      try { const sc = await api.createShortcut(name.trim(), 'Thông tin'); navigation.navigate('ShortcutEdit', { id: sc.id }); }
      catch (e: any) { Alert.alert('Lỗi', e.message); }
    });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Phím tắt',
      headerRight: () => (
        <TouchableOpacity onPress={create} hitSlop={10}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>
      ),
    });
  });

  const move = async (sc: Shortcut, dir: -1 | 1) => {
    if (!api || !list) return;
    const ids = list.map((x) => x.id);
    const i = ids.indexOf(sc.id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setList(ids.map((id) => list.find((x) => x.id === id)!));
    try { setList(await api.reorderShortcuts(ids)); } catch { load(); }
  };

  if (list === null) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  const groups = groupShortcuts(list);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.hint}>Thêm nội dung: mở tin nhắn (vd. My Documents), giữ tay lên ảnh/album/video/tin → "Thêm vào phím tắt".</Text>
      {groups.map((g) => (
        <View key={g.title}>
          <Text style={styles.section}>{g.title}</Text>
          <View style={styles.card}>
            {g.data.map((sc, k) => (
              <TouchableOpacity key={sc.id} style={[styles.row, k > 0 && styles.rowSep]} onPress={() => navigation.navigate('ShortcutEdit', { id: sc.id })}>
                <View style={styles.thumb}>
                  {shortcutCover(sc) ? <Image source={{ uri: shortcutCover(sc)! }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    : <Ionicons name="flash-outline" size={18} color={colors.primary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{sc.name}</Text>
                  <Text style={styles.sub}>{shortcutSummary(sc)}</Text>
                </View>
                <TouchableOpacity onPress={() => move(sc, -1)} hitSlop={6} style={styles.arrow}><Ionicons name="chevron-up" size={18} color={colors.textMuted} /></TouchableOpacity>
                <TouchableOpacity onPress={() => move(sc, 1)} hitSlop={6} style={styles.arrow}><Ionicons name="chevron-down" size={18} color={colors.textMuted} /></TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ItemPreview({ it }: { it: ShortcutItem }) {
  if (it.kind === 'text') return <Text style={styles.itemText} numberOfLines={3}>{it.text}</Text>;
  if (it.kind === 'file') return <Text style={styles.itemText} numberOfLines={1}>📄 {it.name}</Text>;
  return (
    <View style={styles.itemMedia}>
      {it.thumb ? <Image source={{ uri: it.thumb }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : null}
      {it.kind === 'video' ? <View style={styles.play}><Ionicons name="play" size={16} color="#fff" /></View> : null}
    </View>
  );
}

// Sua 1 phim tat: doi ten/nhom, sap xep / xoa tung muc, them tin chu, xoa phim tat
export function ShortcutEditScreen({ route, navigation }: any) {
  const { id } = route.params as { id: string };
  const { api, activeAccount } = useApp();
  const [sc, setSc] = useState<Shortcut | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [newText, setNewText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!api) return;
    const found = (await api.listShortcuts()).find((x) => x.id === id) ?? null;
    setSc(found); setName(found?.name ?? ''); setCategory(found?.category ?? '');
  }, [api, id]);
  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));
  useLayoutEffect(() => { navigation.setOptions({ title: sc?.name || 'Phím tắt' }); }, [navigation, sc?.name]);

  const run = async (fn: () => Promise<Shortcut | void>) => {
    if (busy) return;
    setBusy(true);
    try { const r = await fn(); if (r) setSc(r); } catch (e: any) { Alert.alert('Lỗi', e.message); } finally { setBusy(false); }
  };
  const saveMeta = () => sc && api && (name.trim() !== sc.name || (category.trim() || null) !== sc.category)
    && run(() => api.updateShortcut(sc.id, { name: name.trim() || sc.name, category: category.trim() || null }));
  const order = (items: ShortcutItem[]) => api!.updateShortcut(sc!.id, { itemOrder: items.map((x) => x.id) });
  const moveItem = (i: number, dir: -1 | 1) => {
    if (!sc) return; const items = [...sc.items]; const j = i + dir;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    setSc({ ...sc, items }); run(() => order(items));
  };
  const removeItem = (i: number) => {
    if (!sc) return;
    Alert.alert('Xoá mục này?', undefined, [{ text: 'Huỷ', style: 'cancel' }, {
      text: 'Xoá', style: 'destructive', onPress: () => run(() => order(sc.items.filter((_, k) => k !== i))),
    }]);
  };
  const addText = () => sc && api && activeAccount && newText.trim()
    && run(async () => { const r = await api.addShortcutItems(sc.id, { accountId: activeAccount.id, text: newText.trim() }); setNewText(''); return r.shortcut; });
  // Chon anh/video tu thu vien iPhone (vd. QR, quy dinh, video phong) -> tai len lan luot
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const pickFromPhone = async () => {
    if (!sc || !api || busy) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: 0, quality: 0.9 });
    if (result.canceled || !result.assets?.length) return;
    setBusy(true);
    try {
      let last: Shortcut | null = null;
      for (const [i, a] of result.assets.entries()) {
        setUploadMsg(`Đang tải lên ${i + 1}/${result.assets.length}…`);
        const video = a.type === 'video';
        let thumbUri: string | null = null;
        if (video) { try { thumbUri = (await VideoThumbnails.getThumbnailAsync(a.uri, { time: 500, quality: 0.8 })).uri; } catch { /* khong co anh bia */ } }
        last = await api.uploadShortcutItem(sc.id, {
          uri: a.uri, name: a.fileName || (video ? 'video.mp4' : 'anh.jpg'), mime: a.mimeType || (video ? 'video/mp4' : 'image/jpeg'),
          kind: video ? 'video' : 'image', width: a.width, height: a.height, duration: a.duration ?? undefined, thumbUri,
        });
      }
      if (last) setSc(last);
    } catch (e: any) { Alert.alert('Không tải lên được', e.message); load().catch(() => {}); }
    finally { setBusy(false); setUploadMsg(null); }
  };

  const removeShortcut = () => {
    if (!sc || !api) return;
    Alert.alert(`Xoá phím tắt "${sc.name}"?`, 'Ảnh/video đã lưu trong phím tắt cũng bị xoá.', [{ text: 'Huỷ', style: 'cancel' }, {
      text: 'Xoá', style: 'destructive', onPress: async () => { try { await api.deleteShortcut(sc.id); navigation.goBack(); } catch (e: any) { Alert.alert('Lỗi', e.message); } },
    }]);
  };

  const items = useMemo(() => sc?.items ?? [], [sc]);
  if (!sc) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(it) => it.id}
      ListHeaderComponent={
        <View>
          <View style={styles.card}>
            <View style={styles.field}><Text style={styles.label}>Tên</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} onEndEditing={saveMeta} returnKeyType="done" /></View>
            <View style={[styles.field, styles.rowSep]}><Text style={styles.label}>Nhóm</Text>
              <TextInput style={styles.input} value={category} onChangeText={setCategory} onEndEditing={saveMeta} placeholder="vd. Phòng Haru" placeholderTextColor={colors.textLight} returnKeyType="done" /></View>
          </View>
          <Text style={styles.section}>Nội dung gửi theo thứ tự ({shortcutSummary(sc)})</Text>
          {busy ? <View style={styles.busy}><ActivityIndicator color={colors.primary} />{uploadMsg ? <Text style={styles.sub}>{uploadMsg}</Text> : null}</View> : null}
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={styles.itemRow}>
          <Text style={styles.idx}>{index + 1}</Text>
          <View style={{ flex: 1 }}><ItemPreview it={item} /></View>
          <TouchableOpacity onPress={() => moveItem(index, -1)} hitSlop={6} style={styles.arrow}><Ionicons name="chevron-up" size={18} color={colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity onPress={() => moveItem(index, 1)} hitSlop={6} style={styles.arrow}><Ionicons name="chevron-down" size={18} color={colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity onPress={() => removeItem(index)} hitSlop={6} style={styles.arrow}><Ionicons name="trash-outline" size={18} color={colors.danger} /></TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.hint}>Chưa có nội dung. Giữ tay lên tin nhắn → "Thêm vào phím tắt", hoặc thêm ảnh/video từ máy, tin chữ bên dưới.</Text>}
      ListFooterComponent={
        <View style={{ paddingBottom: 40 }}>
          <TouchableOpacity style={styles.pickBtn} onPress={pickFromPhone} disabled={busy}>
            <Ionicons name="images-outline" size={20} color={colors.primary} />
            <Text style={styles.pickText}>Thêm ảnh/video từ máy</Text>
          </TouchableOpacity>
          <Text style={styles.section}>Thêm tin chữ</Text>
          <View style={styles.addRow}>
            <TextInput style={styles.addInput} value={newText} onChangeText={setNewText} multiline placeholder="Nội dung tin nhắn" placeholderTextColor={colors.textLight} />
            <TouchableOpacity onPress={addText} style={[styles.addBtn, !newText.trim() && { opacity: 0.4 }]} disabled={!newText.trim()}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={removeShortcut} style={styles.delete}><Text style={styles.deleteText}>Xoá phím tắt</Text></TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMuted },
  hint: { fontSize: 13, color: colors.textMuted, margin: 16, lineHeight: 19 },
  section: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginHorizontal: 16, marginTop: 16, marginBottom: 6, textTransform: 'uppercase' },
  card: { backgroundColor: colors.bg, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  rowSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  thumb: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontSize: 16, color: colors.text },
  sub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  arrow: { padding: 4 },
  field: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, minHeight: 46 },
  label: { width: 60, fontSize: 15, color: colors.textMuted },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, marginHorizontal: 12, marginBottom: 6, borderRadius: 10, padding: 8 },
  idx: { width: 20, textAlign: 'center', color: colors.textLight, fontSize: 13 },
  itemText: { fontSize: 14.5, color: colors.text },
  itemMedia: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.bgMuted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  play: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginHorizontal: 12 },
  addInput: { flex: 1, minHeight: 44, maxHeight: 140, backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: colors.text },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 8 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.bg, marginHorizontal: 12, marginTop: 10, borderRadius: 12, paddingVertical: 13 },
  pickText: { color: colors.primary, fontSize: 16, fontWeight: '500' },
  delete: { marginTop: 28, alignItems: 'center', padding: 12 },
  deleteText: { color: colors.danger, fontSize: 16 },
});
