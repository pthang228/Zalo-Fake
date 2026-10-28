import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { REACTION_OPTIONS } from '../reactions';
import { Message } from '../types';

export function MessageActionSheet({
  message, albumCount = 0, onClose, onReact, onReply, onForward, onForwardOne, onSaveCloud, onAddShortcut, onUndo,
}: {
  message: Message | null;
  albumCount?: number; // > 1: tin nam trong album nhieu anh
  onClose: () => void;
  onReact: (iconName: string) => void;
  onReply: () => void;
  onForward: () => void; // album -> chuyen tiep ca album
  onForwardOne?: () => void; // album -> chi anh dang giu
  onSaveCloud?: () => void; // luu vao My Documents
  onAddShortcut?: () => void; // them tin (ca album) vao phim tat
  onUndo: () => void;
}) {
  if (!message) return null;
  const canUndo = message.is_self && message.msg_type !== 'recalled';

  const Action = ({ icon, label, danger, onPress }: any) => (
    <Pressable style={styles.action} onPress={onPress}>
      <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.text} />
      <Text style={[styles.actionLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Hang cam xuc */}
          <View style={styles.reactRow}>
            {REACTION_OPTIONS.map((r) => (
              <Pressable key={r.name} style={styles.reactBtn} onPress={() => onReact(r.name)}>
                <Text style={styles.reactEmoji}>{r.emoji}</Text>
              </Pressable>
            ))}
          </View>
          {/* Hanh dong */}
          <View style={styles.actions}>
            <Action icon="arrow-undo-outline" label="Trả lời" onPress={onReply} />
            {albumCount > 1 ? (
              <>
                <Action icon="arrow-redo-outline" label={`Chuyển tiếp ${albumCount} ảnh`} onPress={onForward} />
                {onForwardOne ? <Action icon="image-outline" label="Chỉ chuyển tiếp ảnh này" onPress={onForwardOne} /> : null}
              </>
            ) : (
              <Action icon="arrow-redo-outline" label="Chuyển tiếp" onPress={onForward} />
            )}
            {onSaveCloud ? <Action icon="cloud-upload-outline" label={albumCount > 1 ? `Lưu ${albumCount} ảnh vào My Documents` : 'Lưu vào My Documents'} onPress={onSaveCloud} /> : null}
            {onAddShortcut ? <Action icon="flash-outline" label={albumCount > 1 ? `Thêm ${albumCount} ảnh vào phím tắt` : 'Thêm vào phím tắt'} onPress={onAddShortcut} /> : null}
            {canUndo ? <Action icon="trash-outline" label="Thu hồi" danger onPress={onUndo} /> : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 28, paddingTop: 8 },
  reactRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  reactBtn: { padding: 4 },
  reactEmoji: { fontSize: 30 },
  actions: { paddingTop: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 22, paddingVertical: 14 },
  actionLabel: { fontSize: 16, color: colors.text },
});
