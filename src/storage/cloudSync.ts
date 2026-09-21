/**
 * Cloud sync utilities for manual multi-provider sync.
 * Syncs all local recipes to all connected cloud providers.
 */
import type { Recipe } from '../domain/types';
import { listAdapters } from '../cloud/registry';

export interface SyncResult {
  providerId: string;
  providerName: string;
  status: 'success' | 'not_connected' | 'no_sync_support' | 'error';
  recipesUploaded?: number;
  recipesFailed?: number;
  error?: string;
}

export async function syncAllRecipesToCloud(recipes: Recipe[]): Promise<SyncResult[]> {
  const adapters = listAdapters();
  const results: SyncResult[] = [];

  for (const adapter of adapters) {
    const result: SyncResult = {
      providerId: adapter.id,
      providerName: adapter.displayName,
      status: 'not_connected',
    };

    try {
      // Check if adapter supports sync
      if (!adapter.syncRecipeBundle) {
        result.status = 'no_sync_support';
        results.push(result);
        continue;
      }

      // Check if connected
      const isConnected = await adapter.isConnected();
      if (!isConnected) {
        result.status = 'not_connected';
        results.push(result);
        continue;
      }

      // Sync all recipes
      let uploaded = 0;
      let failed = 0;

      for (const recipe of recipes) {
        try {
          const recipeJson = JSON.stringify(recipe, null, 2);
          const photos = (recipe.photos || [])
            .filter(p => p.localUri)
            .map((p) => ({
              fileName: p.localUri!.split('/').pop() || `photo-${Date.now()}.jpg`,
              localUri: p.localUri!,
            }));

          await adapter.syncRecipeBundle(recipe.id, recipeJson, photos);
          uploaded++;
        } catch (error) {
          console.error(`Failed to sync recipe ${recipe.id} to ${adapter.id}:`, error);
          failed++;
        }
      }

      result.status = 'success';
      result.recipesUploaded = uploaded;
      result.recipesFailed = failed;
    } catch (error) {
      result.status = 'error';
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    results.push(result);
  }

  return results;
}
