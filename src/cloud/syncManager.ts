/**
 * Multi-store sync manager with last-write-wins (LWW) merge strategy.
 * 
 * Strategy:
 * 1. Each recipe bundle has stable `id`, `updatedAt`, and optional content hash
 * 2. On sync, pull recipe manifests from all connected stores
 * 3. Merge per-recipe by newest `updatedAt` (last write wins)
 * 4. Push merged set to all connected stores
 * 5. Update local SQLite as source of truth
 * 
 * No backend required - fully offline-capable.
 */

import type { Recipe } from '../domain/types';
import type { CloudStorageAdapter, CloudProviderId } from './CloudStorageAdapter';
import { getAdapter } from './registry';
import * as repo from '../storage/recipeRepo';
import { newId } from '../domain/ids';

export interface RecipeManifestEntry {
  id: string;
  title: string;
  updatedAt: string;
  hash?: string; // Optional content hash for conflict detection
}

export interface StoreManifest {
  version: 'cupboard-notes/manifest/v1';
  generatedAt: string;
  recipes: RecipeManifestEntry[];
}

export interface SyncResult {
  pulledCount: number;
  pushedCount: number;
  conflictsResolved: number;
  errors: string[];
}

/**
 * Sync recipes across all connected storage providers.
 * Uses last-write-wins strategy based on updatedAt timestamp.
 */
export async function syncAllStores(): Promise<SyncResult> {
  const result: SyncResult = {
    pulledCount: 0,
    pushedCount: 0,
    conflictsResolved: 0,
    errors: [],
  };

  try {
    // Get all connected adapters
    const connectedAdapters = await getConnectedAdapters();
    
    if (connectedAdapters.length === 0) {
      result.errors.push('No storage providers connected');
      return result;
    }

    // Step 1: Pull manifests from all stores
    const manifests = await pullAllManifests(connectedAdapters);
    
    // Step 2: Get local recipes from SQLite
    const localRecipes = await repo.listRecipes();
    
    // Step 3: Merge using last-write-wins
    const { toUpdate, toPush } = await mergeRecipes(localRecipes, manifests, connectedAdapters);
    
    result.pulledCount = toUpdate.length;
    result.conflictsResolved = toUpdate.filter(r => 
      localRecipes.find(local => local.id === r.id && local.updatedAt !== r.updatedAt)
    ).length;
    
    // Step 4: Update local SQLite with newer remote recipes
    for (const recipe of toUpdate) {
      try {
        const existing = await repo.getRecipe(recipe.id);
        if (existing) {
          await repo.updateRecipe(recipe.id, recipe);
        } else {
          await repo.createRecipe(recipe);
        }
      } catch (e) {
        result.errors.push(`Failed to update local recipe ${recipe.id}: ${e}`);
      }
    }
    
    // Step 5: Push merged recipes to all stores
    for (const adapter of connectedAdapters) {
      try {
        const pushed = await pushRecipesToStore(adapter, toPush);
        result.pushedCount += pushed;
      } catch (e) {
        result.errors.push(`Failed to push to ${adapter.displayName}: ${e}`);
      }
    }
    
    return result;
  } catch (e) {
    result.errors.push(`Sync failed: ${e instanceof Error ? e.message : String(e)}`);
    return result;
  }
}

async function getConnectedAdapters(): Promise<CloudStorageAdapter[]> {
  const { listAdapters } = await import('./registry');
  const adapters = listAdapters();
  const connected: CloudStorageAdapter[] = [];
  
  for (const adapter of adapters) {
    if (adapter.available && await adapter.isConnected()) {
      connected.push(adapter);
    }
  }
  
  return connected;
}

async function pullAllManifests(
  adapters: CloudStorageAdapter[]
): Promise<Map<CloudProviderId, Map<string, RecipeManifestEntry>>> {
  const manifests = new Map<CloudProviderId, Map<string, RecipeManifestEntry>>();
  
  for (const adapter of adapters) {
    try {
      const manifest = await pullManifestFromStore(adapter);
      const recipeMap = new Map(manifest.recipes.map(r => [r.id, r]));
      manifests.set(adapter.id, recipeMap);
    } catch (e) {
      console.warn(`Failed to pull manifest from ${adapter.displayName}:`, e);
      manifests.set(adapter.id, new Map());
    }
  }
  
  return manifests;
}

