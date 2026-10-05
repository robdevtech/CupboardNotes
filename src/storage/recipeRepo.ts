import type {
  Ingredient,
  Recipe,
  RecipeDraft,
  RecipeLink,
  RecipeLinkDraft,
  RecipeLinkGraph,
  RecipeLinkRef,
  RecipePhoto,
  RecipeStep,
} from '../domain/types';
import { newId } from '../domain/ids';
import { getDb } from './db';

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
  return recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM recipe_links WHERE from_recipe_id = ? OR to_recipe_id = ?',
      [id, id]
    );
    await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
  });
}

interface RecipeLinkRow {
  id: string;
  from_recipe_id: string;
  to_recipe_id: string;
  label: string | null;
  page: string | null;
  created_at: string;
}

interface RecipeLinkJoinRow extends RecipeLinkRow {
  title: string;
}

function rowToLink(row: RecipeLinkRow): RecipeLink {
  return {
    id: row.id,
    fromRecipeId: row.from_recipe_id,
    toRecipeId: row.to_recipe_id,
    label: row.label,
    page: row.page,
    createdAt: row.created_at,
  };
}

function joinRowToRef(row: RecipeLinkJoinRow, direction: 'uses' | 'usedIn'): RecipeLinkRef {
  return {
    linkId: row.id,
    recipeId: direction === 'uses' ? row.to_recipe_id : row.from_recipe_id,
    title: row.title,
    label: row.label,
    page: row.page,
  };
}

export async function createRecipeLink(draft: RecipeLinkDraft): Promise<RecipeLink> {
  if (draft.fromRecipeId === draft.toRecipeId) {
    throw new Error('A recipe cannot link to itself');
  }
  const from = await getRecipe(draft.fromRecipeId);
  const to = await getRecipe(draft.toRecipeId);
  if (!from || !to) {
    throw new Error('Recipe not found');
  }

  const db = await getDb();
  const existing = await db.getFirstAsync<RecipeLinkRow>(
    'SELECT * FROM recipe_links WHERE from_recipe_id = ? AND to_recipe_id = ?',
    [draft.fromRecipeId, draft.toRecipeId]
  );
  if (existing) return rowToLink(existing);

  const link: RecipeLink = {
    id: newId(),
    fromRecipeId: draft.fromRecipeId,
    toRecipeId: draft.toRecipeId,
    label: draft.label?.trim() || null,
    page: draft.page?.trim() || null,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    `INSERT INTO recipe_links (id, from_recipe_id, to_recipe_id, label, page, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [link.id, link.fromRecipeId, link.toRecipeId, link.label, link.page, link.createdAt]
  );
  return link;
}

export async function deleteRecipeLink(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM recipe_links WHERE id = ?', [id]);
}

export async function listRecipeLinksFrom(fromRecipeId: string): Promise<RecipeLink[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RecipeLinkRow>(
    'SELECT * FROM recipe_links WHERE from_recipe_id = ? ORDER BY created_at ASC',
    [fromRecipeId]
  );
  return rows.map(rowToLink);
}

export async function listRecipeLinksTo(toRecipeId: string): Promise<RecipeLink[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RecipeLinkRow>(
    'SELECT * FROM recipe_links WHERE to_recipe_id = ? ORDER BY created_at ASC',
    [toRecipeId]
  );
  return rows.map(rowToLink);
}

export async function getLinkedRecipes(recipeId: string): Promise<RecipeLinkGraph> {
  const db = await getDb();
  const usesRows = await db.getAllAsync<RecipeLinkJoinRow>(
    `SELECT l.id, l.from_recipe_id, l.to_recipe_id, l.label, l.page, l.created_at, r.title
     FROM recipe_links l
     JOIN recipes r ON r.id = l.to_recipe_id
     WHERE l.from_recipe_id = ?
     ORDER BY r.title COLLATE NOCASE`,
    [recipeId]
  );
  const usedInRows = await db.getAllAsync<RecipeLinkJoinRow>(
    `SELECT l.id, l.from_recipe_id, l.to_recipe_id, l.label, l.page, l.created_at, r.title
     FROM recipe_links l
     JOIN recipes r ON r.id = l.from_recipe_id
     WHERE l.to_recipe_id = ?
     ORDER BY r.title COLLATE NOCASE`,
    [recipeId]
  );
  return {
    uses: usesRows.map((row) => joinRowToRef(row, 'uses')),
    usedIn: usedInRows.map((row) => joinRowToRef(row, 'usedIn')),
  };
}
