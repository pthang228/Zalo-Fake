import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types';
import { colors } from '../theme';
import { ForwardButton } from './QuickActions';

const pickUrl = (...v: any[]): string | null => v.find((x) => typeof x === 'string' && x.startsWith('http')) || null;

// Anh nho (xem trong khung chat)
export function imgOf(m: Message): string | null {
  const a = m.attachments;
  if (!a) return null;
  return pickUrl(a.thumb, a.thumbUrl, a.href, a.url, a.normalUrl, a.hdUrl);
}
// Anh net (xem toan man hinh)
function fullOf(m: Message): string | null {
  const a = m.attachments;
  if (!a) return null;
  return pickUrl(a.hdUrl, a.href, a.normalUrl, a.url, a.thumb);
}

// Hien nhieu anh cung luc thanh 1 luoi (album). onForward: nut chuyen tiep CA album.
export function AlbumBubble({ items, self, onLongPress, onForward }: {
  items: Message[]; self: boolean; onLongPress?: (m: Message) => void; onForward?: () => void;
}) {
  const [viewer, setViewer] = useState<{ thumb: string; full: string } | null>(null);
  const urls = items.map((m) => ({ m, thumb: imgOf(m), full: fullOf(m) })).filter((u) => u.thumb);
  const n = urls.length;
  // 2 anh -> 2 cot; 3+ -> 3 cot
  const cols = n === 2 ? 2 : 3;
  const cellW = cols === 2 ? '49%' : '32.5%';
  const quick = onForward ? <ForwardButton onPress={onForward} /> : null;

  return (
    <View style={[styles.row, self ? styles.self : styles.other]}>
      {self ? quick : null}
      <View style={styles.wrap}>
        <View style={styles.grid}>
          {urls.map((u) => (
            <Pressable
              key={u.m.id}
              style={[styles.cell, { width: cellW as any }]}
              onPress={() => setViewer({ thumb: u.thumb!, full: u.full || u.thumb! })}
              onLongPress={() => onLongPress?.(u.m)}
            >
              <Image source={{ uri: u.thumb! }} style={styles.img} contentFit="cover" transition={120} cachePolicy="memory-disk" recyclingKey={u.m.id} />
            </Pressable>
          ))}
        </View>
      </View>
      {!self ? quick : null}

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewerBg} onPress={() => setViewer(null)}>
          {viewer && (
            <Image
              source={{ uri: viewer.full }} placeholder={{ uri: viewer.thumb }} placeholderContentFit="contain"
              style={styles.viewerImg} contentFit="contain" cachePolicy="memory-disk"
            />
          )}
          <View style={styles.close}><Ionicons name="close" size={30} color="#fff" /></View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', maxWidth: '92%', marginVertical: 3, paddingHorizontal: 10 },
  wrap: { flexShrink: 1, width: 280 },
  self: { alignSelf: 'flex-end' },
  other: { alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { aspectRatio: 1, marginBottom: 3 },
  img: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: colors.bgMuted },
  viewerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
  close: { position: 'absolute', top: 50, right: 20 },
});
