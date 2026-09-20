/**
 * Thin wrapper around expo-secure-store for future OAuth tokens.
 * Tokens are never logged. Stubbed usage until cloud adapters go live.
 */
import * as SecureStore from 'expo-secure-store';

const PREFIX = 'rk.token.';

export async function saveSecret(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(PREFIX + key, value);
}

export async function readSecret(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(PREFIX + key);
}

export async function deleteSecret(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(PREFIX + key);
}
