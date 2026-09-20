/**
 * OneDrive (Microsoft Graph) adapter stub.
 *
 * OAuth plan:
 * - MSAL / expo-auth-session against Azure AD v2 endpoint
 * - Scopes: Files.ReadWrite, offline_access, User.Read
 * - App folder: /drive/special/approot or /drive/root:/Cupboard Notes
 * - Graph API: https://graph.microsoft.com/v1.0/me/drive/...
 */
import type {
  CloudAuthSession,
  CloudFileInfo,
  CloudStorageAdapter,
} from '../CloudStorageAdapter';

export const oneDriveAdapter: CloudStorageAdapter = {
  id: 'oneDrive',
  displayName: 'OneDrive',
  authNotes:
    'Microsoft Graph OAuth (Azure AD v2). Scopes: Files.ReadWrite, offline_access, User.Read. Folder: Cupboard Notes/ or approot.',
  available: true,

  async isConnected() {
    return false;
  },

  async getSession() {
    return null;
  },

  async connect(): Promise<CloudAuthSession> {
    throw new Error('OneDrive OAuth not implemented — Milestone 1 stub');
  },

  async disconnect() {},

  async ensureAppFolder() {
    return '/Cupboard Notes';
  },

  async list(): Promise<CloudFileInfo[]> {
    return [];
  },

  async read(): Promise<Uint8Array> {
    throw new Error('OneDrive read not implemented');
  },

  async write(path: string): Promise<CloudFileInfo> {
    return { path, name: path.split('/').pop() ?? path };
  },

  async delete() {},
};
