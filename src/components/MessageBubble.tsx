import React, { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types';
import { colors } from '../theme';
import { Avatar } from './Avatar';
import { VoiceBubble } from './VoiceBubble';
import { VideoThumb } from './VideoThumb';
import { reactionEmoji } from '../reactions';

function ReactionPill({ reactions, self }: { reactions: Record<string, string[]>; self?: boolean }) {
  const entries = Object.entries(reactions || {}).filter(([, uids]) => uids?.length);
  if (!entries.length) return null;
  const total = entries.reduce((s, [, uids]) => s + uids.length, 0);
  const emojis = entries.slice(0, 3).map(([v]) => reactionEmoji(v)).join('');
  return (
    <View style={[rpStyles.pill, self ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
      <Text style={rpStyles.text}>{emojis}{total > 1 ? ` ${total}` : ''}</Text>
    </View>
  );
}
const rpStyles = StyleSheet.create({
  pill: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginTop: -6, borderWidth: 1, borderColor: colors.border, elevation: 1 },
  text: { fontSize: 12 },
});

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Xac dinh media cua tin nhan
function mediaOf(m: Message): { kind: 'image' | 'video' | 'sticker' | 'voice' | 'file' | null; display: string | null; play: string | null; fileName?: string } {
  const a = m.attachments;
  const t = (m.msg_type || '').toLowerCase();
  const isSticker = t.includes('sticker');
  const isVideo = t.includes('video') || a?.type === 'video';
  const isVoice = t.includes('voice') || t.includes('audio');
  const isImage = t.includes('photo') || t.includes('image') || t.includes('gif') || a?.type === 'photo';
  const pick = (...vals: any[]) => vals.find((v) => typeof v === 'string' && (v.startsWith('http') || v.startsWith('file'))) || null;
  const full = a ? pick(a.href, a.hdUrl, a.normalUrl, a.url, a.fileUrl, a.thumb) : null;
  // File video (.mp4/.mov...) do zca-js gui video thanh share.file -> van hien nhu video
  const nameForExt = a?.title || a?.fileName || full || '';
  const isVideoFile = /\.(mp4|mov|avi|mkv|webm|m4v|3gp)(\?|$)/i.test(nameForExt);
  const isFile = !isVideoFile && (t.includes('file') || (!!a && !!full && !isImage && !isVideo && !isVoice && !isSticker && (!!a.title || !!a.fileName || !!a.fileExt)));

  if (!a && !isVideo && !isImage && !isSticker && !isVoice) return { kind: null, display: null, play: null };

  if (isSticker) return { kind: 'sticker', display: a ? pick(a.thumb, a.href, a.url) : null, play: null };
  if (isVoice) return { kind: 'voice', display: null, play: full };
  if (isVideo || isVideoFile) {
    const vthumb = a ? pick(a.thumb, a.thumbUrl) : null;
    return { kind: 'video', display: vthumb, play: full };
  }
  if (isFile) return { kind: 'file', display: null, play: full, fileName: a?.title || a?.fileName || 'Tệp đính kèm' };
  const imgThumb = a ? pick(a.thumb, a.thumbUrl, a.href, a.url, a.normalUrl, a.hdUrl) : null;
  if (isImage || imgThumb) return { kind: 'image', display: imgThumb, play: full || imgThumb };
  return { kind: null, display: null, play: null };
}

export function MessageBubble({ message, showSender, showAvatar, onLongPress, onPress, onOpenVideo }: {
  message: Message; showSender?: boolean; showAvatar?: boolean; onLongPress?: (m: Message) => void; onPress?: () => void; onOpenVideo?: (url: string) => void;
}) {
  const self = message.is_self;
  const media = mediaOf(message);
  const [viewer, setViewer] = useState(false);

  const openMedia = () => {
    if (media.kind === 'image' && media.display) setViewer(true);
    else if (media.kind === 'video' && media.play) {
      if (onOpenVideo) onOpenVideo(media.play); else Linking.openURL(media.play).catch(() => {});
    } else if (media.play) Linking.openURL(media.play).catch(() => {});
  };

  const recalled = message.msg_type === 'recalled';

  const renderInner = () => {
    if (recalled) {
      return (
        <View style={[styles.bubble, self ? styles.bubbleSelf : styles.bubbleOther]}>
          <Text style={styles.recalledText}>⊘ Tin đã được thu hồi</Text>
        </View>
      );
    }
    if (media.kind === 'sticker' && media.display) {
      return <Image source={{ uri: media.display }} style={styles.sticker} contentFit="contain" />;
    }
    if (media.kind === 'voice') {
      return <VoiceBubble url={media.play} self={self} onLongPress={() => onLongPress?.(message)} />;
    }
    if (media.kind === 'file') {
      return (
        <Pressable onPress={openMedia} style={[styles.bubble, self ? styles.bubbleSelf : styles.bubbleOther, styles.fileRow]}>
          <Ionicons name="document-text" size={30} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName} numberOfLines={2}>{media.fileName}</Text>
            <Text style={styles.time}>{timeLabel(message.ts)}</Text>
          </View>
        </Pressable>
      );
    }
    if ((media.kind === 'image' || media.kind === 'video') && media.display) {
      return (
        <Pressable onPress={openMedia} onLongPress={() => onLongPress?.(message)} style={styles.mediaBox}>
          <Image source={{ uri: media.display }} style={styles.media} contentFit="cover" transition={150} />
          {media.kind === 'video' && (
            <View style={styles.playOverlay}><Ionicons name="play" size={26} color="#fff" /></View>
          )}
          <Text style={styles.timeOnMedia}>{timeLabel(message.ts)}</Text>
        </Pressable>
      );
    }
    if (media.kind === 'video') {
      // Video khong co thumbnail san -> tu tao anh thu nho tu video
      return (
        <Pressable onPress={openMedia} onLongPress={() => onLongPress?.(message)} style={styles.mediaBox}>
          <VideoThumb url={media.play} style={styles.media} />
          <View style={styles.playOverlay}><Ionicons name="play" size={30} color="#fff" /></View>
          <Text style={styles.timeOnMedia}>{timeLabel(message.ts)}</Text>
        </Pressable>
      );
    }
    return (
      <View style={[styles.bubble, self ? styles.bubbleSelf : styles.bubbleOther]}>
        <Text style={styles.text}>{message.content}</Text>
        <Text style={styles.time}>{timeLabel(message.ts)}</Text>
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => onLongPress?.(message)}
      delayLongPress={300}
      style={({ pressed }) => [styles.wrap, self ? styles.wrapSelf : styles.wrapOther, pressed && onLongPress ? { opacity: 0.7 } : null]}
    >
      {!self && (
        <View style={styles.avatarSlot}>{showAvatar ? <Avatar uri={null} name={message.sender_name} size={32} /> : null}</View>
      )}
      <View style={styles.content}>
        {!self && showSender && message.sender_name ? <Text style={styles.sender}>{message.sender_name}</Text> : null}
        {renderInner()}
        {message.reactions ? <ReactionPill reactions={message.reactions} self={self} /> : null}
      </View>

      {/* Xem anh toan man hinh */}
      <Modal visible={viewer} transparent animationType="fade" onRequestClose={() => setViewer(false)}>
        <Pressable style={styles.viewerBg} onPress={() => setViewer(false)}>
          {media.play && <Image source={{ uri: media.play }} style={styles.viewerImg} contentFit="contain" />}
          <View style={styles.viewerClose}><Ionicons name="close" size={30} color="#fff" /></View>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', marginVertical: 2, paddingHorizontal: 8, alignItems: 'flex-end' },
  wrapSelf: { justifyContent: 'flex-end' },
  wrapOther: { justifyContent: 'flex-start' },
  avatarSlot: { width: 32, marginRight: 6 },
  content: { maxWidth: '76%' },
  sender: { fontSize: 12, color: colors.textMuted, marginBottom: 2, marginLeft: 10 },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleSelf: { backgroundColor: colors.bubbleSelf, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 4 },
  text: { fontSize: 15.5, color: colors.bubbleText, lineHeight: 21 },
  recalledText: { fontSize: 14.5, color: colors.textMuted, fontStyle: 'italic' },
  time: { fontSize: 10, color: colors.textLight, alignSelf: 'flex-end', marginTop: 3 },
  sticker: { width: 128, height: 128 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160 },
  voiceText: { fontSize: 15, color: colors.bubbleText, flex: 1 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200, maxWidth: 260 },
  fileName: { fontSize: 15, color: colors.bubbleText },
  mediaBox: { borderRadius: 14, overflow: 'hidden' },
  media: { width: 220, height: 220, borderRadius: 14, backgroundColor: colors.bgMuted },
  videoNoThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A3942', gap: 6 },
  videoLabel: { color: '#fff', fontSize: 13 },
  playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  timeOnMedia: { position: 'absolute', bottom: 6, right: 8, fontSize: 10, color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3 },
  viewerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', top: 50, right: 20 },
});
