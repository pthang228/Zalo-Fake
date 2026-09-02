import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as VideoThumbnails from 'expo-video-thumbnails';

// Cache toan cuc: moi video chi tao anh thu nho 1 LAN (khong lam lai khi cuon)
const thumbCache = new Map<string, string>();
const failed = new Set<string>();

// Tao anh thu nhỏ tu video (cho video khong co thumbnail san, vd share.file)
export function VideoThumb({ url, style }: { url: string | null; style?: any }) {
  const [thumb, setThumb] = useState<string | null>(url ? thumbCache.get(url) || null : null);

  useEffect(() => {
    let alive = true;
    if (!url || thumbCache.has(url) || failed.has(url)) {
      if (url && thumbCache.has(url)) setThumb(thumbCache.get(url)!);
      return;
    }
    VideoThumbnails.getThumbnailAsync(url, { time: 800, quality: 0.5 })
      .then((r) => { thumbCache.set(url, r.uri); if (alive) setThumb(r.uri); })
      .catch(() => { failed.add(url); /* de nen toi */ });
    return () => { alive = false; };
  }, [url]);

  if (thumb) return <Image source={{ uri: thumb }} style={style} contentFit="cover" transition={150} />;
  return <View style={[style, styles.dark]} />;
}

const styles = StyleSheet.create({
  dark: { backgroundColor: '#2A3942', alignItems: 'center', justifyContent: 'center' },
});
