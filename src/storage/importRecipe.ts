import type { Recipe, RecipeExport } from '../domain/types';

/**
 * Import a recipe from a Cupboard Notes JSON export payload.
 * Returns the recipe if valid, or throws an error.
 */
export function importRecipeFromJson(jsonString: string): Recipe {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate format
    if (parsed.format !== 'cupboard-notes/v1') {
      throw new Error('Invalid format. Expected cupboard-notes/v1 export.');
    }

    const exportData = parsed as RecipeExport;
    
    // Basic validation
    if (!exportData.recipe || typeof exportData.recipe !== 'object') {
      throw new Error('Invalid recipe data');
    }

    const recipe = exportData.recipe;

    // Validate required fields
    if (!recipe.id || !recipe.title) {
      throw new Error('Recipe missing required fields (id, title)');
    }

    return recipe;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw e;
  }
}
