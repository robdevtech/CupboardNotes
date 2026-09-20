import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { RecipePhoto, PhotoSource } from '../domain/types';
import { newId } from '../domain/ids';

function photoDir(): string {
  const base = FileSystem.documentDirectory;
  if (!base) throw new Error('No document directory available for photo cache');
  return `${base}recipe-photos/`;
}

async function ensurePhotoDir(): Promise<string> {
  const dir = photoDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/** Copy a picked/captured image into the app's offline photo cache. */
export async function cachePhotoLocally(
  sourceUri: string,
  source: PhotoSource,
  remoteUrl: string | null = null
): Promise<RecipePhoto> {
  const dir = await ensurePhotoDir();
  const id = newId();
  const ext = guessExt(sourceUri);
  const dest = `${dir}${id}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return {
    id,
    localUri: dest,
    cloudPath: null,
    remoteUrl,
    source,
    createdAt: new Date().toISOString(),
  };
}

function guessExt(uri: string): string {
  const m = uri.toLowerCase().match(/\.(jpe?g|png|webp|heic|gif)(\?|$)/);
  if (m) return m[1] === 'jpeg' ? 'jpg' : m[1];
  return 'jpg';
}

export async function pickFromGallery(): Promise<RecipePhoto | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Photo library permission is required');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  return cachePhotoLocally(result.assets[0].uri, 'gallery');
}

export async function captureFromCamera(): Promise<RecipePhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Camera permission is required');
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]) return null;
  return cachePhotoLocally(result.assets[0].uri, 'camera');
}

/**
 * Create photo refs from imported remote image URLs.
 * Downloads into local cache when possible for offline use.
 */
export async function photosFromImportUrls(urls: string[]): Promise<RecipePhoto[]> {
  const out: RecipePhoto[] = [];
  for (const url of urls.slice(0, 8)) {
    try {
      const dir = await ensurePhotoDir();
      const id = newId();
      const ext = guessExt(url);
      const dest = `${dir}${id}.${ext}`;
      const download = await FileSystem.downloadAsync(url, dest);
      out.push({
        id,
        localUri: download.uri,
        cloudPath: null,
        remoteUrl: url,
        source: 'import',
        createdAt: new Date().toISOString(),
      });
    } catch {
      out.push({
        id: newId(),
        localUri: null,
        cloudPath: null,
        remoteUrl: url,
        source: 'import',
        createdAt: new Date().toISOString(),
      });
    }
  }
  return out;
}

export function photoDisplayUri(photo: RecipePhoto): string | null {
  return photo.localUri ?? photo.remoteUrl;
}
