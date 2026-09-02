import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

function Player({ url }: { url: string }) {
  const player = useVideoPlayer({ uri: url }, (p) => { p.loop = false; p.play(); });
  return <VideoView player={player} style={styles.video} contentFit="contain" allowsFullscreen nativeControls />;
}

// Xem video toan man hinh ngay trong app
export function VideoViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.bg}>
        {url ? <Player key={url} url={url} /> : null}
        <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={30} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', height: '80%' },
  close: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 4 },
});
