/**
 * Secure storage wrapper for OAuth tokens.
 * Tokens are never logged.
 */
import * as SecureStore from 'expo-secure-store';

const PREFIX = 'cupboard.token.';

export async function saveSecret(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(PREFIX + key, value);
}

export async function readSecret(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(PREFIX + key);
}

export async function deleteSecret(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(PREFIX + key);
}
