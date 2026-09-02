import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Thong bao cuc bo (local notification): tin nhan moi, cuoc goi den.
// Luu y: push tu xa (remote) khong dung trong Expo Go SDK moi; local van chay.

let configured = false;

export async function setupNotifications() {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch { /* co the loi tren web */ }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Tin nhan',
        importance: Notifications.AndroidImportance.HIGH,
      });
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Cuoc goi',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 500, 500, 500],
      });
    } catch { /* */ }
  }
}

export async function notifyMessage(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
      ...(Platform.OS === 'android' ? { identifier: undefined } : {}),
    });
  } catch { /* */ }
}

export async function notifyCall(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default', priority: Notifications.AndroidNotificationPriority.MAX },
      trigger: null,
    });
  } catch { /* */ }
}
