import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';

// Bat loi render de tranh man hinh trang - hien ro loi de sua.
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>⚠️ App gặp lỗi</Text>
          <ScrollView style={styles.box}>
            <Text style={styles.msg}>{this.state.error.message}</Text>
            <Text style={styles.stack}>{this.state.error.stack}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.btn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.btnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 70, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: '700', color: colors.danger, marginBottom: 12 },
  box: { flex: 1, backgroundColor: colors.bgMuted, borderRadius: 10, padding: 12 },
  msg: { fontSize: 15, color: colors.text, fontWeight: '600', marginBottom: 10 },
  stack: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' },
  btn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginVertical: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
