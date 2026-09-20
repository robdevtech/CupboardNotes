import type { Ingredient, Recipe } from '../domain/types';
import { formatIngredient } from '../parse/ingredientParse';

/**
 * Scale ingredients for a target serving count.
 * - linear: quantity × (target / base)
 * - fixed / unparsed (null qty): unchanged
 * Non-linear flags are represented by scaleMode === 'fixed'.
 */
export function scaleRatio(baseServings: number, targetServings: number): number {
  if (!baseServings || baseServings <= 0) return 1;
  if (!targetServings || targetServings <= 0) return 1;
  return targetServings / baseServings;
}

export function scaleIngredient(ing: Ingredient, ratio: number): Ingredient {
  if (ing.scaleMode === 'fixed' || ing.quantity == null || ratio === 1) {
    return { ...ing };
  }
  const quantity = ing.quantity * ratio;
  const scaled: Ingredient = {
    ...ing,
    quantity,
  };
  // Keep raw in sync for display convenience
  scaled.raw = formatIngredient(scaled);
  return scaled;
}

export function scaleIngredients(ingredients: Ingredient[], ratio: number): Ingredient[] {
  return ingredients.map((ing) => scaleIngredient(ing, ratio));
}

export function scaleRecipe(recipe: Recipe, targetServings: number): Recipe {
  const ratio = scaleRatio(recipe.servings, targetServings);
  return {
    ...recipe,
    servings: targetServings,
    ingredients: scaleIngredients(recipe.ingredients, ratio),
  };
}
