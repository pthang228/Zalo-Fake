import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, avatarPalette } from '../theme';

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] || '';
  return last.charAt(0).toUpperCase();
}

function hashColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return avatarPalette[Math.abs(h) % avatarPalette.length];
}

export function Avatar({
  uri, name, size = 52, online = false, showPresence = false,
}: { uri?: string | null; name?: string | null; size?: number; online?: boolean; showPresence?: boolean }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  const dot = Math.max(10, size * 0.24);
  return (
    <View>
      {uri ? (
        <Image source={{ uri }} style={[style, styles.img]} contentFit="cover" transition={150} />
      ) : (
        <View style={[style, styles.fallback, { backgroundColor: hashColor(name || '?') }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials(name)}</Text>
        </View>
      )}
      {showPresence && online && (
        <View style={[styles.presence, { width: dot, height: dot, borderRadius: dot / 2, right: 0, bottom: 0 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: colors.bgMuted },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '700' },
  presence: { position: 'absolute', backgroundColor: colors.online, borderWidth: 2, borderColor: '#fff' },
});
