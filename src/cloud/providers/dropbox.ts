/**
 * Dropbox adapter with OAuth 2.0 PKCE flow and real API integration.
 *
 * OAuth: Dropbox OAuth 2.0 with PKCE (expo-auth-session)
 * Scopes: files.content.read, files.content.write, files.metadata.read
 * Access type: Full Dropbox with /Cupboard Notes folder
 * Tokens: expo-secure-store (access + refresh tokens)
 */
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import type {
  CloudAuthSession,
  CloudFileInfo,
  CloudStorageAdapter,
} from '../CloudStorageAdapter';
import { saveSecret, readSecret, deleteSecret } from '../../storage/secureStoreStub';

WebBrowser.maybeCompleteAuthSession();

const DROPBOX_APP_KEY =
  process.env.EXPO_PUBLIC_DROPBOX_APP_KEY || Constants.expoConfig?.extra?.DROPBOX_APP_KEY || '';
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'cupboardnotes',
  path: 'auth',
});

const AUTH_ENDPOINT = 'https://www.dropbox.com/oauth2/authorize';
const TOKEN_ENDPOINT = 'https://api.dropboxapi.com/oauth2/token';
const API_ENDPOINT = 'https://api.dropboxapi.com/2';
const CONTENT_ENDPOINT = 'https://content.dropboxapi.com/2';

const SCOPES = ['files.content.read', 'files.content.write', 'files.metadata.read'];

interface DropboxTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
  accountLabel?: string;
  connectedAt: string;
}

async function getStoredTokens(): Promise<DropboxTokens | null> {
  const stored = await readSecret('dropbox');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as DropboxTokens;
  } catch {
    return null;
  }
}

async function saveTokens(tokens: DropboxTokens): Promise<void> {
  await saveSecret('dropbox', JSON.stringify(tokens));
}

async function clearTokens(): Promise<void> {
  await deleteSecret('dropbox');
}

async function refreshAccessToken(refreshToken: string): Promise<DropboxTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: DROPBOX_APP_KEY,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  const expiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : undefined;

  const tokens: DropboxTokens = {
    accessToken: data.access_token,
    refreshToken,
    expiresAt,
    connectedAt: new Date().toISOString(),
  };

  await saveTokens(tokens);
  return tokens;
}

async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  if (tokens.expiresAt && Date.now() >= tokens.expiresAt - 60000) {
    if (tokens.refreshToken) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      return refreshed.accessToken;
    }
    return null;
  }

  return tokens.accessToken;
}

async function apiRequest(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    isContent?: boolean;
  } = {}
): Promise<Response> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Not authenticated with Dropbox');

  const base = options.isContent ? CONTENT_ENDPOINT : API_ENDPOINT;
  const url = `${base}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  if (options.body && !options.isContent) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method: options.method || 'POST',
    headers,
    body: options.body
      ? options.isContent
        ? (options.body as BodyInit)
        : JSON.stringify(options.body)
      : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox API error ${response.status}: ${errorText}`);
  }

  return response;
}

async function getAccountInfo(): Promise<{ account_id: string; name: { display_name: string } }> {
  const response = await apiRequest('/users/get_current_account');
  return response.json();
}

