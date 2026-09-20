/**
 * Google Drive adapter stub (most fleshed of the five).
 *
 * OAuth plan (Milestone 2+):
 * - Use expo-auth-session + Google OAuth 2.0 (PKCE)
 * - Scopes: https://www.googleapis.com/auth/drive.file
 *   (app-created files only — least privilege)
 * - Store refresh token in expo-secure-store (never log)
 * - App folder: Drive appDataFolder OR a user-visible "Cupboard Notes" folder
 *   created via files.create with mimeType application/vnd.google-apps.folder
 * - Upload recipe.json + photo blobs via multipart upload to Drive REST v3
 * - Sync is additive; SQLite remains source of truth while offline
 */
import type {
  CloudAuthSession,
  CloudFileInfo,
  CloudStorageAdapter,
} from '../CloudStorageAdapter';
import { readSecret, saveSecret, deleteSecret } from '../../storage/secureStoreStub';

const SESSION_KEY = 'googleDrive.session';

export const googleDriveAdapter: CloudStorageAdapter = {
  id: 'googleDrive',
  displayName: 'Google Drive',
  authNotes:
    'OAuth 2.0 PKCE via expo-auth-session. Scope: drive.file. Tokens in SecureStore. App folder: Cupboard Notes/.',
  available: true,

  async isConnected() {
    return !!(await readSecret(SESSION_KEY));
  },

  async getSession() {
    const raw = await readSecret(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CloudAuthSession;
    } catch {
      return null;
    }
  },

  async connect() {
    // TODO(M2): launch Google OAuth with PKCE, exchange code, persist tokens
    const session: CloudAuthSession = {
      providerId: 'googleDrive',
      accountLabel: 'stub@gmail.com (not live)',
      connectedAt: new Date().toISOString(),
    };
    await saveSecret(SESSION_KEY, JSON.stringify(session));
    // Mark as stub-connected for settings UI demos; real OAuth not wired yet
    console.info(
      '[googleDrive] Stub connect — replace with expo-auth-session OAuth before production'
    );
    return session;
  },

  async disconnect() {
    await deleteSecret(SESSION_KEY);
    // TODO(M2): revoke token at Google revoke endpoint
  },

  async ensureAppFolder() {
    // TODO(M2): files.list q=name='Cupboard Notes' and mimeType=folder; create if missing
    return '/Cupboard Notes';
  },

  async list(_path: string): Promise<CloudFileInfo[]> {
    // TODO(M2): Drive files.list with parents filter
    return [];
  },

  async read(_path: string): Promise<Uint8Array> {
    throw new Error('Google Drive read not implemented — OAuth stub only (Milestone 1)');
  },

  async write(path: string, _data: Uint8Array, _mimeType?: string): Promise<CloudFileInfo> {
    // TODO(M2): multipart upload
    return { path, name: path.split('/').pop() ?? path };
  },

  async delete(_path: string): Promise<void> {
    // TODO(M2): files.delete
  },

  async syncRecipeBundle(recipeId, recipeJson, photos) {
    const base = await this.ensureAppFolder();
    const recipePath = `${base}/${recipeId}/recipe.json`;
    await this.write(recipePath, new TextEncoder().encode(recipeJson), 'application/json');
    const photoPaths: string[] = [];
    for (const p of photos) {
      const cloudPath = `${base}/${recipeId}/photos/${p.fileName}`;
      // TODO(M2): read localUri bytes and upload
      photoPaths.push(cloudPath);
    }
    return { recipePath, photoPaths };
  },
};
