import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../state/AppContext';
import { ThreadItem } from '../components/ThreadItem';
import { ZaloHeader } from '../components/ZaloHeader';
import { colors } from '../theme';
import { Thread } from '../types';

export function ThreadsScreen({ navigation }: any) {
  const { api, activeAccount, subscribe, isMuted } = useApp();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!api || !activeAccount) { setThreads([]); return; }
    try { setThreads(await api.listThreads(activeAccount.id)); } catch { /* */ }
  }, [api, activeAccount]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const unsub = subscribe((ev) => {
      if (ev.type === 'connected') { load(); return; }
      if ((ev.type === 'message' || ev.type === 'history_message' || ev.type === 'history_synced' || ev.type === 'contacts_synced')
        && (!('accountId' in ev) || ev.accountId === activeAccount?.id)) {
        load();
      }
    });
    return unsub;
  }, [subscribe, activeAccount, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (api && activeAccount) { try { await api.syncContacts(activeAccount.id); } catch { /* */ } }
    await load();
    setRefreshing(false);
  }, [api, activeAccount, load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return threads;
    const q = query.toLowerCase();
    return threads.filter((t) => (t.name || '').toLowerCase().includes(q) || (t.last_message || '').toLowerCase().includes(q));
  }, [threads, query]);

  const onReadAll = useCallback(async () => {
    if (!api || !activeAccount) return;
    try { await api.markAllRead(activeAccount.id); await load(); } catch { /* */ }
  }, [api, activeAccount, load]);

  const onLongPressThread = (t: Thread) => {
    if (t.unread <= 0 || !api || !activeAccount) return;
    Alert.alert(t.name || 'Hội thoại', undefined, [
      { text: 'Đánh dấu đã đọc', onPress: async () => { await api.markRead(activeAccount.id, t.id); load(); } },
      { text: 'Đóng', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <ZaloHeader
        search={query}
        onSearchChange={setQuery}
        actions={[
          { icon: 'checkmark-done-outline', onPress: onReadAll },
          { icon: 'add', onPress: () => navigation.navigate('AddAccount') },
        ]}
      />

      {!activeAccount ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Chưa đăng nhập tài khoản Zalo</Text>
          <Text style={styles.emptySub}>Vào tab "Cá nhân" để thêm tài khoản.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <ThreadItem
              thread={item}
              muted={isMuted(item.id)}
              onPress={() => navigation.navigate('Chat', { threadId: item.id, threadType: item.type, name: item.name, avatar: item.avatar })}
              onLongPress={() => onLongPressThread(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>{query ? 'Không tìm thấy' : 'Chưa có hội thoại'}</Text>
              <Text style={styles.emptySub}>{query ? 'Thử từ khóa khác' : 'Kéo xuống để đồng bộ, hoặc chờ tin nhắn mới.'}</Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 && styles.grow}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 82 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  grow: { flexGrow: 1 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
