import type { CloudProviderId, CloudStorageAdapter } from './CloudStorageAdapter';
import { dropboxAdapter } from './providers/dropbox';
import { localFilesystemAdapter } from './providers/localFilesystem';

/**
 * Available storage adapters.
 * Currently limited to Dropbox and Local Filesystem (working implementations).
 * Other providers (Google Drive, iCloud, OneDrive, Box) are stubs for future milestones.
 */
export const ALL_CLOUD_ADAPTERS: CloudStorageAdapter[] = [
  localFilesystemAdapter,
  dropboxAdapter,
];

const byId = Object.fromEntries(ALL_CLOUD_ADAPTERS.map((a) => [a.id, a])) as Record<
  CloudProviderId,
  CloudStorageAdapter
>;

export function getAdapter(id: CloudProviderId): CloudStorageAdapter {
  return byId[id];
}

export function listAdapters(): CloudStorageAdapter[] {
  return ALL_CLOUD_ADAPTERS;
}
