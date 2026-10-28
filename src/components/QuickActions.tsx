import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Nut chuyen tiep tron canh anh/video/file (giong Zalo dien thoai).
// Tin cua minh -> nut ben trai bong bong; tin cua khach -> ben phai.
export function ForwardButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.fwd, pressed && styles.pressed]}>
      <Ionicons name="arrow-redo" size={17} color="#1B1B1B" />
    </Pressable>
  );
}

// Nut tim nho o goc duoi bong bong: cham = tha tim
export function HeartButton({ onPress, self }: { onPress: () => void; self: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.heart, self ? styles.heartSelf : styles.heartOther, pressed && styles.pressed]}>
      <Ionicons name="heart-outline" size={15} color={colors.textMuted} />
    </Pressable>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 };

const styles = StyleSheet.create({
  fwd: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginHorizontal: 8, ...shadow },
  heart: { position: 'absolute', bottom: -12, width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadow },
  heartSelf: { right: -4 },
  heartOther: { right: -10 },
  pressed: { opacity: 0.6 },
});
