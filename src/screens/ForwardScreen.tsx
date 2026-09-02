import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Thread } from '../types';

export function ForwardScreen({ route, navigation }: any) {
  const { msgId, text, preview } = route.params as { msgId?: string; text?: string; preview?: string };
  const { api, activeAccount } = useApp();
  const insets = useSafeAreaInsets();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Record<string, Thread>>({});
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: 'Chuyển tiếp' }); }, [navigation]);

  useEffect(() => {
    (async () => {
      if (!api || !activeAccount) return;
      try { setThreads(await api.listThreads(activeAccount.id)); } catch { /* */ }
    })();
  }, [api, activeAccount]);

  const toggle = (t: Thread) => setSelected((prev) => {
    const next = { ...prev };
    if (next[t.id]) delete next[t.id]; else next[t.id] = t;
    return next;
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? threads.filter((t) => (t.name || '').toLowerCase().includes(q)) : threads;
  }, [threads, query]);

  const selectedList = Object.values(selected);

  const onSend = useCallback(async () => {
    if (!api || !activeAccount || selectedList.length === 0 || sending) return;
    setSending(true);
    try {
      await api.forwardMessage(activeAccount.id, {
        msgId,
        text,
        targets: selectedList.map((t) => ({ id: t.id, type: t.type })),
      });
      Alert.alert('Đã chuyển tiếp', `Gửi tới ${selectedList.length} hội thoại.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    } finally { setSending(false); }
  }, [api, activeAccount, selectedList, text, sending, navigation]);

  return (
    <View style={styles.container}>
      {/* Xem truoc noi dung chuyen tiep */}
      <View style={styles.preview}>
        <Ionicons name="arrow-redo" size={18} color={colors.primary} />
        <Text style={styles.previewText} numberOfLines={2}>{preview || text}</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Tìm hội thoại" placeholderTextColor={colors.textLight} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const on = !!selected[item.id];
          return (
            <TouchableOpacity style={styles.row} onPress={() => toggle(item)}>
              <Avatar uri={item.avatar} name={item.name || item.id} size={44} />
              <Text style={styles.name} numberOfLines={1}>{item.name || item.id}</Text>
              <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? colors.primary : colors.textLight} />
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<Text style={styles.empty}>Không có hội thoại</Text>}
      />

      {selectedList.length > 0 && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TouchableOpacity style={styles.sendBtn} onPress={onSend} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Gửi tới {selectedList.length} hội thoại</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  preview: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, backgroundColor: colors.bgMuted, marginHorizontal: 12, marginTop: 12, borderRadius: 10 },
  previewText: { flex: 1, color: colors.text, fontSize: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgMuted, borderRadius: 20, paddingHorizontal: 14, height: 40, margin: 12 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  name: { flex: 1, fontSize: 16, color: colors.text },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 72 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  footer: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.bg },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
