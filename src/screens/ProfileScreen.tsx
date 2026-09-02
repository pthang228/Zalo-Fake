import React, { useState, useCallback } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Account } from '../types';

function Row({ icon, color, label, value, onPress }: { icon: any; color?: string; label: string; value?: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon} size={22} color={color || colors.primary} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textLight} /> : null}
    </TouchableOpacity>
  );
}

export function ProfileScreen({ navigation }: any) {
  const { accounts, activeAccount, activeAccountId, setActiveAccount, api, wsConnected, refreshAccounts } = useApp();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [reconnecting, setReconnecting] = useState<string | null>(null);

  const onReconnect = useCallback(async (acc: Account) => {
    if (!api) return;
    setReconnecting(acc.id);
    try {
      await api.reconnectAccount(acc.id);
      await refreshAccounts();
    } catch (e: any) {
      // Phien het han -> dang nhap lai bang QR/Cookie. KHONG xoa du lieu:
      // dang nhap dung tai khoan nay thi tin nhan cu van con nguyen.
      Alert.alert(
        'Cần đăng nhập lại',
        'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại bằng QR/Cookie.\n\n✅ TIN NHẮN CŨ VẪN GIỮ NGUYÊN — chỉ cần đăng nhập đúng tài khoản này, KHÔNG bị mất dữ liệu.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Đăng nhập QR/Cookie', onPress: () => navigation.navigate('AddAccount') },
        ]
      );
    } finally { setReconnecting(null); }
  }, [api, refreshAccounts, navigation]);

  const onSync = useCallback(async () => {
    if (!api || !activeAccount) return;
    setBusy(true);
    try {
      await api.syncContacts(activeAccount.id);
      await api.fetchHistory(activeAccount.id, 300);
      Alert.alert('Đồng bộ', 'Đang kéo danh bạ + tin nhắn gần đây về.');
    } catch (e: any) { Alert.alert('Lỗi', e.message); } finally { setBusy(false); }
  }, [api, activeAccount]);

  const onRemove = (acc: Account) => {
    Alert.alert(acc.display_name || acc.id, 'Chọn thao tác', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', onPress: async () => { await api?.removeAccount(acc.id, false); refreshAccounts(); } },
      { text: 'Xóa hẳn dữ liệu', style: 'destructive', onPress: async () => { await api?.removeAccount(acc.id, true); refreshAccounts(); } },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}>
      {/* The tai khoan dang chon */}
      <View style={styles.profileCard}>
        <Avatar uri={activeAccount?.avatar} name={activeAccount?.display_name || 'Z'} size={64} />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{activeAccount?.display_name || 'Chưa đăng nhập'}</Text>
          <Text style={styles.profileSub}>{activeAccount?.phone || (activeAccount ? 'Tài khoản Zalo' : 'Thêm tài khoản để bắt đầu')}</Text>
        </View>
        <View style={[styles.wsDot, { backgroundColor: wsConnected ? colors.online : colors.danger }]} />
      </View>

      {/* Danh sach tai khoan (da tai khoan) */}
      <Text style={styles.groupTitle}>Tài khoản Zalo ({accounts.length})</Text>
      <View style={styles.group}>
        {accounts.map((acc) => (
          <TouchableOpacity key={acc.id} style={styles.accRow} onPress={() => acc.online ? setActiveAccount(acc.id) : onReconnect(acc)} onLongPress={() => onRemove(acc)}>
            <Avatar uri={acc.avatar} name={acc.display_name || acc.id} size={40} online={acc.online} showPresence />
            <View style={{ flex: 1 }}>
              <Text style={styles.accName}>{acc.display_name || acc.id}</Text>
              <Text style={styles.accStatus}>{acc.online ? 'Đang hoạt động' : acc.status === 'error' ? 'Lỗi — chạm để đăng nhập lại' : 'Ngoại tuyến — chạm để đăng nhập'}</Text>
            </View>
            {reconnecting === acc.id ? (
              <ActivityIndicator color={colors.primary} />
            ) : acc.online ? (
              acc.id === activeAccountId ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : <View style={{ width: 22 }} />
            ) : (
              <TouchableOpacity style={styles.loginBtn} onPress={() => onReconnect(acc)}>
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.accRow} onPress={() => navigation.navigate('AddAccount')}>
          <View style={styles.addIcon}><Ionicons name="add" size={24} color={colors.primary} /></View>
          <Text style={[styles.accName, { color: colors.primary }]}>Thêm tài khoản Zalo</Text>
        </TouchableOpacity>
      </View>

      {/* Cai dat */}
      <Text style={styles.groupTitle}>Dữ liệu</Text>
      <View style={styles.group}>
        <Row icon="sync-outline" label={busy ? 'Đang đồng bộ...' : 'Đồng bộ danh bạ + tin nhắn'} onPress={busy ? undefined : onSync} />
        <Row icon="cloud-download-outline" label="Kéo thêm lịch sử gần đây" onPress={busy ? undefined : onSync} />
      </View>

      <Text style={styles.groupTitle}>Hệ thống</Text>
      <View style={styles.group}>
        <Row icon="server-outline" label="Đổi địa chỉ backend" value={wsConnected ? 'Đã kết nối' : 'Mất kết nối'} onPress={() => navigation.navigate('Setup')} />
      </View>

      <Text style={styles.note}>⚠️ Cuộc gọi audio/video thật không khả dụng (giới hạn Zalo). Tin cũ trước khi chạy app không kéo lại được.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMuted },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.bg, padding: 16, marginBottom: 8 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 19, fontWeight: '700', color: colors.text },
  profileSub: { fontSize: 14, color: colors.textMuted, marginTop: 3 },
  wsDot: { width: 10, height: 10, borderRadius: 5 },
  groupTitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginHorizontal: 16, marginTop: 16, marginBottom: 6 },
  group: { backgroundColor: colors.bg },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  accName: { fontSize: 16, color: colors.text },
  accStatus: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  addIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center' },
  loginBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  loginBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  rowIcon: { marginRight: 14, width: 24 },
  rowLabel: { flex: 1, fontSize: 16, color: colors.text },
  rowValue: { fontSize: 14, color: colors.textMuted, marginRight: 6 },
  note: { fontSize: 12, color: colors.textLight, margin: 16, lineHeight: 18 },
});
