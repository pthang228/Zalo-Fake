import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { colors } from '../theme';

function fmt(sec: number) {
  if (!sec || !isFinite(sec)) return '0:00';
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceBubble({ url, self, onLongPress }: { url: string | null; self: boolean; onLongPress?: () => void }) {
  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);
  const playing = status?.playing;
  const duration = status?.duration || 0;
  const current = status?.currentTime || 0;
  const progress = duration > 0 ? Math.min(current / duration, 1) : 0;

  const toggle = async () => {
    if (!url) return;
    try {
      if (playing) { player.pause(); return; }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      if (status?.didJustFinish || (duration > 0 && current >= duration - 0.1)) {
        await player.seekTo(0);
      }
      player.play();
    } catch { /* */ }
  };

  return (
    <Pressable onPress={toggle} onLongPress={onLongPress} style={[styles.bubble, self ? styles.self : styles.other]}>
      <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={34} color={colors.primary} />
      <View style={styles.mid}>
        <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View>
        <Text style={styles.time}>{fmt(playing || current > 0 ? current : duration)}</Text>
      </View>
      <Ionicons name="mic" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, minWidth: 180 },
  self: { backgroundColor: colors.bubbleSelf, borderBottomRightRadius: 4 },
  other: { backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  mid: { flex: 1, gap: 4 },
  track: { height: 3, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: colors.primary },
  time: { fontSize: 11, color: colors.textMuted },
});
