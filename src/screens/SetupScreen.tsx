import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { ApiClient } from '../api/client';
import { colors } from '../theme';
import { DEFAULT_BACKEND_URL, DEFAULT_API_TOKEN } from '../appConfig';

export function SetupScreen({ navigation }: any) {
  const { configure, settings } = useApp();
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl || DEFAULT_BACKEND_URL);
  const [token, setToken] = useState(settings?.token || DEFAULT_API_TOKEN);
  const [busy, setBusy] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const onConnect = async () => {
    const url = baseUrl.trim();
    const tk = token.trim();
    if (!url) return Alert.alert('Thieu dia chi', 'Nhap dia chi backend');
    setBusy(true);
    const client = new ApiClient(url, tk);

    // Buoc 1: kiem tra KET NOI MANG (health khong can token)
    try {
      await client.health();
    } catch (e: any) {
      setBusy(false);
      return Alert.alert(
        'Khong ket noi duoc backend',
        `Loi: ${e.message}\n\n• Kiem tra dia chi: ${url}\n• Backend da chay chua?\n• Dien thoai cung WiFi?\n• Neu trinh duyet mo duoc ma app khong: co the do Windows Firewall.`
      );
    }

    // Buoc 2: kiem tra TOKEN (goi endpoint co auth)
    try {
      await client.listAccounts();
    } catch (e: any) {
      setBusy(false);
      const msg = /unauthorized|401/i.test(e.message)
        ? 'API Token khong dung. Nhap dung API_TOKEN trong file backend/.env.'
        : e.message;
      return Alert.alert('Sai API Token', msg);
    }

    // OK
    try {
      await configure({ baseUrl: url, token: tk });
      navigation?.goBack?.();
    } catch (e: any) {
      Alert.alert('Loi', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logo}><Text style={styles.logoText}>Zalo<Text style={{ color: colors.text }}>Fake</Text></Text></View>
        <Text style={styles.subtitle}>Ket noi toi backend engine cua ban</Text>

        <Text style={styles.label}>Dia chi backend</Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder="http://192.168.1.10:8080"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.hint}>Dia chi may chay backend trong mang LAN (khong dung localhost tren dien thoai).</Text>

        <View style={styles.labelRow}>
          <Text style={styles.label}>API Token</Text>
          <TouchableOpacity onPress={() => setShowToken((s) => !s)}>
            <Text style={styles.toggle}>{showToken ? 'An' : 'Hien'}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="API_TOKEN trong file .env"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!showToken}
        />

        <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={onConnect} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ket noi</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, paddingTop: 80 },
  logo: { alignItems: 'center', marginBottom: 8 },
  logoText: { fontSize: 40, fontWeight: '800', color: colors.primary },
  subtitle: { textAlign: 'center', color: colors.textMuted, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  toggle: { color: colors.primary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: colors.bgMuted },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 32 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
