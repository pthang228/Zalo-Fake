import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, Text, TouchableHighlight, View, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { ZaloHeader } from '../components/ZaloHeader';
import { Avatar } from '../components/Avatar';
import { colors } from '../theme';
import { Contact } from '../types';

type Tab = 'friends' | 'groups';

export function ContactsScreen({ navigation }: any) {
  const { api, activeAccount } = useApp();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!api || !activeAccount) return;
    setLoading(true);
    try {
      const c = await api.getContacts(activeAccount.id);
      setFriends(c.friends || []);
      setGroups(c.groups || []);
    } catch { /* */ } finally { setLoading(false); }
  }, [api, activeAccount]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openChat = (c: Contact) =>
    navigation.navigate('Chat', { threadId: c.id, threadType: c.type, name: c.name, avatar: c.avatar });

  // Nhom ban be theo chu cai dau
  const friendSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = friends.filter((f) => (f.name || '').toLowerCase().includes(q));
    const map: Record<string, Contact[]> = {};
    for (const f of list) {
      const ch = (f.name || '#').trim().charAt(0).toUpperCase();
      const key = /[A-Z]/i.test(ch) ? ch : '#';
      (map[key] = map[key] || []).push(f);
    }
    return Object.keys(map).sort().map((k) => ({ title: k, data: map[k].sort((a, b) => (a.name || '').localeCompare(b.name || '')) }));
  }, [friends, query]);

  const groupSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = groups.filter((g) => (g.name || '').toLowerCase().includes(q));
    return [{ title: `Nhóm (${list.length})`, data: list }];
  }, [groups, query]);

  const sections = tab === 'friends' ? friendSections : groupSections;

  return (
    <View style={styles.container}>
      <ZaloHeader search={query} onSearchChange={setQuery} placeholder="Tìm bạn bè, nhóm" />

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'friends' && styles.tabActive]} onPress={() => setTab('friends')}>
          <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>Bạn bè</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'groups' && styles.tabActive]} onPress={() => setTab('groups')}>
          <Text style={[styles.tabText, tab === 'groups' && styles.tabTextActive]}>Nhóm</Text>
        </TouchableOpacity>
      </View>

      {loading && sections.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          renderItem={({ item }) => (
            <TouchableHighlight underlayColor={colors.separator} onPress={() => openChat(item)}>
              <View style={styles.row}>
                <Avatar uri={item.avatar} name={item.name || item.id} size={48} />
                <Text style={styles.name}>{item.name || item.id}</Text>
                <View style={styles.rowActions}>
                  <Ionicons name="call-outline" size={22} color={colors.textMuted} style={{ marginRight: 18 }} />
                  <Ionicons name="videocam-outline" size={22} color={colors.textMuted} />
                </View>
              </View>
            </TouchableHighlight>
          )}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>Chưa có {tab === 'friends' ? 'bạn bè' : 'nhóm'}. Kéo xuống tab Cá nhân để đồng bộ.</Text></View>}
          contentContainerStyle={sections.length === 0 && styles.grow}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', backgroundColor: colors.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.text },
  sectionHeader: { backgroundColor: colors.bgMuted, paddingHorizontal: 16, paddingVertical: 5, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12, backgroundColor: colors.bg },
  name: { flex: 1, fontSize: 16, color: colors.text },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  grow: { flexGrow: 1 },
  empty: { color: colors.textMuted, textAlign: 'center' },
});
