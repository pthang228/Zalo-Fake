import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View, Easing } from 'react-native';
import { Call } from '../types';
import { Avatar } from './Avatar';
import { colors } from '../theme';

// Man hinh "cuoc goi den" toan man hinh.
// LUU Y: Chi hien thi + thong bao. Khong nghe/goi audio that duoc (gioi han Zalo).
export function IncomingCallModal({ call, onDismiss }: { call: Call | null; onDismiss: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!call) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [call, pulse]);

  if (!call) return null;
  const isVideo = call.call_type === 'video';

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.top}>
          <Text style={styles.callType}>{isVideo ? 'Cuoc goi video den' : 'Cuoc goi thoai den'}</Text>
          <Animated.View style={{ transform: [{ scale: pulse }], marginVertical: 24 }}>
            <Avatar uri={null} name={call.peer_name || call.peer_id} size={120} />
          </Animated.View>
          <Text style={styles.name}>{call.peer_name || call.peer_id || 'Khong ro'}</Text>
          <Text style={styles.sub}>Zalo dang goi...</Text>
          <View style={styles.warnBox}>
            <Text style={styles.warn}>
              ⚠️ Chi hien thong bao. Khong the nghe/goi truc tiep trong app (gioi han cua Zalo).
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.btn} onPress={onDismiss}>
            <Text style={[styles.btnIcon, styles.decline]}>✕</Text>
            <Text style={styles.btnLabel}>Bo qua</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={onDismiss}>
            <Text style={[styles.btnIcon, styles.accept]}>✓</Text>
            <Text style={styles.btnLabel}>Da xem</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.callBg, justifyContent: 'space-between', paddingVertical: 80 },
  top: { alignItems: 'center', paddingHorizontal: 24 },
  callType: { color: '#B8C4CE', fontSize: 15 },
  name: { color: '#fff', fontSize: 28, fontWeight: '700' },
  sub: { color: '#B8C4CE', fontSize: 15, marginTop: 8 },
  warnBox: { marginTop: 28, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, marginHorizontal: 8 },
  warn: { color: '#E8B84B', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 40 },
  btn: { alignItems: 'center', gap: 8 },
  btnIcon: { color: '#fff', fontSize: 28, width: 68, height: 68, borderRadius: 34, textAlign: 'center', lineHeight: 68, overflow: 'hidden' },
  decline: { backgroundColor: colors.danger },
  accept: { backgroundColor: colors.online },
  btnLabel: { color: '#fff', fontSize: 14 },
});
