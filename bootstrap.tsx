import { registerRootComponent } from 'expo';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

// Man hinh hien loi (chi dung RN core -> luon an toan)
function ErrorScreen({ where, err }: { where: string; err: any }) {
  const msg = err && (err.stack || err.message) ? String(err.stack || err.message) : String(err);
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: '#d00', marginBottom: 8 }}>
        ⚠️ Loi ({where})
      </Text>
      <ScrollView style={{ flex: 1 }}>
        <Text selectable style={{ fontSize: 12, color: '#111', fontFamily: 'monospace' }}>{msg}</Text>
      </ScrollView>
    </View>
  );
}

// Bo nho loi + callback de bao cho React ve lai man loi
let capturedError: any = null;
let notifyReact: ((e: any) => void) | null = null;

// Ghi de bo xu ly loi toan cuc cua RN: loi nghiem trong -> HIEN len man hinh,
// KHONG rethrow (tranh crash), de doc duoc noi dung loi.
try {
  const g: any = global as any;
  const prev = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((e: any, isFatal: boolean) => {
    if (isFatal) {
      capturedError = e;
      if (notifyReact) notifyReact(e);
      return; // nuot loi -> khong abort
    }
    if (prev) try { prev(e, isFatal); } catch { /* */ }
  });
} catch { /* */ }

// Nap App; neu loi ngay luc import thi bat luon
let AppComp: React.ComponentType | null = null;
let importError: any = null;
try {
  AppComp = require('./App').default;
} catch (e) {
  importError = e;
}

function Root() {
  const [err, setErr] = React.useState<any>(importError || capturedError);
  React.useEffect(() => {
    notifyReact = (e) => setErr(e);
    if (capturedError && !err) setErr(capturedError);
    return () => { notifyReact = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <ErrorScreen where={importError ? 'import' : 'runtime'} err={err} />;
  if (!AppComp) return <ErrorScreen where="import" err="App khong nap duoc" />;
  const A = AppComp;
  return <A />;
}

registerRootComponent(Root);
