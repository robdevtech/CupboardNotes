/**
 * Box adapter with OAuth 2.0 flow and real API integration.
 *
 * OAuth: Box OAuth 2.0 (Authorization Code flow)
 * Note: Box does not support PKCE; client_secret required in app
 * Scopes: Configured in Box developer console app settings
 * API: https://api.box.com/2.0/ and https://upload.box.com/api/2.0/
 * Tokens: expo-secure-store (access + refresh tokens)
 */
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import type {
  CloudAuthSession,
  CloudFileInfo,
  CloudStorageAdapter,
} from '../CloudStorageAdapter';
import { saveSecret, readSecret, deleteSecret } from '../../storage/secureStoreStub';

WebBrowser.maybeCompleteAuthSession();

const BOX_CLIENT_ID =
  process.env.EXPO_PUBLIC_BOX_CLIENT_ID || Constants.expoConfig?.extra?.BOX_CLIENT_ID || '';
const BOX_CLIENT_SECRET =
  process.env.EXPO_PUBLIC_BOX_CLIENT_SECRET || Constants.expoConfig?.extra?.BOX_CLIENT_SECRET || '';
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'cupboardnotes',
  path: 'auth',
});

const AUTH_ENDPOINT = 'https://account.box.com/api/oauth2/authorize';
const TOKEN_ENDPOINT = 'https://api.box.com/oauth2/token';
const API_ENDPOINT = 'https://api.box.com/2.0';
const UPLOAD_ENDPOINT = 'https://upload.box.com/api/2.0';

interface BoxTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
  accountLabel?: string;
  connectedAt: string;
}

async function getStoredTokens(): Promise<BoxTokens | null> {
  const stored = await readSecret('box');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as BoxTokens;
  } catch {
    return null;
  }
}

async function saveTokens(tokens: BoxTokens): Promise<void> {
  await saveSecret('box', JSON.stringify(tokens));
}

async function clearTokens(): Promise<void> {
  await deleteSecret('box');
}

async function refreshAccessToken(refreshToken: string): Promise<BoxTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: BOX_CLIENT_ID,
    client_secret: BOX_CLIENT_SECRET,
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

  const tokens: BoxTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
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
    isUpload?: boolean;
  } = {}
): Promise<Response> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Not authenticated with Box');

  const base = options.isUpload ? UPLOAD_ENDPOINT : API_ENDPOINT;
  const url = `${base}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  if (options.body && typeof options.body !== 'string' && !(options.body instanceof Uint8Array)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body
      ? typeof options.body === 'string' || options.body instanceof Uint8Array
        ? (options.body as BodyInit)
        : JSON.stringify(options.body)
      : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Box API error ${response.status}: ${errorText}`);
  }

  return response;
}

