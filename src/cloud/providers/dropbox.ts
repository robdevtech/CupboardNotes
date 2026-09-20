/**
 * Dropbox adapter stub.
 *
 * OAuth plan:
 * - Dropbox OAuth 2.0 with PKCE (expo-auth-session)
 * - Scopes: files.content.read, files.content.write, files.metadata.read
 * - App folder access type preferred (app-folder permission)
 * - Tokens in expo-secure-store
 */
import type {
  CloudAuthSession,
  CloudFileInfo,
  CloudStorageAdapter,
} from '../CloudStorageAdapter';

export const dropboxAdapter: CloudStorageAdapter = {
  id: 'dropbox',
  displayName: 'Dropbox',
  authNotes:
    'OAuth 2.0 PKCE. Prefer app-folder permission. Scopes: files.content.read/write, files.metadata.read.',
  available: true,

  async isConnected() {
    return false;
  },

  async getSession() {
    return null;
  },

  async connect(): Promise<CloudAuthSession> {
    throw new Error('Dropbox OAuth not implemented — Milestone 1 stub');
  },

  async disconnect() {},

  async ensureAppFolder() {
    return '/Cupboard Notes';
  },

  async list(): Promise<CloudFileInfo[]> {
    return [];
  },

  async read(): Promise<Uint8Array> {
    throw new Error('Dropbox read not implemented');
  },

  async write(path: string): Promise<CloudFileInfo> {
    return { path, name: path.split('/').pop() ?? path };
  },

  async delete() {},
};
