/**
 * iCloud Drive adapter stub.
 *
 * Platform notes:
 * - Primary path: iOS/macOS via CloudKit / UIDocumentPicker / NSFileCoordinator
 * - Android: NOT available — adapter.available = false on non-iOS
 *
 * Auth plan:
 * - Uses Apple ID / device entitlement; no classic OAuth client ID
 * - expo modules / native ubiquity container entitlement required in a custom dev client
 * - Milestone 1: stub only; mark platform-limited in settings UI
 */
import { Platform } from 'react-native';
import type {
  CloudAuthSession,
  CloudFileInfo,
  CloudStorageAdapter,
} from '../CloudStorageAdapter';

export const iCloudAdapter: CloudStorageAdapter = {
  id: 'iCloud',
  displayName: 'iCloud Drive',
  authNotes:
    'iOS/Apple only — ubiquity container / CloudKit. No OAuth client secret. Unavailable on Android (graceful stub).',
  available: Platform.OS === 'ios',

  async isConnected() {
    return false;
  },

  async getSession() {
    return null;
  },

  async connect(): Promise<CloudAuthSession> {
    if (Platform.OS !== 'ios') {
      throw new Error('iCloud Drive is only available on iOS / Apple platforms');
    }
    throw new Error('iCloud connect not implemented — Milestone 1 stub');
  },

  async disconnect() {},

  async ensureAppFolder() {
    return 'Cupboard Notes';
  },

  async list(): Promise<CloudFileInfo[]> {
    return [];
  },

  async read(): Promise<Uint8Array> {
    throw new Error('iCloud read not implemented');
  },

  async write(path: string): Promise<CloudFileInfo> {
    return { path, name: path.split('/').pop() ?? path };
  },

  async delete() {},
};
