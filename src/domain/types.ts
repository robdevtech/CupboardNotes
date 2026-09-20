/**
 * Domain types for Cupboard Notes.
 * Inspired by schema.org/Recipe concepts (NOT Mealie AGPL code).
 */

export type ScaleMode = 'linear' | 'fixed';

export type PhotoSource = 'import' | 'camera' | 'gallery';

export interface RecipePhoto {
  id: string;
  /** Local file URI for offline display/cache */
  localUri: string | null;
  /** Remote path in user's cloud folder once synced */
  cloudPath: string | null;
  /** Original remote URL when imported from JSON-LD / page */
  remoteUrl: string | null;
  source: PhotoSource;
  createdAt: string; // ISO
}

export interface Ingredient {
  id: string;
  /** Original free-text line as entered or imported */
  raw: string;
  quantity: number | null;
  unit: string | null;
  food: string;
  note: string | null;
  /**
   * linear = scale with servings ratio
   * fixed = keep qty unchanged (pinch, "to taste", garnish, etc.)
   */
  scaleMode: ScaleMode;
}

export interface RecipeStep {
  id: string;
  text: string;
  order: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  /** Free-form user kitchen notes (substitutions, timing, etc.) */
  notes: string | null;
  servings: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  photos: RecipePhoto[];
  sourceUrl: string | null;
  tags: string[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface RecipeDraft {
  title: string;
  description?: string | null;
  notes?: string | null;
  servings: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  photos?: RecipePhoto[];
  sourceUrl?: string | null;
  tags?: string[];
}

/** Portable JSON shape used for share / file export */
export interface RecipeExport {
  format: 'cupboard-notes/v1';
  exportedAt: string;
  recipe: Recipe;
}
