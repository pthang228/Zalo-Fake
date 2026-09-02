import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableHighlight, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Message, Thread } from '../types';

export function SearchScreen({ route, navigation }: any) {
  const { threadId, threadName } = route.params || {};
  const { api, activeAccount } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Record<string, Thread>>({});
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: threadName ? `Tìm trong hội thoại` : 'Tìm tin nhắn' });
  }, [navigation, threadName]);

  useEffect(() => {
    (async () => {
      if (!api || !activeAccount) return;
      try {
        const list = await api.listThreads(activeAccount.id);
        const map: Record<string, Thread> = {};
        list.forEach((t) => { map[t.id] = t; });
        setThreads(map);
      } catch { /* */ }
    })();
  }, [api, activeAccount]);

  const runSearch = useCallback(async (q: string) => {
    if (!api || !activeAccount || q.trim().length < 1) { setResults([]); return; }
    setLoading(true);
    try { setResults(await api.searchMessages(activeAccount.id, q.trim(), threadId)); }
    catch { /* */ } finally { setLoading(false); }
  }, [api, activeAccount, threadId]);

  const onChange = (t: string) => {
    setQuery(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(t), 350);
  };

  const openResult = (m: Message) => {
    const th = threads[m.thread_id];
    navigation.navigate('Chat', { threadId: m.thread_id, threadType: m.thread_type, name: th?.name || threadName, avatar: th?.avatar });
  };

  const hint = useMemo(() => query.trim().length < 1 ? 'Nhập từ khóa để tìm' : (results.length === 0 && !loading ? 'Không tìm thấy tin nhắn' : ''), [query, results, loading]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput style={styles.input} value={query} onChangeText={onChange} placeholder="Tìm tin nhắn..." placeholderTextColor={colors.textLight} autoFocus />
      </View>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}
      <FlatList
        data={results}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => {
          const th = threads[item.thread_id];
          return (
            <TouchableHighlight underlayColor={colors.separator} onPress={() => openResult(item)}>
              <View style={styles.row}>
                <Avatar uri={th?.avatar} name={th?.name || item.sender_name || item.thread_id} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{th?.name || item.sender_name || item.thread_id}</Text>
                  <Text style={styles.snippet} numberOfLines={1}>{item.is_self ? 'Bạn: ' : ''}{item.content}</Text>
                </View>
                <Text style={styles.time}>{new Date(item.ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</Text>
              </View>
            </TouchableHighlight>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={hint ? <Text style={styles.hint}>{hint}</Text> : null}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgMuted, borderRadius: 20, paddingHorizontal: 14, height: 42, margin: 12 },
  input: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  snippet: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  time: { fontSize: 12, color: colors.textLight },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 72 },
  hint: { textAlign: 'center', color: colors.textMuted, marginTop: 30 },
});
