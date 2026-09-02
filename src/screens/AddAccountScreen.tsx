import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { colors } from '../theme';

type Method = 'cookie' | 'qr';

export function AddAccountScreen({ navigation }: any) {
  const { api, refreshAccounts, subscribe } = useApp();
  const [method, setMethod] = useState<Method>('cookie');
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);

  // Tranh cap nhat state sau khi man hinh da bi huy (loi "out tab la crash")
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Nghe ma QR + ket qua dang nhap tu WebSocket
  useEffect(() => {
    const unsub = subscribe((ev) => {
      if (!mounted.current) return;
      if (ev.type === 'qr' && typeof ev.image === 'string') {
        setQrImage(ev.image);
      } else if (ev.type === 'qr_success') {
        refreshAccounts();
        setBusy(false); setQrImage(null);
        Alert.alert('Thành công', 'Đã thêm tài khoản Zalo.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else if (ev.type === 'qr_failed') {
        setBusy(false); setQrImage(null);
        Alert.alert('QR thất bại', ev.error || 'Vui lòng thử lại.');
      }
    });
    return unsub;
  }, [subscribe, refreshAccounts, navigation]);

  const onLoginCookie = async () => {
    let payload: any;
    try {
      payload = JSON.parse(json);
    } catch {
      return Alert.alert('JSON sai', 'Dan dung JSON tu extension ZaloDataExtractor (gom cookie, imei, userAgent).');
    }
    const cookie = payload.cookie ?? payload.cookies;
    const imei = payload.imei;
    const userAgent = payload.userAgent ?? payload.userAgentString ?? payload.user_agent;
    if (!cookie || !imei || !userAgent) {
      return Alert.alert('Thieu du lieu', 'JSON phai co du: cookie, imei, userAgent.');
    }
    setBusy(true);
    try {
      await api?.loginCookie({ cookie, imei, userAgent });
      await refreshAccounts();
      if (mounted.current) {
        Alert.alert('Thanh cong', 'Da them tai khoan.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (e: any) {
      if (mounted.current) Alert.alert('Dang nhap that bai', e.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const onLoginQR = async () => {
    setBusy(true);
    setQrImage(null);
    try {
      // Chi KHOI DONG (tra ve ngay). Ma QR + ket qua se den qua WebSocket.
      await api?.loginQR();
    } catch (e: any) {
      if (mounted.current) { setBusy(false); Alert.alert('Không khởi động được QR', e.message); }
    }
    // Khong tat busy o day: cho su kien qr_success / qr_failed tu WebSocket.
  };

  const qrUri = typeof qrImage === 'string' && qrImage.length > 0
    ? (qrImage.startsWith('data:') ? qrImage : `data:image/png;base64,${qrImage}`)
    : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, method === 'cookie' && styles.tabActive]} onPress={() => setMethod('cookie')}>
            <Text style={[styles.tabText, method === 'cookie' && styles.tabTextActive]}>Cookie (khuyen nghi)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, method === 'qr' && styles.tabActive]} onPress={() => setMethod('qr')}>
            <Text style={[styles.tabText, method === 'qr' && styles.tabTextActive]}>Ma QR</Text>
          </TouchableOpacity>
        </View>

        {method === 'cookie' ? (
          <View>
            <Text style={styles.info}>
              1. Cai extension <Text style={styles.bold}>ZaloDataExtractor</Text> tren Chrome{'\n'}
              2. Dang nhap Zalo Web, bam extract{'\n'}
              3. Dan JSON (gom cookie, imei, userAgent) vao o duoi
            </Text>
            <Text style={styles.warn}>
              ⚠️ Sau khi them, dung mo Zalo Web nua (se da phien lang nghe).
            </Text>
            <TextInput
              style={styles.textarea}
              value={json}
              onChangeText={setJson}
              placeholder='{"cookie": [...], "imei": "...", "userAgent": "..."}'
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={[styles.button, busy && styles.disabled]} onPress={onLoginCookie} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Dang nhap</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.qrWrap}>
            <Text style={styles.warn}>
              ⚠️ QR tao phien moi, co the da phien Zalo Web dang mo (khong sao neu ban khong dung Zalo Web).
            </Text>
            {busy && !qrUri ? (
              <View style={styles.qrBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.qrHint}>Dang tao ma QR... (co the mat vai giay)</Text>
                <Text style={styles.qrNote}>Ban co the roi man hinh nay — sau khi quet xong, tai khoan se tu hien o tab "Tai khoan".</Text>
              </View>
            ) : qrUri ? (
              <View style={styles.qrBox}>
                <Image source={{ uri: qrUri }} style={styles.qrImage} resizeMode="contain" />
                <Text style={styles.qrHint}>Mo Zalo dien thoai → Quet QR → quet ma nay</Text>
                <Text style={styles.qrNote}>Roi man hinh cung khong sao, dang nhap van chay nen.</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.button} onPress={onLoginQR}>
                <Text style={styles.buttonText}>Tao ma QR</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20 },
  tabs: { flexDirection: 'row', backgroundColor: colors.bgMuted, borderRadius: 10, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: colors.bg },
  tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: colors.primary },
  info: { color: colors.text, lineHeight: 22, marginBottom: 12 },
  bold: { fontWeight: '700' },
  warn: { color: '#B8860B', backgroundColor: '#FFF7E0', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 14 },
  textarea: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 160, textAlignVertical: 'top', fontSize: 13, backgroundColor: colors.bgMuted, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  qrWrap: { alignItems: 'stretch' },
  qrBox: { alignItems: 'center', marginTop: 20, gap: 14 },
  qrImage: { width: 240, height: 240, backgroundColor: colors.bgMuted, borderRadius: 12 },
  qrHint: { color: colors.textMuted },
  qrNote: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },
});
