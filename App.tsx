import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AppProvider, useApp } from './src/state/AppContext';
import { SetupScreen } from './src/screens/SetupScreen';
import { AddAccountScreen } from './src/screens/AddAccountScreen';
import { ThreadsScreen } from './src/screens/ThreadsScreen';
import { ContactsScreen } from './src/screens/ContactsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ForwardScreen } from './src/screens/ForwardScreen';
import { ThreadInfoScreen } from './src/screens/ThreadInfoScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { makePlaceholder } from './src/screens/PlaceholderScreen';
import { IncomingCallModal } from './src/components/IncomingCallModal';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const DiscoverScreen = makePlaceholder('Khám phá', 'compass');
const TimelineScreen = makePlaceholder('Nhật ký', 'time');

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Messages: ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
  Contacts: ['people', 'people-outline'],
  Discover: ['compass', 'compass-outline'],
  Timeline: ['time', 'time-outline'],
  Profile: ['person', 'person-outline'],
};

function MainTabs() {
  const { unreadTotal } = useApp();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 58, paddingBottom: 6, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ focused, color, size }) => {
          const [on, off] = ICONS[route.name] || ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? on : off} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Messages"
        component={ThreadsScreen}
        options={{ tabBarLabel: 'Tin nhắn', tabBarBadge: unreadTotal > 0 ? (unreadTotal > 99 ? '99+' : unreadTotal) : undefined }}
      />
      <Tab.Screen name="Contacts" component={ContactsScreen} options={{ tabBarLabel: 'Danh bạ' }} />
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ tabBarLabel: 'Khám phá' }} />
      <Tab.Screen name="Timeline" component={TimelineScreen} options={{ tabBarLabel: 'Nhật ký' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { ready, incomingCall, dismissIncomingCall } = useApp();

  if (!ready) {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>ZaloFake</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        <Text style={styles.build}>build 6 · tat thong bao</Text>
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Forward"
            component={ForwardScreen}
            options={{ presentation: 'modal', headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}
          />
          <Stack.Screen
            name="ThreadInfo"
            component={ThreadInfoScreen}
            options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', headerTitleAlign: 'center' }}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}
          />
          <Stack.Screen
            name="AddAccount"
            component={AddAccountScreen}
            options={{
              title: 'Thêm tài khoản Zalo',
              presentation: 'modal',
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen
            name="Setup"
            component={SetupScreen}
            options={{
              title: 'Địa chỉ backend',
              presentation: 'modal',
              headerShown: true,
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: '#fff',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      <IncomingCallModal call={incomingCall} onDismiss={dismissIncomingCall} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ErrorBoundary>
        <AppProvider>
          <RootNavigator />
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  logo: { fontSize: 36, fontWeight: '800', color: colors.primary },
  build: { position: 'absolute', bottom: 40, fontSize: 12, color: colors.textMuted },
});