async function pullManifestFromStore(adapter: CloudStorageAdapter): Promise<StoreManifest> {
  try {
    const basePath = await adapter.ensureAppFolder();
    const manifestPath = 'manifest.json';
    const data = await adapter.read(manifestPath);
    const text = new TextDecoder().decode(data);
    return JSON.parse(text) as StoreManifest;
  } catch (e) {
    // Manifest doesn't exist yet, return empty
    return {
      version: 'cupboard-notes/manifest/v1',
      generatedAt: new Date().toISOString(),
      recipes: [],
    };
  }
}

async function mergeRecipes(
  localRecipes: Recipe[],
  remoteManifests: Map<CloudProviderId, Map<string, RecipeManifestEntry>>,
  adapters: CloudStorageAdapter[]
): Promise<{ toUpdate: Recipe[]; toPush: Recipe[] }> {
  const toUpdate: Recipe[] = [];
  const toPush: Recipe[] = [];
  const processedIds = new Set<string>();
  
  // Build a map of newest recipe version across all stores
  const newestVersions = new Map<string, { recipe: Recipe | null; entry: RecipeManifestEntry; source: CloudProviderId | 'local' }>();
  
  // Add local recipes
  for (const recipe of localRecipes) {
    newestVersions.set(recipe.id, {
      recipe,
      entry: { id: recipe.id, title: recipe.title, updatedAt: recipe.updatedAt },
      source: 'local',
    });
  }
  
  // Check remote manifests for newer versions
  for (const [providerId, manifest] of remoteManifests) {
    for (const [recipeId, entry] of manifest) {
      const current = newestVersions.get(recipeId);
      
      if (!current || new Date(entry.updatedAt) > new Date(current.entry.updatedAt)) {
        // Remote version is newer, need to pull it
        newestVersions.set(recipeId, {
          recipe: null, // Will be loaded on demand
          entry,
          source: providerId,
        });
      }
    }
  }
  
  // Now determine what to update locally and what to push
  for (const [recipeId, version] of newestVersions) {
    processedIds.add(recipeId);
    
    if (version.source === 'local') {
      // Local is newest, needs to be pushed
      if (version.recipe) {
        toPush.push(version.recipe);
      }
    } else {
      // Remote is newer, need to pull
      try {
        const adapter = adapters.find(a => a.id === version.source);
        if (adapter) {
          const recipe = await pullRecipeFromStore(adapter, recipeId);
          if (recipe) {
            toUpdate.push(recipe);
            toPush.push(recipe); // Also push to other stores
          }
        }
      } catch (e) {
        console.warn(`Failed to pull recipe ${recipeId} from ${version.source}:`, e);
      }
    }
  }
  
  return { toUpdate, toPush };
}

async function pullRecipeFromStore(
  adapter: CloudStorageAdapter,
  recipeId: string
): Promise<Recipe | null> {
  try {
    const recipePath = `${recipeId}/recipe.json`;
    const data = await adapter.read(recipePath);
    const text = new TextDecoder().decode(data);
    return JSON.parse(text) as Recipe;
  } catch (e) {
    console.warn(`Failed to pull recipe ${recipeId} from ${adapter.displayName}:`, e);
    return null;
  }
}

async function pushRecipesToStore(
  adapter: CloudStorageAdapter,
  recipes: Recipe[]
): Promise<number> {
  let pushed = 0;
  
  for (const recipe of recipes) {
    try {
      const recipeJson = JSON.stringify(recipe, null, 2);
      const recipePath = `${recipe.id}/recipe.json`;
      
      // Write recipe JSON
      const encoder = new TextEncoder();
      await adapter.write(recipePath, encoder.encode(recipeJson));
      
      pushed++;
    } catch (e) {
      console.warn(`Failed to push recipe ${recipe.id} to ${adapter.displayName}:`, e);
    }
  }
  
  // Update manifest
  try {
    const manifest: StoreManifest = {
      version: 'cupboard-notes/manifest/v1',
      generatedAt: new Date().toISOString(),
      recipes: recipes.map(r => ({
        id: r.id,
        title: r.title,
        updatedAt: r.updatedAt,
      })),
    };
    
    const manifestJson = JSON.stringify(manifest, null, 2);
    const encoder = new TextEncoder();
    await adapter.write('manifest.json', encoder.encode(manifestJson));
  } catch (e) {
    console.warn(`Failed to update manifest in ${adapter.displayName}:`, e);
  }
  
  return pushed;
}
