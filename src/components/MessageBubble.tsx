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
import { ForwardButton, HeartButton } from './QuickActions';

function ReactionPill({ reactions, self }: { reactions: Record<string, string[]>; self?: boolean }) {
  const entries = Object.entries(reactions || {}).filter(([, uids]) => uids?.length);
  if (!entries.length) return null;
  const total = entries.reduce((s, [, uids]) => s + uids.length, 0);
  const emojis = entries.slice(0, 3).map(([v]) => reactionEmoji(v)).join('');
  return (
    <View style={[rpStyles.pill, self ? { right: -4 } : { right: -10 }]}>
      <Text style={rpStyles.text}>{emojis}{total > 1 ? ` ${total}` : ''}</Text>
    </View>
  );
}
const rpStyles = StyleSheet.create({
  pill: { position: 'absolute', bottom: -12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 7, height: 24, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  text: { fontSize: 13 },
});

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function parseParams(a: any): any {
  if (!a?.params) return {};
  if (typeof a.params === 'object') return a.params;
  try { return JSON.parse(a.params); } catch { return {}; }
}

export function fileSizeLabel(n?: number) {
  if (!n || !Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

const durationLabel = (ms?: number) => {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Bieu tuong file theo duoi (mau giong Zalo/Office)
function fileStyle(ext: string): { color: string; label?: string; icon?: any } {
  const e = ext.toLowerCase();
  if (['xls', 'xlsx', 'csv'].includes(e)) return { color: '#21A366', label: 'X' };
  if (['doc', 'docx'].includes(e)) return { color: '#2B7CD3', label: 'W' };
  if (['ppt', 'pptx'].includes(e)) return { color: '#D35230', label: 'P' };
  if (e === 'pdf') return { color: '#E5252A', label: 'PDF' };
  if (['zip', 'rar', '7z'].includes(e)) return { color: '#8E5BD8', icon: 'archive' };
  if (['mp3', 'm4a', 'wav'].includes(e)) return { color: '#F59E0B', icon: 'musical-notes' };
  if (['jpg', 'jpeg', 'png', 'heic', 'gif'].includes(e)) return { color: '#0EA5E9', icon: 'image' };
  if (!e) return { color: '#64748B', icon: 'folder' };
  return { color: '#64748B', icon: 'document' };
}
function FileIcon({ ext }: { ext: string }) {
  const s = fileStyle(ext);
  return (
    <View style={[styles.fileIcon, { backgroundColor: s.color }]}>
      <View style={styles.fileFold} />
      {s.label ? <Text style={[styles.fileIconText, s.label.length > 1 && { fontSize: 12 }]}>{s.label}</Text>
        : <Ionicons name={s.icon} size={20} color="#fff" />}
    </View>
  );
}

// Xac dinh media cua tin nhan
function mediaOf(m: Message): {
  kind: 'image' | 'video' | 'sticker' | 'voice' | 'file' | null; display: string | null; play: string | null;
  fileName?: string; ext?: string; size?: number; duration?: number; ratio?: number;
} {
  const a = m.attachments;
  const t = (m.msg_type || '').toLowerCase();
  const p = parseParams(a);
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
    const w = Number(p.video_width || p.width); const h = Number(p.video_height || p.height);
    return { kind: 'video', display: vthumb, play: full, duration: Number(p.duration) || undefined, ratio: w && h ? w / h : undefined };
  }
  if (isFile) {
    const name = String(a?.title || a?.fileName || 'Tệp đính kèm').replace(/^\[File\]\s*/i, '');
    const ext = String(a?.fileExt || p.fileExt || (name.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? '')).toLowerCase();
    return { kind: 'file', display: null, play: full, fileName: name, ext, size: Number(a?.fileSize || p.fileSize) || undefined };
  }
  const imgThumb = a ? pick(a.thumb, a.thumbUrl, a.href, a.url, a.normalUrl, a.hdUrl) : null;
  const w = Number(a?.width || p.width); const h = Number(a?.height || p.height);
  if (isImage || imgThumb) return { kind: 'image', display: imgThumb, play: full || imgThumb, ratio: w && h ? w / h : undefined };
  return { kind: null, display: null, play: null };
}

// Kich thuoc anh/video theo ti le that (gioi han de khong qua dai/qua det)
function boxSize(ratio?: number) {
  const r = Math.min(Math.max(ratio || 1, 0.56), 1.78);
  return r >= 1 ? { width: 240, height: Math.round(240 / r) } : { width: Math.round(300 * r), height: 300 };
}

const LONG_TEXT = 420;

export function MessageBubble({ message, showSender, showAvatar, showTime = true, showHeart, onLongPress, onPress, onOpenVideo, onForward, onHeart }: {
  message: Message; showSender?: boolean; showAvatar?: boolean; showTime?: boolean; showHeart?: boolean;
  onLongPress?: (m: Message) => void; onPress?: () => void; onOpenVideo?: (url: string) => void;
  onForward?: (m: Message) => void; onHeart?: (m: Message) => void;
}) {
  const self = message.is_self;
  const media = mediaOf(message);
  const [viewer, setViewer] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const openMedia = () => {
    if (media.kind === 'image' && media.display) setViewer(true);
    else if (media.kind === 'video' && media.play) {
      if (onOpenVideo) onOpenVideo(media.play); else Linking.openURL(media.play).catch(() => {});
    } else if (media.play) Linking.openURL(media.play).catch(() => {});
  };

  const recalled = message.msg_type === 'recalled';
  const forwardable = !recalled && (media.kind === 'image' || media.kind === 'video' || media.kind === 'file');
  const fwd = onForward && forwardable ? <ForwardButton onPress={() => onForward(message)} /> : null;
  const hasReactions = !!message.reactions && Object.values(message.reactions).some((u) => u?.length);
  const corner = hasReactions
    ? <ReactionPill reactions={message.reactions!} self={self} />
    : showHeart && onHeart && !recalled && media.kind !== 'sticker' ? <HeartButton self={self} onPress={() => onHeart(message)} /> : null;
  const bubbleStyle = [styles.bubble, self ? styles.bubbleSelf : styles.bubbleOther];
  const time = showTime ? <Text style={styles.time}>{timeLabel(message.ts)}</Text> : null;

  const renderInner = () => {
    if (recalled) {
      return (
        <View style={bubbleStyle}>
          <Text style={styles.recalledText}>Tin nhắn đã được thu hồi</Text>
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
      const meta = [media.ext ? media.ext.toUpperCase() : 'Thư mục', fileSizeLabel(media.size)].filter(Boolean).join(' · ');
      return (
        <Pressable onPress={openMedia} onLongPress={() => onLongPress?.(message)} style={[bubbleStyle, styles.fileBox]}>
          <FileIcon ext={media.ext || ''} />
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={2}>{media.fileName}</Text>
            <Text style={styles.fileMeta}>{meta}</Text>
            {time}
          </View>
        </Pressable>
      );
    }
    if (media.kind === 'image' || media.kind === 'video') {
      const size = boxSize(media.ratio);
      return (
        <Pressable onPress={openMedia} onLongPress={() => onLongPress?.(message)} style={[styles.mediaBox, size]}>
          {media.display
            ? <Image source={{ uri: media.display }} style={styles.media} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={message.id} />
            : <VideoThumb url={media.play} style={styles.media} />}
          {media.kind === 'video' ? (
            <>
              <View style={styles.playOverlay}><View style={styles.playCircle}><Ionicons name="play" size={22} color="#fff" style={{ marginLeft: 3 }} /></View></View>
              {media.duration ? <Text style={styles.duration}>{durationLabel(media.duration)}</Text> : null}
            </>
          ) : null}
        </Pressable>
      );
    }
    // Tin chu: dai thi rut gon + "Xem them" nhu Zalo
    const content = message.content || '';
    const long = !expanded && content.length > LONG_TEXT;
    return (
      <View style={bubbleStyle}>
        <Text style={styles.text}>
          {long ? content.slice(0, LONG_TEXT).trimEnd() + '... ' : content}
          {long ? <Text style={styles.more} onPress={() => setExpanded(true)}>Xem thêm</Text> : null}
        </Text>
        {time}
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => onLongPress?.(message)}
      delayLongPress={300}
      style={[styles.wrap, self ? styles.wrapSelf : styles.wrapOther, corner ? styles.wrapCorner : null]}
    >
      {!self && (
        <View style={styles.avatarSlot}>{showAvatar ? <Avatar uri={null} name={message.sender_name} size={32} /> : null}</View>
      )}
      {self ? fwd : null}
      <View style={styles.content}>
        {!self && showSender && message.sender_name ? <Text style={styles.sender}>{message.sender_name}</Text> : null}
        <View>
          {renderInner()}
          {corner}
        </View>
      </View>
      {!self ? fwd : null}

      {/* Xem anh toan man hinh: hien ngay anh nho da tai, anh net thay vao khi xong */}
      <Modal visible={viewer} transparent animationType="fade" onRequestClose={() => setViewer(false)}>
        <Pressable style={styles.viewerBg} onPress={() => setViewer(false)}>
          {media.play && <Image source={{ uri: media.play }} placeholder={media.display ? { uri: media.display } : undefined} placeholderContentFit="contain" style={styles.viewerImg} contentFit="contain" cachePolicy="memory-disk" />}
          <View style={styles.viewerClose}><Ionicons name="close" size={30} color="#fff" /></View>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 10, alignItems: 'flex-end' },
  wrapCorner: { marginBottom: 14 },
  wrapSelf: { justifyContent: 'flex-end' },
  wrapOther: { justifyContent: 'flex-start' },
  avatarSlot: { width: 32, marginRight: 6 },
  content: { maxWidth: '78%' },
  sender: { fontSize: 12, color: colors.textMuted, marginBottom: 3, marginLeft: 4 },
  bubble: { borderRadius: 14, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 8, borderWidth: StyleSheet.hairlineWidth },
  bubbleSelf: { backgroundColor: colors.bubbleSelf, borderColor: colors.bubbleSelfBorder },
  bubbleOther: { backgroundColor: colors.bubbleOther, borderColor: colors.bubbleOtherBorder },
  text: { fontSize: 16, color: colors.bubbleText, lineHeight: 22 },
  more: { color: colors.primary, fontSize: 16 },
  recalledText: { fontSize: 15, color: colors.textMuted, fontStyle: 'italic' },
  time: { fontSize: 12, color: colors.textLight, marginTop: 5 },
  sticker: { width: 128, height: 128 },
  fileBox: { flexDirection: 'row', alignItems: 'center', gap: 12, width: 270, paddingVertical: 12 },
  fileIcon: { width: 42, height: 50, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fileFold: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, backgroundColor: 'rgba(255,255,255,0.35)', borderBottomLeftRadius: 4 },
  fileIconText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 16, color: colors.bubbleText, fontWeight: '500' },
  fileMeta: { fontSize: 13.5, color: colors.textMuted, marginTop: 3 },
  mediaBox: { borderRadius: 14, overflow: 'hidden', backgroundColor: colors.bgMuted },
  media: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  duration: { position: 'absolute', top: 8, left: 8, color: '#fff', fontSize: 12, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  viewerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', top: 50, right: 20 },
});
