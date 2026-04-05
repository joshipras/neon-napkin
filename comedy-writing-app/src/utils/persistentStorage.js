import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function getStoredValue(key) {
  if (!key) {
    return null;
  }

  if (isWeb && typeof window !== 'undefined') {
    return window.localStorage.getItem(key);
  }

  return AsyncStorage.getItem(key);
}

export async function setStoredValue(key, value) {
  if (!key) {
    return;
  }

  if (isWeb && typeof window !== 'undefined') {
    window.localStorage.setItem(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

export async function removeStoredValue(key) {
  if (!key) {
    return;
  }

  if (isWeb && typeof window !== 'undefined') {
    window.localStorage.removeItem(key);
    return;
  }

  await AsyncStorage.removeItem(key);
}
