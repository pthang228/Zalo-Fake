import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { useApp } from '../state/AppContext';
import { MessageBubble } from '../components/MessageBubble';
import { AlbumBubble } from '../components/AlbumBubble';
import { MessageActionSheet } from '../components/MessageActionSheet';
import { StickerPicker } from '../components/StickerPicker';
import { VideoViewer } from '../components/VideoViewer';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Message } from '../types';

function dayKey(ts: number) { return new Date(ts).toDateString(); }
function dayLabel(ts: number) {
  const d = new Date(ts); const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Hôm nay';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isPhoto(m: Message) {
  const t = (m.msg_type || '').toLowerCase();
  return (t.includes('photo') || t.includes('image')) && !t.includes('video') && !!m.attachments;
}

type RenderItem =
  | { type: 'msg'; id: string; message: Message; ts: number }
  | { type: 'album'; id: string; items: Message[]; is_self: boolean; sender_id: string | null; sender_name: string | null; ts: number };

export function ChatScreen({ route, navigation }: any) {
  const { threadId, threadType, name, avatar } = route.params;
  const { api, activeAccount, subscribe } = useApp();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionTarget, setActionTarget] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  // Moc thoi gian da xem / da nhan: tin nao co ts <= moc thi coi la da xem/nhan
  const [seenUpToTs, setSeenUpToTs] = useState(0);
  const [deliveredUpToTs, setDeliveredUpToTs] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const listRef = useRef<FlatList>(null);
  const typingTimer = useRef<any>(null);
  const lastTypingSent = useRef(0);

  const markSeen = useCallback(() => {
    if (api && activeAccount) api.sendSeen(activeAccount.id, { threadId, threadType }).catch(() => {});
  }, [api, activeAccount, threadId, threadType]);

  const handleTextChange = (t: string) => {
    setText(t);
    const now = Date.now();
    if (t && api && activeAccount && now - lastTypingSent.current > 3000) {
      lastTypingSent.current = now;
      api.sendTyping(activeAccount.id, { threadId, threadType }).catch(() => {});
    }
  };

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  const load = useCallback(async () => {
    if (!api || !activeAccount) return;
    try {
      const res = await api.loadThread(activeAccount.id, threadId, { limit: 50 });
      setMessages(res.messages);
      setSeenUpToTs(res.seenTs || 0);
      setDeliveredUpToTs(res.deliveredTs || 0);
      api.markRead(activeAccount.id, threadId).catch(() => {});
      markSeen(); // gui "da xem" cho doi phuong
    } catch { /* */ }
  }, [api, activeAccount, threadId, markSeen]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = subscribe((ev) => {
      if (ev.type === 'connected' || (ev.type === 'history_synced' && ev.accountId === activeAccount?.id)) {
        load();
        return;
      }
      if ((ev.type === 'message' || ev.type === 'history_message')
        && ev.accountId === activeAccount?.id && ev.message.thread_id === threadId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === ev.message.id)) return prev;
          return [...prev, ev.message].sort((a, b) => a.ts - b.ts);
        });
        if (!ev.message.is_self && api && activeAccount) {
          api.markRead(activeAccount.id, threadId).catch(() => {});
          markSeen();
          setPeerTyping(false);
        }
      } else if (ev.type === 'reaction' && ev.accountId === activeAccount?.id) {
        setMessages((prev) => prev.map((m) => m.id === ev.msgId ? { ...m, reactions: ev.reactions } : m));
      } else if (ev.type === 'recalled' && ev.accountId === activeAccount?.id) {
        setMessages((prev) => prev.map((m) => m.id === ev.msgId ? { ...m, msg_type: 'recalled', content: 'Tin đã được thu hồi', attachments: null } : m));
      } else if (ev.type === 'typing' && ev.accountId === activeAccount?.id && ev.threadId === threadId) {
        setPeerTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setPeerTyping(false), 4000);
      } else if (ev.type === 'seen' && ev.accountId === activeAccount?.id && ev.threadId === threadId) {
        setSeenUpToTs(Date.now());
      } else if (ev.type === 'delivered' && ev.accountId === activeAccount?.id && ev.threadId === threadId) {
        setDeliveredUpToTs(Date.now());
      }
    });
    return unsub;
  }, [subscribe, activeAccount, threadId, api, load]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || messages.length === 0 || !api || !activeAccount) return;
    setLoadingOlder(true);
    try {
      const older = await api.listMessages(activeAccount.id, threadId, { limit: 50, before: messages[0].ts });
      if (older.length) setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !ids.has(m.id)), ...prev].sort((a, b) => a.ts - b.ts);
      });
    } catch { /* */ } finally { setLoadingOlder(false); }
  }, [loadingOlder, messages, api, activeAccount, threadId]);

  const onSend = async () => {
    const t = text.trim();
    if (!t || !api || !activeAccount || sending) return;
    const replyId = replyTo?.id;
    setText(''); setReplyTo(null); setSending(true);
    try { await api.sendMessage(activeAccount.id, { threadId, threadType, text: t, replyToMsgId: replyId }); }
    catch { setText(t); } finally { setSending(false); }
  };

  const openZalo = async () => {
    try { await Linking.openURL('zalo://'); }
    catch { Linking.openURL('https://zalo.me').catch(() => {}); }
  };

  const onCall = (kind: 'audio' | 'video') =>
    Alert.alert(
      kind === 'video' ? 'Gọi video' : 'Gọi thoại',
      'ZaloFake không thể thực hiện cuộc gọi — cuộc gọi Zalo dùng hệ thống riêng. Hãy dùng Zalo chính thức để gọi.',
      [{ text: 'Đóng', style: 'cancel' }, { text: 'Mở Zalo', onPress: openZalo }]
    );

  const pickAndSend = async () => {
    if (!api || !activeAccount || uploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Cần quyền', 'Cho phép truy cập thư viện ảnh để gửi.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: 0, quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    const toAsset = (a: any, kind: 'image' | 'video') => ({
      uri: a.uri, name: a.fileName || `upload.${kind === 'video' ? 'mp4' : 'jpg'}`,
      mime: a.mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg'), width: a.width, height: a.height,
    });
    const images = result.assets.filter((a) => a.type !== 'video').map((a) => toAsset(a, 'image'));
    const videos = result.assets.filter((a) => a.type === 'video').map((a) => toAsset(a, 'video'));
    setUploading(true);
    try {
      for (let i = 0; i < images.length; i += 15) {
        await api.sendMedia(activeAccount.id, { assets: images.slice(i, i + 15), kind: 'image', threadId, threadType });
      }
      for (const v of videos) {
        await api.sendMedia(activeAccount.id, { assets: [v], kind: 'video', threadId, threadType });
      }
    } catch (e: any) { Alert.alert('Gửi thất bại', e.message); } finally { setUploading(false); }
  };

  const pickDocument = async () => {
    if (!api || !activeAccount || uploading) return;
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const f = res.assets[0];
    setUploading(true);
    try {
      await api.sendMedia(activeAccount.id, {
        assets: [{ uri: f.uri, name: f.name || 'tailieu', mime: f.mimeType || 'application/octet-stream' }],
        kind: 'file', threadId, threadType,
      });
    } catch (e: any) { Alert.alert('Gửi thất bại', e.message); } finally { setUploading(false); }
  };

  const onSelectSticker = async (s: { stickerId: number; cateId: number; type: number }) => {
    if (!api || !activeAccount) return;
    try { await api.sendSticker(activeAccount.id, { ...s, threadId, threadType }); }
    catch (e: any) { Alert.alert('Lỗi', e.message); }
  };

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (uri && api && activeAccount) {
          setUploading(true);
          await api.sendVoice(activeAccount.id, { uri, name: 'voice.m4a', mime: 'audio/mp4', threadId, threadType });
        }
      } catch (e: any) { Alert.alert('Ghi âm lỗi', e.message); } finally { setUploading(false); }
    } else {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return Alert.alert('Cần quyền', 'Cho phép ghi âm để gửi tin nhắn thoại.');
      try {
        // iOS bat buoc bat che do ghi am truoc
        await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        setRecording(true);
      } catch (e: any) { Alert.alert('Không ghi âm được', e.message); }
    }
  };

  // --- Hanh dong tren tin (long-press) ---
  const doReact = async (iconName: string) => {
    const m = actionTarget; setActionTarget(null);
    if (!m || !api || !activeAccount) return;
    try { await api.reactMessage(activeAccount.id, { msgId: m.id, threadId, threadType, icon: iconName }); }
    catch (e: any) { Alert.alert('Lỗi', e.message); }
  };
  const doReply = () => { setReplyTo(actionTarget); setActionTarget(null); };
  const doForward = () => {
    const m = actionTarget; setActionTarget(null);
    if (!m) return;
    const mt = (m.msg_type || '').toLowerCase();
    const preview = mt.includes('video') ? '🎥 Video' : (mt.includes('photo') || mt.includes('image')) ? '🖼️ Hình ảnh' : m.content;
    navigation.navigate('Forward', { msgId: m.id, text: m.content, preview });
  };
  const doUndo = async () => {
    const m = actionTarget; setActionTarget(null);
    if (!m || !api || !activeAccount) return;
    try { await api.undoMessage(activeAccount.id, { msgId: m.id, threadId, threadType }); }
    catch (e: any) { Alert.alert('Không thu hồi được', e.message); }
  };

  // Gom anh lien tiep thanh album
  const renderData = useMemo<RenderItem[]>(() => {
    const out: RenderItem[] = [];
    let i = 0;
    while (i < messages.length) {
      const m = messages[i];
      if (isPhoto(m)) {
        const group = [m];
        let j = i + 1;
        while (j < messages.length && isPhoto(messages[j]) && messages[j].is_self === m.is_self
          && messages[j].sender_id === m.sender_id
          && Math.abs(messages[j].ts - group[group.length - 1].ts) < 120000) {
          group.push(messages[j]); j++;
        }
        if (group.length >= 2) {
          out.push({ type: 'album', id: 'alb-' + m.id, items: group, is_self: m.is_self, sender_id: m.sender_id, sender_name: m.sender_name, ts: m.ts });
          i = j; continue;
        }
      }
      out.push({ type: 'msg', id: m.id, message: m, ts: m.ts });
      i++;
    }
    return out;
  }, [messages]);

  const renderItem = ({ item, index }: { item: RenderItem; index: number }) => {
    const prev = renderData[index - 1];
    const showDay = !prev || dayKey(prev.ts) !== dayKey(item.ts);
    const dayEl = showDay ? <View style={styles.dayWrap}><Text style={styles.dayText}>{dayLabel(item.ts)}</Text></View> : null;

    if (item.type === 'album') {
      const showSender = threadType === 'group' && !item.is_self;
      return (
        <>
          {dayEl}
          {showSender && item.sender_name ? <Text style={styles.albumSender}>{item.sender_name}</Text> : null}
          <AlbumBubble items={item.items} self={item.is_self} onLongPress={setActionTarget} />
        </>
      );
    }
    const m = item.message;
    const nextItem = renderData[index + 1];
    const nextMsg = nextItem?.type === 'msg' ? nextItem.message : null;
    const isLastOfRun = !nextMsg || nextMsg.is_self !== m.is_self || nextMsg.sender_id !== m.sender_id;
    const prevMsg = prev?.type === 'msg' ? prev.message : null;
    const showSender = threadType === 'group' && !m.is_self && (!prevMsg || prevMsg.sender_id !== m.sender_id || dayKey(prev!.ts) !== dayKey(m.ts));
    const timeLabel = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const statusLabel = m.ts <= seenUpToTs ? 'Đã xem' : m.ts <= deliveredUpToTs ? 'Đã nhận' : 'Đã gửi';
    return (
      <>
        {dayEl}
        <MessageBubble
          message={m}
          showSender={showSender}
          showAvatar={isLastOfRun}
          onLongPress={setActionTarget}
          onPress={() => setExpandedId((p) => (p === m.id ? null : m.id))}
          onOpenVideo={setVideoUrl}
        />
        {expandedId === m.id ? (
          <Text style={[styles.tapStatus, m.is_self ? styles.tapStatusSelf : styles.tapStatusOther]}>
            {timeLabel}{m.is_self ? ` · ${statusLabel}` : ''}
          </Text>
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.hIcon}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Avatar uri={avatar} name={name} size={38} />
        <View style={styles.hInfo}>
          <Text style={styles.hName} numberOfLines={1}>{name || (threadType === 'group' ? 'Nhóm' : threadId)}</Text>
          <Text style={styles.hStatus}>{threadType === 'group' ? 'Nhóm' : 'Nhấn để xem thông tin'}</Text>
        </View>
        <TouchableOpacity onPress={() => onCall('audio')} hitSlop={8} style={styles.hIcon}><Ionicons name="call" size={22} color="#fff" /></TouchableOpacity>
        <TouchableOpacity onPress={() => onCall('video')} hitSlop={8} style={styles.hIcon}><Ionicons name="videocam" size={24} color="#fff" /></TouchableOpacity>
        <TouchableOpacity hitSlop={8} style={styles.hIcon} onPress={() => navigation.navigate('ThreadInfo', { threadId, threadType, name, avatar })}><Ionicons name="menu" size={24} color="#fff" /></TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={renderData}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={styles.loadOlderWrap}>
              {loadingOlder ? <ActivityIndicator color={colors.textMuted} /> :
                messages.length >= 50 ? <TouchableOpacity onPress={loadOlder}><Text style={styles.loadOlder}>Tải tin cũ hơn</Text></TouchableOpacity> : null}
            </View>
          }
        />

        {/* Thanh dang tra loi */}
        {replyTo ? (
          <View style={styles.replyBar}>
            <View style={styles.replyLine} />
            <View style={{ flex: 1 }}>
              <Text style={styles.replyTitle}>Đang trả lời {replyTo.is_self ? 'chính bạn' : (replyTo.sender_name || '')}</Text>
              <Text style={styles.replyContent} numberOfLines={1}>{replyTo.content || '[đính kèm]'}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={8}><Ionicons name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
          </View>
        ) : null}

        {peerTyping ? (
          <View style={styles.typingBar}>
            <Text style={styles.typingText}>{name || 'Đối phương'} đang soạn tin</Text>
            <Text style={styles.typingDots}>• • •</Text>
          </View>
        ) : null}

        {recording ? <Text style={styles.recordingHint}>● Đang ghi âm... chạm ⏹ để gửi</Text> : null}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity style={styles.inputIcon} onPress={() => setShowStickers(true)}>
            <Ionicons name="happy-outline" size={26} color={colors.textMuted} />
          </TouchableOpacity>
          <TextInput style={styles.input} value={text} onChangeText={handleTextChange} placeholder="Tin nhắn" placeholderTextColor={colors.textLight} multiline />
          {text.trim() ? (
            <TouchableOpacity style={styles.sendBtn} onPress={onSend} disabled={sending}>
              <Ionicons name="send" size={22} color="#fff" />
            </TouchableOpacity>
          ) : uploading ? (
            <View style={styles.inputIcon}><ActivityIndicator size="small" color={colors.primary} /></View>
          ) : (
            <>
              <TouchableOpacity style={styles.inputIcon} onPress={toggleRecording}>
                <Ionicons name={recording ? 'stop-circle' : 'mic-outline'} size={26} color={recording ? colors.danger : colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputIcon} onPress={pickAndSend}>
                <Ionicons name="image-outline" size={26} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputIcon} onPress={pickDocument}>
                <Ionicons name="attach" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <MessageActionSheet
        message={actionTarget}
        onClose={() => setActionTarget(null)}
        onReact={doReact}
        onReply={doReply}
        onForward={doForward}
        onUndo={doUndo}
      />

      <StickerPicker visible={showStickers} onClose={() => setShowStickers(false)} onSelect={onSelectSticker} />
      <VideoViewer url={videoUrl} onClose={() => setVideoUrl(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.chatBg },
  header: { backgroundColor: colors.headerBlue, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8, gap: 6 },
  hIcon: { padding: 4 },
  hInfo: { flex: 1, marginLeft: 4 },
  hName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hStatus: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  body: { flex: 1 },
  list: { paddingVertical: 10 },
  dayWrap: { alignItems: 'center', marginVertical: 10 },
  dayText: { backgroundColor: 'rgba(0,0,0,0.08)', color: colors.textMuted, fontSize: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  albumSender: { fontSize: 12, color: colors.textMuted, marginLeft: 16, marginBottom: 2 },
  tapStatus: { fontSize: 11, color: colors.textMuted, paddingHorizontal: 14, paddingTop: 2, paddingBottom: 2 },
  tapStatusSelf: { textAlign: 'right' },
  tapStatusOther: { textAlign: 'left', marginLeft: 40 },
  typingBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#E8F1FF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  typingText: { fontSize: 13, color: colors.primary, fontStyle: 'italic', fontWeight: '500' },
  typingDots: { fontSize: 13, color: colors.primary },
  recordingHint: { textAlign: 'center', color: colors.danger, fontSize: 13, paddingVertical: 4, backgroundColor: '#FFF0F0' },
  loadOlderWrap: { paddingVertical: 8, alignItems: 'center' },
  loadOlder: { color: colors.primary, fontSize: 13 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bgMuted, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  replyLine: { width: 3, alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 2 },
  replyTitle: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  replyContent: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 6, gap: 2, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  inputIcon: { padding: 6 },
  input: { flex: 1, fontSize: 16, color: colors.text, maxHeight: 110, paddingHorizontal: 8, paddingVertical: 6 },
  sendBtn: { backgroundColor: colors.primary, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
});
