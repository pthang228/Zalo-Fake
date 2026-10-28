import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Thread } from '../types';

type Tab = 'recent' | 'group' | 'user';
const TABS: { key: Tab; label: string }[] = [
  { key: 'recent', label: 'Gần đây' },
  { key: 'group', label: 'Nhóm' },
  { key: 'user', label: 'Bạn bè' },
];
const MAX_TARGETS = 50;

// Bo dau de tim "huong" ra "Hương"
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// Chuyen tiep kieu Zalo: xem truoc noi dung (ca album), tim + loc hoi thoai, chon nhieu nguoi,
// hang avatar da chon (bam de bo), them loi nhan roi gui.
export function ForwardScreen({ route, navigation }: any) {
  const { msgId, msgIds, text, preview, thumbs = [] } = route.params as {
    msgId?: string; msgIds?: string[]; text?: string; preview?: string; thumbs?: string[];
  };
  const ids = msgIds?.length ? msgIds : msgId ? [msgId] : [];
  const { api, activeAccount } = useApp();
  const insets = useSafeAreaInsets();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [cloud, setCloud] = useState<Thread | null>(null);
  const [selected, setSelected] = useState<Thread[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: selected.length ? `Đã chọn ${selected.length}` : 'Chuyển tiếp',
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, selected.length]);

  useEffect(() => {
    (async () => {
      if (!api || !activeAccount) return;
      try {
        const r = await api.listThreadsWithCloud(activeAccount.id, 2000);
        setThreads(r.threads); setCloud(r.cloud);
      } catch { setThreads([]); }
    })();
  }, [api, activeAccount]);

  const isOn = (t: Thread) => selected.some((s) => s.id === t.id);
  const toggle = (t: Thread) => setSelected((prev) => {
    if (prev.some((s) => s.id === t.id)) return prev.filter((s) => s.id !== t.id);
    if (prev.length >= MAX_TARGETS) { Alert.alert('Tối đa 50 hội thoại', 'Mỗi lần chuyển tiếp chọn tối đa 50 hội thoại.'); return prev; }
    return [...prev, t];
  });

  const filtered = useMemo(() => {
    const list = (threads ?? []).filter((t) => (tab === 'recent' || t.type === tab) && t.id !== cloud?.id);
    const q = fold(query.trim());
    // My Documents ghim dau tab "Gan day"
    if (!q) return tab === 'recent' ? (cloud ? [cloud, ...list] : list) : [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    if (cloud && fold(cloud.name || '').includes(q)) list.unshift(cloud);
    return list.filter((t) => fold(t.name || t.id).includes(q));
  }, [threads, query, tab, cloud]);

  const onSend = useCallback(async () => {
    if (!api || !activeAccount || !selected.length || sending) return;
    setSending(true);
    try {
      const r = await api.forwardMessage(activeAccount.id, {
        msgIds: ids,
        text,
        note: note.trim() || undefined,
        targets: selected.map((t) => ({ id: t.id, type: t.type })),
      });
      const failed = r.failed ?? [];
      if (failed.length) {
        const name = (id: string) => selected.find((t) => t.id === id)?.name || id;
        Alert.alert('Chuyển tiếp chưa hết', `Đã gửi ${r.forwarded}/${selected.length}. Không gửi được: ${failed.map((f) => name(f.id)).join(', ')}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Không chuyển tiếp được', e.message);
    } finally { setSending(false); }
  }, [api, activeAccount, selected, sending, ids, text, note, navigation]);

  const renderRow = ({ item }: { item: Thread }) => {
    const on = isOn(item);
    return (
      <TouchableOpacity style={styles.row} onPress={() => toggle(item)} activeOpacity={0.6}>
        <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? colors.primary : colors.textLight} />
        {item.id === cloud?.id && !item.avatar
          ? <View style={styles.cloudAvatar}><Ionicons name="cloud" size={24} color="#fff" /></View>
          : <Avatar uri={item.avatar} name={item.name || item.id} size={46} />}
        <View style={styles.rowText}>
          <Text style={styles.name} numberOfLines={1}>{item.name || item.id}</Text>
          {item.type === 'group' ? <Text style={styles.sub}>Nhóm</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput} value={query} onChangeText={setQuery}
          placeholder="Tìm kiếm" placeholderTextColor={colors.textLight} autoCorrect={false} clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
            {tab === t.key ? <View style={styles.tabLine} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {threads === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          renderItem={renderRow}
          extraData={selected}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={20}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<Text style={styles.empty}>{query ? 'Không tìm thấy' : 'Không có hội thoại'}</Text>}
        />
      )}

      {/* Khung duoi: nguoi da chon + noi dung + loi nhan + nut gui */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {selected.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {selected.map((t) => (
              <TouchableOpacity key={t.id} style={styles.chip} onPress={() => toggle(t)}>
                <Avatar uri={t.avatar} name={t.name || t.id} size={44} />
                <View style={styles.chipX}><Ionicons name="close" size={11} color="#fff" /></View>
                <Text style={styles.chipName} numberOfLines={1}>{t.name || t.id}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.previewRow}>
          {thumbs.length ? (
            <View style={styles.thumbs}>
              {thumbs.slice(0, 4).map((u, i) => (
                <View key={i} style={styles.thumbWrap}>
                  <Image source={{ uri: u }} style={styles.thumb} contentFit="cover" />
                  {i === 3 && thumbs.length > 4 ? <View style={styles.more}><Text style={styles.moreText}>+{thumbs.length - 4}</Text></View> : null}
                </View>
              ))}
            </View>
          ) : (
            <Ionicons name="arrow-redo" size={18} color={colors.primary} />
          )}
          <Text style={styles.previewText} numberOfLines={2}>{thumbs.length > 1 ? `${thumbs.length} ảnh` : preview || text}</Text>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.noteInput} value={note} onChangeText={setNote} multiline
            placeholder="Nhập tin nhắn kèm theo" placeholderTextColor={colors.textLight}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !selected.length && styles.sendBtnOff]}
            onPress={onSend} disabled={!selected.length || sending}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgMuted, borderRadius: 10, paddingHorizontal: 12, height: 38, marginHorizontal: 12, marginTop: 10 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginTop: 6 },
  tab: { paddingHorizontal: 16, paddingTop: 10, alignItems: 'center' },
  tabText: { fontSize: 15, color: colors.textMuted, paddingBottom: 8 },
  tabTextOn: { color: colors.text, fontWeight: '600' },
  tabLine: { height: 2, alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 1 },
  cloudAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8 },
  rowText: { flex: 1 },
  name: { fontSize: 16, color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 106 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.bg, paddingTop: 8 },
  chips: { paddingHorizontal: 10, gap: 10, paddingBottom: 6 },
  chip: { width: 58, alignItems: 'center' },
  chipX: { position: 'absolute', top: 0, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.textMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  chipName: { fontSize: 11, color: colors.text, marginTop: 3, maxWidth: 58 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, padding: 8, backgroundColor: colors.bgMuted, borderRadius: 10 },
  thumbs: { flexDirection: 'row', gap: 3 },
  thumbWrap: { width: 38, height: 38 },
  thumb: { width: 38, height: 38, borderRadius: 6, backgroundColor: colors.border },
  more: { ...StyleSheet.absoluteFillObject, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  previewText: { flex: 1, color: colors.text, fontSize: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  noteInput: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: colors.bgMuted, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: colors.text },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: colors.textLight },
});
