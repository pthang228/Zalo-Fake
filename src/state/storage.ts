import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings } from '../types';

const SETTINGS_KEY = 'zalofake.settings';
const ACTIVE_ACCOUNT_KEY = 'zalofake.activeAccount';

export async function loadSettings(): Promise<Settings | null> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? (JSON.parse(raw) as Settings) : null;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function clearSettings(): Promise<void> {
  await AsyncStorage.removeItem(SETTINGS_KEY);
}

const MUTED_KEY = 'zalofake.muted';
export async function loadMuted(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(MUTED_KEY);
  return raw ? JSON.parse(raw) : [];
}
export async function saveMuted(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(MUTED_KEY, JSON.stringify(ids));
}

export async function loadActiveAccount(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_ACCOUNT_KEY);
}

export async function saveActiveAccount(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
}
