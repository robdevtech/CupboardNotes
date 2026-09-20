import type { CloudProviderId, CloudStorageAdapter } from './CloudStorageAdapter';
import { googleDriveAdapter } from './providers/googleDrive';
import { iCloudAdapter } from './providers/iCloud';
import { dropboxAdapter } from './providers/dropbox';
import { oneDriveAdapter } from './providers/oneDrive';
import { boxAdapter } from './providers/box';

/** Ordered top-5 consumer cloud providers (2025–2026). */
export const ALL_CLOUD_ADAPTERS: CloudStorageAdapter[] = [
  googleDriveAdapter,
  iCloudAdapter,
  dropboxAdapter,
  oneDriveAdapter,
  boxAdapter,
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
