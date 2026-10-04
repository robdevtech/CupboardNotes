/**
 * Parse AI-generated recipe responses with lenient handling.
 * Extracts JSON even when wrapped in markdown code fences or surrounded by chatter.
 * Reuses existing JSON-LD parser for consistency.
 */

import { extractRecipeFromJsonLd, type JsonLdRecipe } from './jsonLd';

export type { JsonLdRecipe };

/**
 * Parse AI response containing one or more Schema.org Recipes.
 * Returns an array of recipes (even for single recipe for consistency).
 */
export function parseAiRecipeResponse(response: string): JsonLdRecipe[] {
  // Try to extract all JSON blocks (multiple fenced blocks or single block)
  const fenceMatches = [...response.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)];
  
  const recipes: JsonLdRecipe[] = [];
  
  if (fenceMatches.length > 0) {
    // Multiple fenced blocks - parse each separately
    for (const match of fenceMatches) {
      const jsonText = match[1].trim();
      const extracted = extractJsonFromText(jsonText);
      if (extracted) {
        recipes.push(...parseJsonToRecipes(extracted));
      }
    }
  } else {
    // No fences - try to extract JSON from response
    const jsonText = extractJsonFromText(response);
    if (!jsonText) {
      throw new Error(
        'Could not find valid JSON in response. Make sure the AI replied with a Schema.org Recipe JSON object.'
      );
    }
    recipes.push(...parseJsonToRecipes(jsonText));
  }

  if (recipes.length === 0) {
    throw new Error(
      'No recipes found. Make sure the AI response includes Recipe objects with name, recipeIngredient, and recipeInstructions fields.'
    );
  }

  return recipes;
}

/**
 * Extract JSON from text, handling smart quotes and trailing commas.
 */
function extractJsonFromText(text: string): string | null {
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  
  // Also check for array
  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  
  let jsonText: string | null = null;
  
  if (arrStart !== -1 && arrEnd !== -1 && arrStart < arrEnd && 
      (startIdx === -1 || arrStart < startIdx)) {
    // It's an array
    jsonText = text.substring(arrStart, arrEnd + 1);
  } else if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
    // It's an object
    jsonText = text.substring(startIdx, endIdx + 1);
  }
  
  if (!jsonText) return null;

  // Normalize smart quotes
  jsonText = jsonText
    .replace(/[\u201C\u201D\u201E\u201F]/g, '\\"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u2039\u203A]/g, "'");

  // Handle trailing commas
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');

  return jsonText;
}

/**
 * Parse JSON text into one or more recipes.
 * Handles arrays, @graph, and single objects.
 */
function parseJsonToRecipes(jsonText: string): JsonLdRecipe[] {
  try {
    const data = JSON.parse(jsonText);
    const recipes: JsonLdRecipe[] = [];
    
    // Try walkGraph which handles single, arrays, and @graph
    const result = walkGraphForMultiple(data);
    if (result.length > 0) {
      return result;
    }

    throw new Error(
      'JSON found but no Schema.org Recipe detected. Make sure the response includes Recipe objects.'
    );
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(
        'Invalid JSON format. The AI response may have syntax errors. Please try again.'
      );
    }
    throw e;
  }
}

/**
 * Walk through JSON structure and collect all Recipe objects.
 */
function walkGraphForMultiple(data: unknown): JsonLdRecipe[] {
  const recipes: JsonLdRecipe[] = [];
  
  if (!data || typeof data !== 'object') return recipes;

  if (Array.isArray(data)) {
    // Array of recipes or mixed content
    for (const item of data) {
      recipes.push(...walkGraphForMultiple(item));
    }
    return recipes;
  }

  const obj = data as Record<string, unknown>;
  
  // Try to parse as a recipe
  const recipe = extractRecipeFromJsonLd(JSON.stringify(obj));
  if (recipe && (recipe.ingredients.length > 0 || recipe.instructions.length > 0)) {
    recipes.push(recipe);
    return recipes;
  }

  // Check @graph
  if (obj['@graph']) {
    recipes.push(...walkGraphForMultiple(obj['@graph']));
  }

  // Check mainEntity
  if (obj.mainEntity) {
    recipes.push(...walkGraphForMultiple(obj.mainEntity));
  }

  return recipes;
}
