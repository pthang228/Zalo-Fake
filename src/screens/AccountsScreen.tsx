import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Account, PhoneSyncStatus } from '../types';

export function AccountsScreen({ navigation }: any) {
  const { accounts, activeAccountId, setActiveAccount, refreshAccounts, api, disconnect, wsConnected } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [phoneSync, setPhoneSync] = useState<Record<string, PhoneSyncStatus>>({});
  const mounted = useRef(true);
  const watching = useRef(new Set<string>()); // tai khoan dang theo doi trong phien nay -> moi bao ket qua
  useEffect(() => () => { mounted.current = false; }, []);

  const running = (s?: PhoneSyncStatus) => !!s && !['idle', 'done', 'error', 'cancelled'].includes(s.state);

  // Hoi trang thai dong bo moi 2 giay cho den khi xong; xong thi bao ket qua 1 lan
  const watchSync = useCallback(async (acc: Account) => {
    watching.current.add(acc.id);
    for (;;) {
      let s: PhoneSyncStatus;
      try { s = await api!.phoneSyncStatus(acc.id); } catch { return; }
      if (!mounted.current) return;
      setPhoneSync((p) => ({ ...p, [acc.id]: s }));
      if (!running(s)) {
        if (watching.current.delete(acc.id)) {
          if (s.state === 'done') { Alert.alert('Đồng bộ xong', s.message); refreshAccounts(); }
          else if (s.state === 'error') Alert.alert('Đồng bộ lỗi', s.message);
        }
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }, [api, refreshAccounts]);

  // Mo man hinh ma dang co lan dong bo chay nen -> tiep tuc theo doi
  useEffect(() => {
    if (!api) return;
    accounts.forEach(async (a) => {
      try {
        const s = await api.phoneSyncStatus(a.id);
        if (mounted.current && running(s) && !watching.current.has(a.id)) watchSync(a);
      } catch { /* */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, accounts.length]);

  const onPhoneSync = (acc: Account) => {
    Alert.alert(
      'Đồng bộ từ điện thoại',
      'Zalo trên điện thoại sẽ hiện thông báo. Bạn mở Zalo và bấm "ĐỒNG BỘ NGAY" để gửi tin nhắn cũ sang đây.\n\nTài khoản sẽ tạm ngắt vài chục giây trong lúc đồng bộ.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Bắt đầu',
          onPress: async () => {
            try {
              const s = await api!.startPhoneSync(acc.id);
              setPhoneSync((p) => ({ ...p, [acc.id]: s }));
              watchSync(acc);
            } catch (e: any) { Alert.alert('Không bắt đầu được', e.message); }
          },
        },
      ],
    );
  };

  const onCancelPhoneSync = async (acc: Account) => {
    try { await api!.cancelPhoneSync(acc.id); } catch (e: any) { Alert.alert('Lỗi', e.message); }
  };

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
          {running(phoneSync[item.id]) ? (
            <View style={styles.syncRow}>
              <Text style={styles.syncMsg} numberOfLines={3}>{phoneSync[item.id].message}</Text>
              <TouchableOpacity onPress={() => onCancelPhoneSync(item)}><Text style={styles.syncCancel}>Huỷ</Text></TouchableOpacity>
            </View>
          ) : null}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => onSync(item)} style={styles.iconBtn}><Text style={styles.iconTxt}>⟳</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onPhoneSync(item)} disabled={running(phoneSync[item.id])} style={[styles.iconBtn, running(phoneSync[item.id]) && { opacity: 0.4 }]}><Text style={styles.iconTxt}>📲</Text></TouchableOpacity>
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
  syncRow: { marginTop: 6, gap: 4 },
  syncMsg: { fontSize: 12, color: colors.primary },
  syncCancel: { fontSize: 12, color: colors.danger, fontWeight: '600' },
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
