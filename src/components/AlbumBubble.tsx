import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types';
import { colors } from '../theme';

function imgOf(m: Message): string | null {
  const a = m.attachments;
  if (!a) return null;
  const pick = (...v: any[]) => v.find((x) => typeof x === 'string' && x.startsWith('http')) || null;
  return pick(a.thumb, a.thumbUrl, a.href, a.url, a.normalUrl, a.hdUrl);
}

// Hien nhieu anh cung luc thanh 1 luoi (album)
export function AlbumBubble({ items, self, onLongPress }: { items: Message[]; self: boolean; onLongPress?: (m: Message) => void }) {
  const [viewer, setViewer] = useState<string | null>(null);
  const urls = items.map((m) => ({ thumb: imgOf(m), full: imgOf(m) })).filter((u) => u.thumb);
  const n = urls.length;
  // 2 anh -> 2 cot; 3+ -> 3 cot
  const cols = n === 2 ? 2 : 3;
  const cellW = cols === 2 ? '49%' : '32.5%';

  return (
    <View style={[styles.wrap, self ? styles.self : styles.other]}>
      <View style={styles.grid}>
        {urls.map((u, i) => (
          <Pressable
            key={i}
            style={[styles.cell, { width: cellW as any }]}
            onPress={() => setViewer(u.full)}
            onLongPress={() => onLongPress?.(items[i])}
          >
            <Image source={{ uri: u.thumb! }} style={styles.img} contentFit="cover" transition={120} />
          </Pressable>
        ))}
      </View>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewerBg} onPress={() => setViewer(null)}>
          {viewer && <Image source={{ uri: viewer }} style={styles.viewerImg} contentFit="contain" />}
          <View style={styles.close}><Ionicons name="close" size={30} color="#fff" /></View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '82%', marginVertical: 2, paddingHorizontal: 8 },
  self: { alignSelf: 'flex-end' },
  other: { alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { aspectRatio: 1, marginBottom: 3 },
  img: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: colors.bgMuted },
  viewerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
  close: { position: 'absolute', top: 50, right: 20 },
});
