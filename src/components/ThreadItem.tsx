import React from 'react';
import { StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Thread } from '../types';
import { Avatar } from './Avatar';
import { colors } from '../theme';

function timeLabel(ts: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Vừa xong';
  if (min < 60) return `${min} phút`;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function ThreadItem({ thread, online, muted, onPress, onLongPress }: { thread: Thread; online?: boolean; muted?: boolean; onPress: () => void; onLongPress?: () => void }) {
  const hasUnread = thread.unread > 0 && !muted;
  return (
    <TouchableHighlight underlayColor={colors.separator} onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.row}>
        <Avatar uri={thread.avatar} name={thread.name || thread.id} size={54} online={online} showPresence={thread.type === 'user'} />
        <View style={styles.middle}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
              {thread.name || (thread.type === 'group' ? 'Nhóm' : thread.id)}
            </Text>
            {muted ? <Ionicons name="notifications-off" size={14} color={colors.textLight} style={{ marginLeft: 4 }} /> : null}
          </View>
          <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
            {thread.last_message || 'Bắt đầu trò chuyện'}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.time}>{timeLabel(thread.last_ts)}</Text>
          {hasUnread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{thread.unread > 99 ? '99+' : thread.unread}</Text>
            </View>
          ) : <View style={{ height: 20 }} />}
        </View>
      </View>
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12, backgroundColor: colors.bg },
  middle: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, color: colors.text, flexShrink: 1 },
  nameUnread: { fontWeight: '700' },
  preview: { fontSize: 14, color: colors.textMuted, marginTop: 3 },
  previewUnread: { color: colors.text, fontWeight: '500' },
  right: { alignItems: 'flex-end', gap: 6, minWidth: 48 },
  time: { fontSize: 12, color: colors.textLight },
  badge: { backgroundColor: colors.danger, borderRadius: 11, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