export const dropboxAdapter: CloudStorageAdapter = {
  id: 'dropbox',
  displayName: 'Dropbox',
  authNotes:
    'OAuth 2.0 PKCE with offline access. Full Dropbox access, syncs to /Cupboard Notes folder. Requires DROPBOX_APP_KEY in app config.',
  available: true,

  async isConnected() {
    const tokens = await getStoredTokens();
    return tokens !== null;
  },

  async getSession() {
    const tokens = await getStoredTokens();
    if (!tokens) return null;

    return {
      providerId: 'dropbox',
      accountLabel: tokens.accountLabel || 'Dropbox Account',
      connectedAt: tokens.connectedAt,
    };
  },

  async connect(): Promise<CloudAuthSession> {
    if (!DROPBOX_APP_KEY) {
      throw new Error(
        'DROPBOX_APP_KEY not configured. Set it in app.json extra.DROPBOX_APP_KEY or use EXPO_PUBLIC_DROPBOX_APP_KEY environment variable.'
      );
    }

    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl = `${AUTH_ENDPOINT}?${new URLSearchParams({
      client_id: DROPBOX_APP_KEY,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      token_access_type: 'offline',
      scope: SCOPES.join(' '),
    }).toString()}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type !== 'success') {
      throw new Error('OAuth flow cancelled or failed');
    }

    const params = new URLSearchParams(result.url.split('?')[1]);
    const code = params.get('code');
    if (!code) {
      throw new Error('No authorization code received');
    }

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: DROPBOX_APP_KEY,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    });

    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const expiresAt = tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined;

    const accountInfo = await (async () => {
      try {
        const tempToken = tokenData.access_token;
        const response = await fetch(`${API_ENDPOINT}/users/get_current_account`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tempToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(null),
        });
        if (response.ok) {
          const data = await response.json();
          return {
            accountId: data.account_id,
            accountLabel: data.name.display_name || 'Dropbox Account',
          };
        }
      } catch {
        // Ignore account info fetch errors
      }
      return { accountId: tokenData.account_id, accountLabel: 'Dropbox Account' };
    })();

    const connectedAt = new Date().toISOString();

    const tokens: DropboxTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      accountId: accountInfo.accountId,
      accountLabel: accountInfo.accountLabel,
      connectedAt,
    };

    await saveTokens(tokens);

    return {
      providerId: 'dropbox',
      accountLabel: accountInfo.accountLabel,
      connectedAt,
    };
  },

  async disconnect() {
    const token = await getValidAccessToken();
    if (token) {
      try {
        await fetch(`${API_ENDPOINT}/auth/token/revoke`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(null),
        });
      } catch {
        // Ignore revoke errors
      }
    }
    await clearTokens();
  },

  async ensureAppFolder() {
    const folderPath = '/Cupboard Notes';
    try {
      await apiRequest('/files/get_metadata', {
        body: { path: folderPath },
      });
    } catch {
      try {
        await apiRequest('/files/create_folder_v2', {
          body: { path: folderPath },
        });
      } catch (error) {
        throw new Error(`Failed to create app folder: ${error}`);
      }
    }
    return folderPath;
  },

  async list(path: string): Promise<CloudFileInfo[]> {
    const response = await apiRequest('/files/list_folder', {
      body: { path },
    });

    const data = await response.json();
    return (data.entries || []).map((entry: any) => ({
      path: entry.path_display || entry.path_lower,
      name: entry.name,
      size: entry.size,
      updatedAt: entry.client_modified || entry.server_modified,
      isFolder: entry['.tag'] === 'folder',
    }));
  },

  async read(path: string): Promise<Uint8Array> {
    const response = await apiRequest('/files/download', {
      isContent: true,
      headers: {
        'Dropbox-API-Arg': JSON.stringify({ path }),
      },
      body: null,
    });

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  },

  async write(path: string, data: Uint8Array, mimeType?: string): Promise<CloudFileInfo> {
    const response = await apiRequest('/files/upload', {
      isContent: true,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path,
          mode: 'overwrite',
          autorename: false,
        }),
      },
      body: data,
    });

    const result = await response.json();
    return {
      path: result.path_display || result.path_lower,
      name: result.name,
      size: result.size,
      updatedAt: result.client_modified || result.server_modified,
    };
  },

  async delete(path: string) {
    await apiRequest('/files/delete_v2', {
      body: { path },
    });
  },

  async syncRecipeBundle(
    recipeId: string,
    recipeJson: string,
    photos: Array<{ fileName: string; localUri: string }>
  ): Promise<{ recipePath: string; photoPaths: string[] }> {
    const basePath = `/Cupboard Notes/${recipeId}`;

    try {
      await apiRequest('/files/create_folder_v2', {
        body: { path: basePath },
      });
    } catch {
      // Folder might already exist
    }

    const recipeData = new TextEncoder().encode(recipeJson);
    const recipePath = `${basePath}/recipe.json`;
    await dropboxAdapter.write(recipePath, recipeData);

    const photoPaths: string[] = [];
    for (const photo of photos) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.localUri);
        if (!fileInfo.exists) continue;

        const photoData = await FileSystem.readAsStringAsync(photo.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const photoBytes = Uint8Array.from(atob(photoData), (c) => c.charCodeAt(0));

        const photoPath = `${basePath}/${photo.fileName}`;
        await dropboxAdapter.write(photoPath, photoBytes);
        photoPaths.push(photoPath);
      } catch (error) {
        console.warn(`Failed to sync photo ${photo.fileName}:`, error);
      }
    }

    return { recipePath, photoPaths };
  },
};

async function generateCodeVerifier(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return base64URLEncode(randomBytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  return base64URLEncode(base64ToBytes(hash));
}

function base64URLEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
