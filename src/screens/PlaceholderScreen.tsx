import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZaloHeader } from '../components/ZaloHeader';
import { colors } from '../theme';

export function makePlaceholder(title: string, icon: keyof typeof Ionicons.glyphMap) {
  return function PlaceholderScreen() {
    return (
      <View style={styles.container}>
        <ZaloHeader title={title} />
        <View style={styles.center}>
          <Ionicons name={icon} size={64} color={colors.textLight} />
          <Text style={styles.text}>{title}</Text>
          <Text style={styles.sub}>Phần này để đúng bố cục Zalo. Chưa có dữ liệu.</Text>
        </View>
      </View>
    );
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  text: { fontSize: 18, fontWeight: '600', color: colors.textMuted },
  sub: { fontSize: 14, color: colors.textLight },
});
