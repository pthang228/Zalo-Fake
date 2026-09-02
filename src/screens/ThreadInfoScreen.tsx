import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Message } from '../types';

// Lay url media tu 1 tin nhan
function mediaUrl(m: Message): { kind: 'image' | 'video'; thumb: string; full: string } | null {
  const a = m.attachments; const t = (m.msg_type || '').toLowerCase();
  const isVideo = t.includes('video') || a?.type === 'video';
  const isImage = t.includes('photo') || t.includes('image') || t.includes('gif') || a?.type === 'photo';
  if (!a || (!isVideo && !isImage)) return null;
  const pick = (...v: any[]) => v.find((x) => typeof x === 'string' && x.startsWith('http')) || null;
  const thumb = pick(a.thumb, a.thumbUrl, a.href, a.url, a.normalUrl, a.hdUrl);
  const full = pick(a.href, a.hdUrl, a.normalUrl, a.url, a.thumb);
  if (!thumb) return null;
  return { kind: isVideo ? 'video' : 'image', thumb, full: full || thumb };
}

function Row({ icon, label, danger, onPress }: any) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.textMuted} style={{ width: 28 }} />
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ThreadInfoScreen({ route, navigation }: any) {
  const { threadId, threadType, name, avatar } = route.params;
  const { api, activeAccount, isMuted, toggleMute } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [viewer, setViewer] = useState<string | null>(null);
  const muted = isMuted(threadId);

  const onAddFriend = async () => {
    if (threadType !== 'user') return Alert.alert('Nhóm', 'Chỉ kết bạn với người dùng.');
    try { await api?.sendFriendRequest(activeAccount!.id, { userId: threadId }); Alert.alert('Đã gửi', 'Đã gửi lời mời kết bạn.'); }
    catch (e: any) { Alert.alert('Lỗi', e.message); }
  };

  useLayoutEffect(() => { navigation.setOptions({ title: 'Thông tin hội thoại' }); }, [navigation]);

  useEffect(() => {
    (async () => {
      if (!api || !activeAccount) return;
      try { setMessages(await api.listMessages(activeAccount.id, threadId, { limit: 200 })); } catch { /* */ }
    })();
  }, [api, activeAccount, threadId]);

  const media = useMemo(() => messages.map(mediaUrl).filter(Boolean) as NonNullable<ReturnType<typeof mediaUrl>>[], [messages]);
  const mediaPreview = media.slice(-8).reverse();

  const onClear = () => {
    Alert.alert('Xóa lịch sử trò chuyện', 'Chỉ xóa trong ZaloFake (không ảnh hưởng Zalo thật). Tiếp tục?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await api?.clearHistory(activeAccount!.id, threadId); navigation.goBack(); } catch (e: any) { Alert.alert('Lỗi', e.message); }
      } },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar uri={avatar} name={name} size={80} />
        <Text style={styles.name}>{name || threadId}</Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.action} onPress={() => navigation.navigate('Search', { threadId, threadName: name })}>
          <View style={styles.actionIcon}><Ionicons name="search" size={22} color={colors.text} /></View>
          <Text style={styles.actionLabel}>Tìm tin nhắn</Text>
        </Pressable>
        {threadType === 'user' && (
          <Pressable style={styles.action} onPress={onAddFriend}>
            <View style={styles.actionIcon}><Ionicons name="person-add-outline" size={22} color={colors.text} /></View>
            <Text style={styles.actionLabel}>Thêm bạn</Text>
          </Pressable>
        )}
        <Pressable style={styles.action} onPress={() => toggleMute(threadId)}>
          <View style={[styles.actionIcon, muted && { backgroundColor: colors.primary }]}>
            <Ionicons name={muted ? 'notifications-off' : 'notifications-off-outline'} size={22} color={muted ? '#fff' : colors.text} />
          </View>
          <Text style={styles.actionLabel}>{muted ? 'Đang tắt TB' : 'Tắt thông báo'}</Text>
        </Pressable>
      </View>

      {/* Anh/Video */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ảnh/Video</Text>
        {mediaPreview.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có ảnh/video trong hội thoại này</Text>
        ) : (
          <View style={styles.grid}>
            {mediaPreview.map((m, i) => (
              <Pressable key={i} style={styles.gridItem} onPress={() => m.kind === 'video' ? Linking.openURL(m.full).catch(() => {}) : setViewer(m.full)}>
                <Image source={{ uri: m.thumb }} style={styles.gridImg} contentFit="cover" />
                {m.kind === 'video' && <View style={styles.playBadge}><Ionicons name="play" size={16} color="#fff" /></View>}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* File / Link (placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>File</Text>
        <Text style={styles.emptyText}>Chưa có File được chia sẻ trong hội thoại này</Text>
      </View>

      {/* Thiet lap */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thiết lập</Text>
        <Row icon="arrow-redo-outline" label="Chuyển tiếp gần đây" onPress={() => navigation.goBack()} />
        <Row icon="trash-outline" label="Xóa lịch sử trò chuyện" danger onPress={onClear} />
      </View>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewerBg} onPress={() => setViewer(null)}>
          {viewer && <Image source={{ uri: viewer }} style={styles.viewerImg} contentFit="contain" />}
          <View style={styles.viewerClose}><Ionicons name="close" size={30} color="#fff" /></View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgMuted },
  header: { alignItems: 'center', paddingVertical: 20, backgroundColor: colors.bg, gap: 10 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.bg, paddingBottom: 16 },
  action: { alignItems: 'center', gap: 6, width: 90 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  section: { backgroundColor: colors.bg, marginTop: 8, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 },
  emptyText: { fontSize: 14, color: colors.textLight, textAlign: 'center', paddingVertical: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gridItem: { width: '23.5%', aspectRatio: 1 },
  gridImg: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: colors.bgMuted },
  playBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowLabel: { fontSize: 16, color: colors.text },
  viewerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', top: 50, right: 20 },
});
