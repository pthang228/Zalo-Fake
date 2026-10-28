import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { useApp } from '../state/AppContext';
import { MessageBubble } from '../components/MessageBubble';
import { AlbumBubble, imgOf } from '../components/AlbumBubble';
import { MessageActionSheet } from '../components/MessageActionSheet';
import { ShortcutPanel, ShortcutPicker } from '../components/Shortcuts';
import { StickerPicker } from '../components/StickerPicker';
import { VideoViewer } from '../components/VideoViewer';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Message, Shortcut, Thread } from '../types';

function dayKey(ts: number) { return new Date(ts).toDateString(); }
const pad2 = (n: number) => String(n).padStart(2, '0');
// Moc thoi gian giua cac tin kieu Zalo: "15:24 Hôm qua", "23:05 22/10/2026"
function stampLabel(ts: number) {
  const d = new Date(ts); const now = new Date();
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) return `${hm} Hôm nay`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `${hm} Hôm qua`;
  return `${hm} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
const STAMP_GAP = 20 * 60 * 1000; // cach nhau >= 20 phut (hoac khac ngay) -> hien moc moi

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
  const [actionAlbum, setActionAlbum] = useState<Message[] | null>(null);
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
      } else if (ev.type === 'deleted' && ev.accountId === activeAccount?.id) {
        // Xoa tin phia minh (tu Zalo dien thoai/PC) -> go khoi man hinh nhu Zalo
        const gone = new Set(ev.msgIds);
        setMessages((prev) => prev.filter((m) => !gone.has(m.id)));
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
  // whole = true: tin trong album -> chuyen tiep ca album (giong Zalo)
  const doForward = (whole = true) => {
    const m = actionTarget; const album = actionAlbum;
    setActionTarget(null); setActionAlbum(null);
    if (m) openForward(whole && album && album.length > 1 ? album : [m]);
  };
  const openForward = (items: Message[]) => {
    const m = items[0];
    const mt = (m.msg_type || '').toLowerCase();
    const preview = items.length > 1 ? `🖼️ ${items.length} ảnh`
      : mt.includes('video') ? '🎥 Video' : (mt.includes('photo') || mt.includes('image')) ? '🖼️ Hình ảnh' : m.content;
    const thumbs = items.map(imgOf).filter(Boolean) as string[];
    navigation.navigate('Forward', { msgIds: items.map((x) => x.id), text: items.length === 1 ? m.content : undefined, preview, thumbs });
  };

  // Luu vao My Documents (Cloud cua toi) = chuyen tiep toi hoi thoai do
  const [cloud, setCloud] = useState<Thread | null | undefined>(undefined);
  useEffect(() => {
    if (api && activeAccount) api.getCloudThread(activeAccount.id).then(setCloud, () => {});
  }, [api, activeAccount]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<any>(null);
  const showToast = (t: string) => {
    setToast(t); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };
  const saveToCloud = async (items: Message[]) => {
    if (!api || !activeAccount) return;
    try {
      const target = cloud === undefined ? await api.getCloudThread(activeAccount.id) : cloud;
      if (cloud === undefined) setCloud(target);
      if (!target) { Alert.alert('Chưa thấy My Documents', 'Tài khoản này chưa có hội thoại My Documents. Mở Zalo trên điện thoại, gửi thử 1 tin vào My Documents rồi thử lại.'); return; }
      showToast('Đang lưu vào My Documents…');
      await api.forwardMessage(activeAccount.id, { msgIds: items.map((x) => x.id), text: items.length === 1 ? items[0].content ?? undefined : undefined, targets: [{ id: target.id, type: target.type }] });
      showToast('Đã lưu vào My Documents');
    } catch (e: any) {
      setToast(null);
      Alert.alert('Không lưu được', e.message);
    }
  };
  const isCloudThread = cloud?.id === threadId;

  // --- Phim tat: gui nhanh / them tin dang giu vao phim tat ---
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [pickFor, setPickFor] = useState<Message[] | null>(null);
  const sendShortcut = async (sc: Shortcut) => {
    if (!api || !activeAccount) return;
    showToast(`Đang gửi "${sc.name}"…`);
    try { await api.sendShortcut(activeAccount.id, sc.id, { threadId, threadType }); showToast(`Đã gửi "${sc.name}"`); }
    catch (e: any) { setToast(null); Alert.alert('Không gửi được', e.message); }
  };
  const doAddShortcut = () => {
    const m = actionTarget; const album = actionAlbum;
    setActionTarget(null); setActionAlbum(null);
    if (m) setPickFor(album && album.length > 1 ? album : [m]);
  };
  const addToShortcut = async (sc: Shortcut) => {
    const items = pickFor; setPickFor(null);
    if (!items || !api || !activeAccount) return;
    showToast(`Đang thêm vào "${sc.name}"…`);
    try {
      const r = await api.addShortcutItems(sc.id, { accountId: activeAccount.id, msgIds: items.map((x) => x.id) });
      showToast(r.added ? `Đã thêm ${r.added} mục vào "${sc.name}"` : 'Không có gì để thêm');
      if (r.skipped) Alert.alert('Có tin không thêm được', `${r.skipped} tin bị bỏ qua (vd. video đồng bộ từ điện thoại không còn link). Hãy gửi lại video đó vào My Documents rồi thêm.`);
    } catch (e: any) { setToast(null); Alert.alert('Không thêm được', e.message); }
  };
  const doSaveCloud = () => {
    const m = actionTarget; const album = actionAlbum;
    setActionTarget(null); setActionAlbum(null);
    if (m) saveToCloud(album && album.length > 1 ? album : [m]);
  };
  // Cham tim o goc bong bong = tha tim
  const heart = async (m: Message) => {
    if (!api || !activeAccount) return;
    try { await api.reactMessage(activeAccount.id, { msgId: m.id, threadId, threadType, icon: 'HEART' }); }
    catch (e: any) { Alert.alert('Lỗi', e.message); }
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
    const stampAt = (i: number) => i === 0 || (!!renderData[i] && !!renderData[i - 1]
      && (renderData[i].ts - renderData[i - 1].ts >= STAMP_GAP || dayKey(renderData[i].ts) !== dayKey(renderData[i - 1].ts)));
    const dayEl = stampAt(index) ? <View style={styles.dayWrap}><Text style={styles.dayText}>{stampLabel(item.ts)}</Text></View> : null;

    if (item.type === 'album') {
      const showSender = threadType === 'group' && !item.is_self;
      return (
        <>
          {dayEl}
          {showSender && item.sender_name ? <Text style={styles.albumSender}>{item.sender_name}</Text> : null}
          <AlbumBubble
            items={item.items} self={item.is_self}
            onLongPress={(m) => { setActionAlbum(item.items); setActionTarget(m); }}
            onForward={() => openForward(item.items)}
          />
        </>
      );
    }
    const m = item.message;
    const nextItem = renderData[index + 1];
    const nextMsg = nextItem?.type === 'msg' ? nextItem.message : null;
    // Het 1 cum tin (doi nguoi gui / sang moc thoi gian moi) -> hien gio + nut tim nhu Zalo
    const isLastOfRun = !nextItem || stampAt(index + 1) || !nextMsg || nextMsg.is_self !== m.is_self || nextMsg.sender_id !== m.sender_id;
    const prevMsg = prev?.type === 'msg' ? prev.message : null;
    const showSender = threadType === 'group' && !m.is_self && (!prevMsg || prevMsg.sender_id !== m.sender_id || stampAt(index));
    const timeLabel = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const statusLabel = m.ts <= seenUpToTs ? 'Đã xem' : m.ts <= deliveredUpToTs ? 'Đã nhận' : 'Đã gửi';
    return (
      <>
        {dayEl}
        <MessageBubble
          message={m}
          showSender={showSender}
          showAvatar={isLastOfRun}
          onLongPress={(m: Message) => { setActionAlbum(null); setActionTarget(m); }}
          onPress={() => setExpandedId((p) => (p === m.id ? null : m.id))}
          onOpenVideo={setVideoUrl}
          showTime={isLastOfRun}
          showHeart={isLastOfRun}
          onHeart={heart}
          onForward={(x) => openForward([x])}
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
        <TouchableOpacity style={styles.hInfo} onPress={() => navigation.navigate('ThreadInfo', { threadId, threadType, name, avatar })}>
          <Text style={styles.hName} numberOfLines={1}>{name || (threadType === 'group' ? 'Nhóm' : threadId)}</Text>
          {threadType === 'group' ? <Text style={styles.hStatus}>Nhóm</Text> : null}
        </TouchableOpacity>
        {isCloudThread ? null : (
          <>
            <TouchableOpacity onPress={() => onCall('audio')} hitSlop={8} style={styles.hIcon}><Ionicons name="call-outline" size={24} color="#fff" /></TouchableOpacity>
            <TouchableOpacity onPress={() => onCall('video')} hitSlop={8} style={styles.hIcon}><Ionicons name="videocam-outline" size={26} color="#fff" /></TouchableOpacity>
          </>
        )}
        <TouchableOpacity hitSlop={8} style={styles.hIcon} onPress={() => navigation.navigate('ThreadInfo', { threadId, threadType, name, avatar })}><Ionicons name="list-outline" size={27} color="#fff" /></TouchableOpacity>
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
          <TouchableOpacity style={styles.inputIcon} onPress={() => setShowShortcuts(true)}>
            <Ionicons name="flash-outline" size={25} color={colors.primary} />
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
              <TouchableOpacity style={styles.inputIcon} onPress={pickDocument}>
                <Ionicons name="ellipsis-horizontal" size={26} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputIcon} onPress={toggleRecording}>
                <Ionicons name={recording ? 'stop-circle' : 'mic-outline'} size={26} color={recording ? colors.danger : colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputIcon} onPress={pickAndSend}>
                <Ionicons name="image-outline" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {toast ? (
        <View pointerEvents="none" style={styles.toastWrap}><Text style={styles.toast}>{toast}</Text></View>
      ) : null}

      <MessageActionSheet
        message={actionTarget}
        albumCount={actionAlbum?.length ?? 0}
        onClose={() => { setActionTarget(null); setActionAlbum(null); }}
        onReact={doReact}
        onReply={doReply}
        onForward={() => doForward(true)}
        onForwardOne={() => doForward(false)}
        onSaveCloud={isCloudThread ? undefined : doSaveCloud}
        onAddShortcut={doAddShortcut}
        onUndo={doUndo}
      />

      <ShortcutPanel
        visible={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        onSend={sendShortcut}
        onManage={() => navigation.navigate('Shortcuts')}
      />
      <ShortcutPicker visible={!!pickFor} count={pickFor?.length ?? 0} onClose={() => setPickFor(null)} onPick={addToShortcut} />

      <StickerPicker visible={showStickers} onClose={() => setShowStickers(false)} onSelect={onSelectSticker} />
      <VideoViewer url={videoUrl} onClose={() => setVideoUrl(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 0, right: 0, top: '45%', alignItems: 'center' },
  toast: { backgroundColor: 'rgba(0,0,0,0.78)', color: '#fff', fontSize: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, overflow: 'hidden' },
  root: { flex: 1, backgroundColor: colors.chatBg },
  header: { backgroundColor: colors.headerBlue, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 10, gap: 10 },
  hIcon: { padding: 4 },
  hInfo: { flex: 1, marginLeft: 2 },
  hName: { color: '#fff', fontSize: 18, fontWeight: '600' },
  hStatus: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  body: { flex: 1 },
  list: { paddingVertical: 10 },
  dayWrap: { alignItems: 'center', marginTop: 14, marginBottom: 8 },
  dayText: { backgroundColor: 'rgba(100,112,128,0.38)', color: '#fff', fontSize: 13, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
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
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, gap: 4, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  inputIcon: { padding: 6 },
  input: { flex: 1, fontSize: 17, color: colors.text, maxHeight: 110, paddingHorizontal: 6, paddingVertical: 6 },
  sendBtn: { backgroundColor: colors.primary, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
});
