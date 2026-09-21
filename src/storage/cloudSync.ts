/**
 * Cloud sync utilities for automatic recipe upload on save.
 * Best-effort sync - doesn't block save if sync fails.
 */
import type { Recipe } from '../domain/types';
import { getAdapter } from '../cloud/registry';
import { useSettingsStore } from '../store/settingsStore';

export async function autoSyncRecipe(recipe: Recipe): Promise<void> {
  try {
    const { enabledProviders } = useSettingsStore.getState();

    for (const providerId of enabledProviders) {
      try {
        const adapter = getAdapter(providerId);
        
        // Skip if not connected or doesn't support sync
        if (!adapter.syncRecipeBundle) continue;
        
        const isConnected = await adapter.isConnected();
        if (!isConnected) continue;

        // Prepare recipe JSON and photos
        const recipeJson = JSON.stringify(recipe, null, 2);
        const photos = (recipe.photos || [])
          .filter(p => p.localUri) // Only include photos with valid localUri
          .map((p) => ({
            fileName: p.localUri!.split('/').pop() || `photo-${Date.now()}.jpg`,
            localUri: p.localUri!,
          }));

        // Best-effort sync - don't await or throw
        adapter.syncRecipeBundle(recipe.id, recipeJson, photos).catch((error) => {
          console.warn(`Auto-sync to ${providerId} failed:`, error);
        });
      } catch (error) {
        // Silent failure for individual providers
        console.warn(`Auto-sync to ${providerId} skipped:`, error);
      }
    }
  } catch (error) {
    // Silent failure for entire auto-sync
    console.warn('Auto-sync failed:', error);
  }
}
