import type { Ingredient, Recipe, RecipeDraft, RecipePhoto, RecipeStep } from '../domain/types';
import { newId } from '../domain/ids';
import { getDb } from './db';
import { autoSyncRecipe } from './cloudSync';

interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  servings: number;
  ingredients_json: string;
  steps_json: string;
  photos_json: string;
  source_url: string | null;
  tags_json: string;
  created_at: string;
  updated_at: string;
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    notes: row.notes ?? null,
    servings: row.servings,
    ingredients: JSON.parse(row.ingredients_json) as Ingredient[],
    steps: JSON.parse(row.steps_json) as RecipeStep[],
    photos: JSON.parse(row.photos_json || '[]') as RecipePhoto[],
    sourceUrl: row.source_url,
    tags: JSON.parse(row.tags_json || '[]') as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRecipes(): Promise<Recipe[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RecipeRow>(
    'SELECT * FROM recipes ORDER BY updated_at DESC'
  );
  return rows.map(rowToRecipe);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RecipeRow>('SELECT * FROM recipes WHERE id = ?', [id]);
  return row ? rowToRecipe(row) : null;
}

export async function createRecipe(draft: RecipeDraft): Promise<Recipe> {
  const db = await getDb();
  const now = new Date().toISOString();
  const recipe: Recipe = {
    id: newId(),
    title: draft.title.trim() || 'Untitled recipe',
    description: draft.description ?? null,
    notes: draft.notes ?? null,
    servings: draft.servings > 0 ? draft.servings : 1,
    ingredients: draft.ingredients,
    steps: draft.steps.map((s, i) => ({ ...s, order: i })),
    photos: draft.photos ?? [],
    sourceUrl: draft.sourceUrl ?? null,
    tags: draft.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO recipes
      (id, title, description, notes, servings, ingredients_json, steps_json, photos_json, source_url, tags_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recipe.id,
      recipe.title,
      recipe.description,
      recipe.notes,
      recipe.servings,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.steps),
      JSON.stringify(recipe.photos),
      recipe.sourceUrl,
      JSON.stringify(recipe.tags),
      recipe.createdAt,
      recipe.updatedAt,
    ]
  );
  
  // Auto-sync to connected cloud providers (best-effort, non-blocking)
  autoSyncRecipe(recipe).catch(() => {});
  
  return recipe;
}

export async function updateRecipe(id: string, draft: RecipeDraft): Promise<Recipe | null> {
  const existing = await getRecipe(id);
  if (!existing) return null;
  const db = await getDb();
  const now = new Date().toISOString();
  const recipe: Recipe = {
    ...existing,
    title: draft.title.trim() || existing.title,
    description: draft.description ?? null,
    notes: draft.notes ?? null,
    servings: draft.servings > 0 ? draft.servings : existing.servings,
    ingredients: draft.ingredients,
    steps: draft.steps.map((s, i) => ({ ...s, order: i })),
    photos: draft.photos ?? existing.photos,
    sourceUrl: draft.sourceUrl ?? null,
    tags: draft.tags ?? existing.tags,
    updatedAt: now,
  };
  await db.runAsync(
    `UPDATE recipes SET
      title = ?, description = ?, notes = ?, servings = ?, ingredients_json = ?, steps_json = ?,
      photos_json = ?, source_url = ?, tags_json = ?, updated_at = ?
     WHERE id = ?`,
    [
      recipe.title,
      recipe.description,
      recipe.notes,
      recipe.servings,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.steps),
      JSON.stringify(recipe.photos),
      recipe.sourceUrl,
      JSON.stringify(recipe.tags),
      recipe.updatedAt,
      id,
    ]
  );
  
  // Auto-sync to connected cloud providers (best-effort, non-blocking)
  autoSyncRecipe(recipe).catch(() => {});
  
  return recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
}
