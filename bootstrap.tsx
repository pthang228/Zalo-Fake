import { registerRootComponent } from 'expo';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

// Man hinh hien loi (chi dung RN core -> luon an toan)
function ErrorScreen({ where, err }: { where: string; err: any }) {
  const msg = err && (err.stack || err.message) ? String(err.stack || err.message) : String(err);
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: '#d00', marginBottom: 8 }}>⚠️ Loi ({where})</Text>
      <ScrollView style={{ flex: 1 }}>
        <Text selectable style={{ fontSize: 12, color: '#111', fontFamily: 'monospace' }}>{msg}</Text>
      </ScrollView>
    </View>
  );
}

let capturedError: any = null;
let notifyReact: ((e: any) => void) | null = null;
try {
  const g: any = global as any;
  const prev = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((e: any, isFatal: boolean) => {
    if (isFatal) { capturedError = e; if (notifyReact) notifyReact(e); return; }
    if (prev) try { prev(e, isFatal); } catch { /* */ }
  });
} catch { /* */ }

// BUILD 7 (BAN TRAN): KHONG nap App. Chi hien 1 man hinh don gian
// bang RN core, de kiem tra native bridge co khoi dong duoc khong.
function Root() {
  const [err, setErr] = React.useState<any>(capturedError);
  React.useEffect(() => { notifyReact = (e) => setErr(e); return () => { notifyReact = null; }; }, []);
  if (err) return <ErrorScreen where="runtime" err={err} />;
  return (
    <View style={{ flex: 1, backgroundColor: '#0a84ff', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>BUILD 7 OK</Text>
      <Text style={{ color: '#fff', fontSize: 14, marginTop: 10 }}>ban tran chay duoc</Text>
    </View>
  );
}

registerRootComponent(Root);
