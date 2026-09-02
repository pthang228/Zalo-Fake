import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { colors } from '../theme';

type Sticker = { stickerId: number; cateId: number; type: number; url: string | null };

export function StickerPicker({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (s: Sticker) => void;
}) {
  const { api, activeAccount } = useApp();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async (kw: string) => {
    if (!api || !activeAccount) return;
    setLoading(true);
    try { setStickers(await api.searchStickers(activeAccount.id, kw || 'cười')); }
    catch { /* */ } finally { setLoading(false); }
  };

  useEffect(() => { if (visible) search('cười'); /* eslint-disable-next-line */ }, [visible]);

  const CHIPS = ['cười', 'yêu', 'buồn', 'ok', 'chào', 'cảm ơn', 'hài', 'dễ thương', 'giận', 'ngủ', 'ăn', 'tiền'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input} value={q} onChangeText={setQ}
              placeholder="Tìm sticker..." placeholderTextColor={colors.textLight}
              returnKeyType="search" onSubmitEditing={() => search(q)}
            />
            <Pressable onPress={onClose}><Ionicons name="close" size={22} color={colors.textMuted} /></Pressable>
          </View>
          <FlatList
            data={CHIPS}
            keyExtractor={(c) => c}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={{ paddingHorizontal: 8, gap: 8 }}
            renderItem={({ item }) => (
              <Pressable style={styles.chip} onPress={() => { setQ(item); search(item); }}>
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            )}
          />
          {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
            <FlatList
              data={stickers.filter((s) => s.url)}
              keyExtractor={(s) => String(s.stickerId)}
              numColumns={4}
              renderItem={({ item }) => (
                <Pressable style={styles.cell} onPress={() => { onSelect(item); onClose(); }}>
                  <Image source={{ uri: item.url! }} style={styles.sticker} contentFit="contain" />
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.empty}>Không có sticker. Thử từ khóa khác.</Text>}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  panel: { backgroundColor: colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '55%', paddingBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgMuted, borderRadius: 18, paddingHorizontal: 12, height: 38, margin: 12 },
  input: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  chipsRow: { maxHeight: 40, marginBottom: 4 },
  chip: { backgroundColor: colors.bgMuted, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 13, color: colors.text },
  cell: { flex: 1 / 4, aspectRatio: 1, padding: 6, alignItems: 'center', justifyContent: 'center' },
  sticker: { width: '100%', height: '100%' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 30 },
});
