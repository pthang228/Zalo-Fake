import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Account } from '../types';

export function AccountsScreen({ navigation }: any) {
  const { accounts, activeAccountId, setActiveAccount, refreshAccounts, api, disconnect, wsConnected } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAccounts();
    setRefreshing(false);
  }, [refreshAccounts]);

  const onRemove = (acc: Account) => {
    Alert.alert('Tai khoan', `${acc.display_name || acc.id}`, [
      { text: 'Huy', style: 'cancel' },
      { text: 'Dang xuat', onPress: async () => { await api?.removeAccount(acc.id, false); refreshAccounts(); } },
      { text: 'Xoa han', style: 'destructive', onPress: async () => { await api?.removeAccount(acc.id, true); refreshAccounts(); } },
    ]);
  };

  const onSync = async (acc: Account) => {
    try {
      await api?.syncContacts(acc.id);
      await api?.fetchHistory(acc.id, 50);
      Alert.alert('Dong bo', 'Dang keo danh ba + lich su ve. Kiem tra tab Tin nhan.');
    } catch (e: any) { Alert.alert('Loi', e.message); }
  };

  const renderItem = ({ item }: { item: Account }) => {
    const active = item.id === activeAccountId;
    return (
      <TouchableOpacity style={[styles.card, active && styles.cardActive]} onPress={() => setActiveAccount(item.id)}>
        <Avatar uri={item.avatar} name={item.display_name || item.id} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.display_name || item.id}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: item.online ? colors.online : colors.offline }]} />
            <Text style={styles.status}>
              {item.online ? 'Dang hoat dong' : item.status === 'error' ? 'Loi' : 'Ngoai tuyen'}
            </Text>
            {active && <Text style={styles.activeTag}> · Dang chon</Text>}
          </View>
          {item.last_error ? <Text style={styles.err} numberOfLines={1}>{item.last_error}</Text> : null}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onSync(item)} style={styles.iconBtn}><Text style={styles.iconTxt}>⟳</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove(item)} style={styles.iconBtn}><Text style={[styles.iconTxt, { color: colors.danger }]}>⋯</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.wsBar}>
        <View style={[styles.dot, { backgroundColor: wsConnected ? colors.online : colors.danger }]} />
        <Text style={styles.wsText}>{wsConnected ? 'Da ket noi backend (realtime)' : 'Mat ket noi backend...'}</Text>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(a) => a.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>Chua co tai khoan. Bam "Them tai khoan Zalo".</Text>}
        contentContainerStyle={accounts.length === 0 && styles.emptyWrap}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddAccount')}>
          <Text style={styles.addBtnText}>+ Them tai khoan Zalo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.disconnect} onPress={() => {
          Alert.alert('Doi backend', 'Ngat va nhap lai dia chi backend?', [
            { text: 'Huy', style: 'cancel' },
            { text: 'Ngat', style: 'destructive', onPress: () => disconnect() },
          ]);
        }}>
          <Text style={styles.disconnectText}>Doi dia chi backend</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMuted },
  wsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  wsText: { fontSize: 13, color: colors.textMuted },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, marginHorizontal: 12, marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  cardActive: { borderColor: colors.primary },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  status: { fontSize: 13, color: colors.textMuted },
  activeTag: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  err: { fontSize: 11, color: colors.danger, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { fontSize: 20, color: colors.primary },
  empty: { textAlign: 'center', color: colors.textMuted, paddingHorizontal: 40 },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  footer: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disconnect: { alignItems: 'center', paddingVertical: 6 },
  disconnectText: { color: colors.textMuted, fontSize: 14 },
});
