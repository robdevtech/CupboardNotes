/**
 * Box adapter stub.
 * Chosen as #5 consumer cloud after Amazon Drive consumer file API discontinuation.
 *
 * OAuth plan:
 * - Box OAuth 2.0 (Authorization Code + PKCE where supported)
 * - Scopes: root_readwrite (or scoped app folder via Box JWT/app token in future)
 * - API: https://api.box.com/2.0/ and upload.box.com
 * - Tokens in expo-secure-store
 */
import type {
  CloudAuthSession,
  CloudFileInfo,
  CloudStorageAdapter,
} from '../CloudStorageAdapter';

export const boxAdapter: CloudStorageAdapter = {
  id: 'box',
  displayName: 'Box',
  authNotes:
    'Box OAuth 2.0. Scope: root_readwrite (narrow later). Upload via upload.box.com. Replaces Amazon Drive in top-5 set.',
  available: true,

  async isConnected() {
    return false;
  },

  async getSession() {
    return null;
  },

  async connect(): Promise<CloudAuthSession> {
    throw new Error('Box OAuth not implemented — Milestone 1 stub');
  },

  async disconnect() {},

  async ensureAppFolder() {
    return '/Cupboard Notes';
  },

  async list(): Promise<CloudFileInfo[]> {
    return [];
  },

  async read(): Promise<Uint8Array> {
    throw new Error('Box read not implemented');
  },

  async write(path: string): Promise<CloudFileInfo> {
    return { path, name: path.split('/').pop() ?? path };
  },

  async delete() {},
};
