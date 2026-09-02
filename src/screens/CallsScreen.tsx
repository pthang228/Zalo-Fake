import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Call } from '../types';
import { useFocusEffect } from '@react-navigation/native';

function callLabel(c: Call) {
  const kind = c.call_type === 'video' ? 'Video' : 'Thoai';
  const dir = c.direction === 'incoming' ? 'Den' : 'Di';
  const state = c.state === 'missed' ? ' · Nho' : '';
  return `${kind} · ${dir}${state}`;
}

export function CallsScreen() {
  const { api, activeAccount, subscribe } = useApp();
  const [calls, setCalls] = useState<Call[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!api || !activeAccount) { setCalls([]); return; }
    try { setCalls(await api.listCalls(activeAccount.id)); } catch { /* */ }
  }, [api, activeAccount]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const unsub = subscribe((ev) => {
      if (ev.type === 'call' && ev.accountId === activeAccount?.id) load();
    });
    return unsub;
  }, [subscribe, activeAccount, load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={null} name={item.peer_name || item.peer_id} size={44} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.peer_name || item.peer_id || 'Khong ro'}</Text>
              <Text style={[styles.label, item.state === 'missed' && styles.missed]}>{callLabel(item)}</Text>
            </View>
            <Text style={styles.time}>{new Date(item.ts).toLocaleString()}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<Text style={styles.empty}>Chua co cuoc goi nao.</Text>}
        contentContainerStyle={calls.length === 0 && styles.grow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  label: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  missed: { color: colors.danger },
  time: { fontSize: 11, color: colors.textMuted },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 72 },
  empty: { textAlign: 'center', color: colors.textMuted },
  grow: { flexGrow: 1, justifyContent: 'center' },
});
