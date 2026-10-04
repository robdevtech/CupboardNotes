/**
 * Local filesystem adapter.
 *
 * Storage plan:
 * - Uses app Documents directory for recipe storage (Expo Go compatible)
 * - Stores recipes as JSON bundles in /CupboardNotes/{recipeId}/recipe.json + photos/*
 * - Participates in multi-store sync with last-write-wins merge strategy
 * - Connection state persisted in expo-secure-store
 * 
 * Note: Full SAF (Storage Access Framework) folder picker requires custom dev client.
 * This implementation uses app-owned storage that works in Expo Go and production builds.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import type {
  CloudAuthSession,
  CloudFileInfo,
  CloudStorageAdapter,
} from '../CloudStorageAdapter';

const STORAGE_KEY = 'local_filesystem_connected';
const PATH_KEY = 'local_filesystem_path';

/**
 * Get the stored path (always returns app documents path for now).
 * In a custom dev client, this could store user-selected SAF URIs.
 */
async function getStoredPath(): Promise<string | null> {
  try {
    const path = await SecureStore.getItemAsync(PATH_KEY);
    return path;
  } catch (e) {
    return null;
  }
}

async function setStoredPath(path: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PATH_KEY, path);
  } catch (e) {
    console.warn('Failed to store path:', e);
  }
}

async function isStorageConnected(): Promise<boolean> {
  try {
    const connected = await SecureStore.getItemAsync(STORAGE_KEY);
    return connected === 'true';
  } catch (e) {
    return false;
  }
}

async function setStorageConnected(connected: boolean): Promise<void> {
  try {
    if (connected) {
      await SecureStore.setItemAsync(STORAGE_KEY, 'true');
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to store connection state:', e);
  }
}

function getAppDocumentsPath(): string {
  return `${FileSystem.documentDirectory}CupboardNotes/`;
}

/**
 * Get a display-friendly version of the storage path for showing in UI.
 */
function getDisplayPath(): string {
  const path = getAppDocumentsPath();
  // Simplify for display
  if (path.includes('ExponentExperienceData')) {
    return '...ExponentExperienceData/.../CupboardNotes/';
  }
  return path.replace(FileSystem.documentDirectory || '', 'Documents/') + 'CupboardNotes/';
}

export const localFilesystemAdapter: CloudStorageAdapter = {
  id: 'local' as any, // Extended type
  displayName: 'Local Folder',
  authNotes:
    `Uses app Documents directory at: ${getDisplayPath()}\n\n` +
    'Recipes stored locally on this device. Participates in multi-store sync. ' +
    'Full custom folder picker requires custom dev client (not available in Expo Go).',
  available: true,

  async isConnected() {
    return await isStorageConnected();
  },

  async getSession() {
    const connected = await isStorageConnected();
    if (!connected) return null;
    
    const path = await getStoredPath() || getAppDocumentsPath();
    
    return {
      providerId: 'local' as any,
      accountLabel: `Local: ${getDisplayPath()}`,
      connectedAt: new Date().toISOString(),
    };
  },

  async connect(): Promise<CloudAuthSession> {
    // Create the app's CupboardNotes directory
    const path = getAppDocumentsPath();
    
    try {
      // Ensure directory exists
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
      
      // Persist connection state and path
      await setStorageConnected(true);
      await setStoredPath(path);
      
      return {
        providerId: 'local' as any,
        accountLabel: `Local: ${getDisplayPath()}`,
        connectedAt: new Date().toISOString(),
      };
    } catch (e) {
      throw new Error(`Failed to set up local storage: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  },

  async disconnect() {
    // Clear connection state (but don't delete files)
    await setStorageConnected(false);
    await SecureStore.deleteItemAsync(PATH_KEY).catch(() => {});
  },

  async ensureAppFolder() {
    const basePath = getAppDocumentsPath();
    await FileSystem.makeDirectoryAsync(basePath, { intermediates: true });
    return basePath;
  },

  async list(path: string): Promise<CloudFileInfo[]> {
    try {
      const fullPath = path.startsWith('file://') ? path : getAppDocumentsPath() + path;
      const items = await FileSystem.readDirectoryAsync(fullPath);
      
      return Promise.all(
        items.map(async (name) => {
          const itemPath = `${fullPath}${fullPath.endsWith('/') ? '' : '/'}${name}`;
          const info = await FileSystem.getInfoAsync(itemPath);
          
          return {
            path: itemPath,
            name,
            size: 'size' in info ? info.size : undefined,
            updatedAt: 'modificationTime' in info 
              ? new Date(info.modificationTime * 1000).toISOString() 
              : undefined,
            isFolder: info.isDirectory,
          };
        })
      );
    } catch (e) {
      return [];
    }
  },

  async read(path: string): Promise<Uint8Array> {
    const fullPath = path.startsWith('file://') ? path : getAppDocumentsPath() + path;
    const content = await FileSystem.readAsStringAsync(fullPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Convert base64 to Uint8Array
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  async write(path: string, data: Uint8Array): Promise<CloudFileInfo> {
    const fullPath = path.startsWith('file://') ? path : getAppDocumentsPath() + path;
    
    // Ensure parent directory exists
    const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(parentPath, { intermediates: true });
    
    // Convert Uint8Array to base64
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64 = btoa(binary);
    
    await FileSystem.writeAsStringAsync(fullPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const info = await FileSystem.getInfoAsync(fullPath);
    
    return {
      path: fullPath,
      name: path.split('/').pop() ?? path,
      size: 'size' in info ? info.size : undefined,
      updatedAt: 'modificationTime' in info 
        ? new Date(info.modificationTime * 1000).toISOString() 
        : undefined,
    };
  },

  async delete(path: string) {
    const fullPath = path.startsWith('file://') ? path : getAppDocumentsPath() + path;
    try {
      await FileSystem.deleteAsync(fullPath, { idempotent: true });
    } catch (e) {
      // Ignore errors
    }
  },

  async syncRecipeBundle(
    recipeId: string,
    recipeJson: string,
    photos: Array<{ fileName: string; localUri: string }>
  ) {
    const basePath = getAppDocumentsPath();
    const recipeFolderPath = `${basePath}${recipeId}/`;
    
    // Ensure recipe folder exists
    await FileSystem.makeDirectoryAsync(recipeFolderPath, { intermediates: true });
    
    // Write recipe.json
    const recipePath = `${recipeFolderPath}recipe.json`;
    await FileSystem.writeAsStringAsync(recipePath, recipeJson, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    // Write photos
    const photoPaths: string[] = [];
    for (const photo of photos) {
      const photoPath = `${recipeFolderPath}${photo.fileName}`;
      try {
        await FileSystem.copyAsync({
          from: photo.localUri,
          to: photoPath,
        });
        photoPaths.push(photoPath);
      } catch (e) {
        console.warn(`Failed to copy photo ${photo.fileName}:`, e);
      }
    }
    
    return { recipePath, photoPaths };
  },
};
