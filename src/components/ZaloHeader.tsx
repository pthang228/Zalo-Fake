import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

// Header xanh kieu Zalo, co o tim kiem + cac icon ben phai
export function ZaloHeader({
  search, onSearchChange, placeholder = 'Tìm kiếm', actions = [], title,
}: {
  search?: string;
  onSearchChange?: (t: string) => void;
  placeholder?: string;
  actions?: HeaderAction[];
  title?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      {title ? (
        <Text style={styles.title}>{title}</Text>
      ) : (
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.85)" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.75)"
            autoCapitalize="none"
          />
        </View>
      )}
      {actions.map((a, i) => (
        <TouchableOpacity key={i} onPress={a.onPress} style={styles.action} hitSlop={8}>
          <Ionicons name={a.icon} size={24} color="#fff" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.headerBlue, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, gap: 10 },
  title: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '700' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.searchBarBg, borderRadius: 18, paddingHorizontal: 12, height: 36 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, padding: 0 },
  action: { padding: 4 },
});
