/**
 * Local filesystem adapter.
 *
 * Storage plan:
 * - Android: SAF (Storage Access Framework) for user-selected folder
 * - iOS: Document picker or app Documents directory
 * - Stores recipes as JSON bundles in /Cupboard Notes/{recipeId}/recipe.json + photos/*
 * - Participates in multi-store sync with last-write-wins merge strategy
 * - Tokens/folder paths stored in expo-secure-store
 */

import * as FileSystem from 'expo-file-system/legacy';
import type {
  CloudAuthSession,
  CloudFileInfo,
  CloudStorageAdapter,
} from '../CloudStorageAdapter';

const STORAGE_KEY = 'local_filesystem_path';

async function getStoredPath(): Promise<string | null> {
  // For now, use app's document directory as default
  // In production, this would use SecureStore to persist user-selected path
  return null;
}

async function setStoredPath(path: string): Promise<void> {
  // Store selected path in SecureStore
  // For now, we'll use app's document directory
}

function getAppDocumentsPath(): string {
  // Use app's document directory
  return `${FileSystem.documentDirectory}CupboardNotes/`;
}

export const localFilesystemAdapter: CloudStorageAdapter = {
  id: 'local' as any, // Extended type
  displayName: 'Local Folder',
  authNotes:
    'Store recipes in a local folder on your device. Syncs across connected storage providers.',
  available: true,

  async isConnected() {
    const path = await getStoredPath();
    return path !== null || true; // Always available with app Documents fallback
  },

  async getSession() {
    const isConnected = await this.isConnected();
    if (!isConnected) return null;
    
    return {
      providerId: 'local' as any,
      accountLabel: 'Local Storage',
      connectedAt: new Date().toISOString(),
    };
  },

  async connect(): Promise<CloudAuthSession> {
    // On Android/iOS, could use DocumentPicker to select a folder
    // For now, we'll use the app's document directory
    const path = getAppDocumentsPath();
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
    await setStoredPath(path);
    
    return {
      providerId: 'local' as any,
      accountLabel: 'Local Storage',
      connectedAt: new Date().toISOString(),
    };
  },

  async disconnect() {
    // Clear stored path (but don't delete files)
    await setStoredPath('');
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
