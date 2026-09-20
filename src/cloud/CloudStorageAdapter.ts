/**
 * Common interface for pluggable consumer cloud providers.
 * Offline SQLite remains source of truth; cloud sync is optional/additive.
 * 100% client-side OAuth — no managed server.
 */

export type CloudProviderId =
  | 'googleDrive'
  | 'iCloud'
  | 'dropbox'
  | 'oneDrive'
  | 'box';

export interface CloudFileInfo {
  path: string;
  name: string;
  size?: number;
  updatedAt?: string;
  isFolder?: boolean;
}

export interface CloudAuthSession {
  providerId: CloudProviderId;
  /** Display label for the connected account */
  accountLabel?: string;
  /** ISO timestamp of last successful auth */
  connectedAt: string;
}

export interface CloudStorageAdapter {
  readonly id: CloudProviderId;
  readonly displayName: string;
  /** Human-readable OAuth scopes / platform notes for settings UI */
  readonly authNotes: string;
  /** false when unavailable on current platform (e.g. iCloud on Android) */
  readonly available: boolean;

  isConnected(): Promise<boolean>;
  getSession(): Promise<CloudAuthSession | null>;

  /**
   * Start OAuth / platform auth flow.
   * Milestone 1: stubs throw or no-op with documented plan.
   */
  connect(): Promise<CloudAuthSession>;

  disconnect(): Promise<void>;

  /** Ensure app folder exists (e.g. /Cupboard Notes) */
  ensureAppFolder(): Promise<string>;

  list(path: string): Promise<CloudFileInfo[]>;
  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array, mimeType?: string): Promise<CloudFileInfo>;
  delete(path: string): Promise<void>;

  /**
   * Sync a recipe JSON + photo binaries into the user's cloud folder.
   * Layout plan: /Cupboard Notes/{recipeId}/recipe.json + photos/*
   */
  syncRecipeBundle?(
    recipeId: string,
    recipeJson: string,
    photos: Array<{ fileName: string; localUri: string }>
  ): Promise<{ recipePath: string; photoPaths: string[] }>;
}
