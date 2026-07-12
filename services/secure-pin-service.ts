/**
 * Secure PIN Storage Service
 *
 * Stores the app unlock PIN in Expo SecureStore (hardware-backed keystore /
 * keychain) instead of plaintext AsyncStorage. Reads transparently migrate
 * any legacy plaintext PIN from AsyncStorage into SecureStore and delete the
 * plaintext copy, so existing users keep their PIN without noticing.
 *
 * Follows the same key conventions as services/secure-mnemonic-service.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'unlock_pin';
const LEGACY_ASYNC_STORAGE_PIN_KEY = 'pin';

/**
 * Retrieve the stored PIN, migrating a legacy plaintext PIN if present.
 * Returns null when no PIN is set or secure storage is unavailable.
 */
export async function getPin(): Promise<string | null> {
  try {
    const securePin = await SecureStore.getItemAsync(PIN_KEY);
    if (securePin) {
      return securePin;
    }

    // One-time migration: versions <= 1.2.2 kept the PIN in AsyncStorage
    const legacyPin = await AsyncStorage.getItem(LEGACY_ASYNC_STORAGE_PIN_KEY);
    if (legacyPin) {
      await SecureStore.setItemAsync(PIN_KEY, legacyPin);
      await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_PIN_KEY);
      console.log('🔐 Migrated unlock PIN from AsyncStorage to SecureStore');
      return legacyPin;
    }

    return null;
  } catch (error) {
    console.error('❌ Failed to read PIN from secure storage:', error);
    return null;
  }
}

/** Persist the PIN in SecureStore and remove any lingering plaintext copy. */
export async function savePin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
  try {
    await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_PIN_KEY);
  } catch {
    // Non-fatal: the secure copy is already written
  }
}

/** Remove the PIN from both stores (used by wallet erase/logout). */
export async function deletePin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  try {
    await AsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_PIN_KEY);
  } catch {
    // Non-fatal
  }
}
