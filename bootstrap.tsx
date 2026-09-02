import { registerRootComponent } from 'expo';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

// Man hinh hien loi (chi dung RN core -> luon an toan de import)
function ErrorScreen({ where, err }: { where: string; err: any }) {
  const msg = err && (err.stack || err.message) ? String(err.stack || err.message) : String(err);
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 70, paddingHorizontal: 18 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#d00', marginBottom: 10 }}>
        ⚠️ Loi khoi dong ({where})
      </Text>
      <ScrollView style={{ flex: 1 }}>
        <Text selectable style={{ fontSize: 13, color: '#111', fontFamily: 'monospace' }}>{msg}</Text>
      </ScrollView>
    </View>
  );
}

// Bat loi async/toan cuc som nhat co the
let earlyError: any = null;
try {
  const g: any = global as any;
  const prev = g.ErrorUtils && g.ErrorUtils.getGlobalHandler && g.ErrorUtils.getGlobalHandler();
  if (g.ErrorUtils && g.ErrorUtils.setGlobalHandler) {
    g.ErrorUtils.setGlobalHandler((e: any, isFatal: boolean) => {
      earlyError = e;
      if (prev) try { prev(e, isFatal); } catch { /* */ }
    });
  }
} catch { /* */ }

let Root: React.ComponentType;
try {
  // Nap App o day de bat duoc ca loi luc nap module (import native bi loi)
  Root = require('./App').default;
} catch (e) {
  Root = () => <ErrorScreen where="import App" err={e} />;
}

registerRootComponent(Root);