export const boxAdapter: CloudStorageAdapter = {
  id: 'box',
  displayName: 'Box',
  authNotes:
    'Cloud sync to your personal Box. Stores recipes in /Cupboard Notes folder. One-tap OAuth connection.',
  available: true,

  async isConnected() {
    const tokens = await getStoredTokens();
    return tokens !== null;
  },

  async getSession() {
    const tokens = await getStoredTokens();
    if (!tokens) return null;

    return {
      providerId: 'box',
      accountLabel: tokens.accountLabel || 'Box Account',
      connectedAt: tokens.connectedAt,
    };
  },

  async connect(): Promise<CloudAuthSession> {
    if (!BOX_CLIENT_ID) {
      throw new Error(
        'Box client ID not configured. This is a developer setup issue.\n\nAdd EXPO_PUBLIC_BOX_CLIENT_ID to your .env file or BOX_CLIENT_ID to app.json extra.\n\nSee README "For Developers" section.'
      );
    }

    if (!BOX_CLIENT_SECRET) {
      throw new Error(
        'Box client secret not configured. This is a developer setup issue.\n\nAdd EXPO_PUBLIC_BOX_CLIENT_SECRET to your .env file or BOX_CLIENT_SECRET to app.json extra.\n\nSee README "For Developers" section.'
      );
    }

    const authParams: Record<string, string> = {
      client_id: BOX_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
    };
    const authUrl = `${AUTH_ENDPOINT}?${new URLSearchParams(authParams).toString()}`;

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
      client_id: BOX_CLIENT_ID,
      client_secret: BOX_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
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
        const response = await fetch(`${API_ENDPOINT}/users/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          return {
            accountId: data.id,
            accountLabel: data.name || 'Box Account',
          };
        }
      } catch {
        // Ignore account info fetch errors
      }
      return { accountId: undefined, accountLabel: 'Box Account' };
    })();

    const connectedAt = new Date().toISOString();

    const tokens: BoxTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      accountId: accountInfo.accountId,
      accountLabel: accountInfo.accountLabel,
      connectedAt,
    };

    await saveTokens(tokens);

    return {
      providerId: 'box',
      accountLabel: accountInfo.accountLabel,
      connectedAt,
    };
  },

  async disconnect() {
    const token = await getValidAccessToken();
    if (token) {
      try {
        await fetch(`${API_ENDPOINT}/oauth2/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: BOX_CLIENT_ID,
            client_secret: BOX_CLIENT_SECRET,
            token,
          }).toString(),
        });
      } catch {
        // Ignore revoke errors
      }
    }
    await clearTokens();
  },

  async ensureAppFolder() {
    // Get root folder (ID '0') and create /Cupboard Notes
    try {
      const response = await apiRequest('/folders/0/items', {
        method: 'GET',
      });

      const data = await response.json();
      const entries = data.entries || [];
      
      const existingFolder = entries.find(
        (item: any) => item.type === 'folder' && item.name === 'Cupboard Notes'
      );

      if (existingFolder) {
        return existingFolder.id;
      }

      // Create the folder
      const createResponse = await apiRequest('/folders', {
        method: 'POST',
        body: {
          name: 'Cupboard Notes',
          parent: { id: '0' },
        },
      });

      const newFolder = await createResponse.json();
      return newFolder.id;
    } catch (error) {
      throw new Error(`Failed to ensure app folder: ${error}`);
    }
  },

  async list(path: string): Promise<CloudFileInfo[]> {
    const response = await apiRequest(`/folders/${path}/items`, {
      method: 'GET',
    });

    const data = await response.json();
    return (data.entries || []).map((entry: any) => ({
      path: entry.id,
      name: entry.name,
      size: entry.size,
      updatedAt: entry.modified_at,
      isFolder: entry.type === 'folder',
    }));
  },

  async read(path: string): Promise<Uint8Array> {
    const response = await apiRequest(`/files/${path}/content`, {
      method: 'GET',
    });

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  },

  async write(path: string, data: Uint8Array, mimeType?: string): Promise<CloudFileInfo> {
    // Parse path: folderPath is the Box folder ID, fileName is the file name
    const pathParts = path.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const folderId = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '0';

    // Check if file exists
    try {
      const listResponse = await apiRequest(`/folders/${folderId}/items`, {
        method: 'GET',
      });
      const listData = await listResponse.json();
      const existingFile = (listData.entries || []).find(
        (item: any) => item.type === 'file' && item.name === fileName
      );

      if (existingFile) {
        // Update existing file
        const formData = new FormData();
        const blob = new Blob([data as any], { type: mimeType || 'application/octet-stream' });
        formData.append('file', blob, fileName);

        const token = await getValidAccessToken();
        if (!token) throw new Error('Not authenticated with Box');

        const uploadResponse = await fetch(
          `${UPLOAD_ENDPOINT}/files/${existingFile.id}/content`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Box upload error ${uploadResponse.status}: ${errorText}`);
        }

        const result = await uploadResponse.json();
        const entry = result.entries[0];
        return {
          path: entry.id,
          name: entry.name,
          size: entry.size,
          updatedAt: entry.modified_at,
        };
      }
    } catch (error) {
      // File doesn't exist, create new
    }

    // Create new file
    const formData = new FormData();
    const blob = new Blob([data as any], { type: mimeType || 'application/octet-stream' });
    formData.append('file', blob, fileName);
    formData.append(
      'attributes',
      JSON.stringify({
        name: fileName,
        parent: { id: folderId },
      })
    );

    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated with Box');

    const uploadResponse = await fetch(`${UPLOAD_ENDPOINT}/files/content`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Box upload error ${uploadResponse.status}: ${errorText}`);
    }

    const result = await uploadResponse.json();
    const entry = result.entries[0];
    return {
      path: entry.id,
      name: entry.name,
      size: entry.size,
      updatedAt: entry.modified_at,
    };
  },

  async delete(path: string) {
    await apiRequest(`/files/${path}`, {
      method: 'DELETE',
    });
  },

  async syncRecipeBundle(
    recipeId: string,
    recipeJson: string,
    photos: Array<{ fileName: string; localUri: string }>
  ): Promise<{ recipePath: string; photoPaths: string[] }> {
    const appFolderId = await boxAdapter.ensureAppFolder();

    // Create recipe subfolder
    let recipeFolderId: string;
    try {
      const createResponse = await apiRequest('/folders', {
        method: 'POST',
        body: {
          name: recipeId,
          parent: { id: appFolderId },
        },
      });
      const newFolder = await createResponse.json();
      recipeFolderId = newFolder.id;
    } catch (error) {
      // Folder might exist, try to find it
      const listResponse = await apiRequest(`/folders/${appFolderId}/items`, {
        method: 'GET',
      });
      const listData = await listResponse.json();
      const existingFolder = (listData.entries || []).find(
        (item: any) => item.type === 'folder' && item.name === recipeId
      );
      if (!existingFolder) throw error;
      recipeFolderId = existingFolder.id;
    }

    // Upload recipe.json
    const recipeData = new TextEncoder().encode(recipeJson);
    const recipePath = `${recipeFolderId}/recipe.json`;
    await boxAdapter.write(recipePath, recipeData, 'application/json');

    // Upload photos
    const photoPaths: string[] = [];
    for (const photo of photos) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.localUri);
        if (!fileInfo.exists) continue;

        const photoData = await FileSystem.readAsStringAsync(photo.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const photoBytes = Uint8Array.from(atob(photoData), (c) => c.charCodeAt(0));

        const photoPath = `${recipeFolderId}/${photo.fileName}`;
        await boxAdapter.write(photoPath, photoBytes, 'image/jpeg');
        photoPaths.push(photoPath);
      } catch (error) {
        console.warn(`Failed to sync photo ${photo.fileName}:`, error);
      }
    }

    return { recipePath, photoPaths };
  },
};
