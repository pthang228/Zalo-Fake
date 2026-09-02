import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { REACTION_OPTIONS } from '../reactions';
import { Message } from '../types';

export function MessageActionSheet({
  message, onClose, onReact, onReply, onForward, onUndo,
}: {
  message: Message | null;
  onClose: () => void;
  onReact: (iconName: string) => void;
  onReply: () => void;
  onForward: () => void;
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
            <Action icon="arrow-redo-outline" label="Chuyển tiếp" onPress={onForward} />
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
