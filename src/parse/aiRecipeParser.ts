/**
 * Parse AI-generated recipe responses with lenient handling.
 * Extracts JSON even when wrapped in markdown code fences or surrounded by chatter.
 * Reuses existing JSON-LD parser for consistency.
 */

import { extractRecipeFromJsonLd, type JsonLdRecipe } from './jsonLd';

/**
 * Extract JSON from AI response that may contain markdown fences or extra text.
 * Handles:
 * - Markdown code fences (```json ... ``` or ``` ... ```)
 * - Bare JSON objects
 * - Trailing commas
 * - Smart quotes (convert to straight quotes)
 * - Extra text before/after JSON
 */
/**
 * Extract JSON from AI response that may contain markdown fences or extra text.
 * Handles:
 * - Markdown code fences (```json ... ``` or ``` ... ```)
 * - Bare JSON objects
 * - Trailing commas
 * - Smart quotes (convert to straight quotes, handling nested cases)
 * - Extra text before/after JSON
 */
function extractJson(response: string): string | null {
  // Try to extract from markdown code fence first
  const fenceMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  let cleaned = fenceMatch ? fenceMatch[1].trim() : response;

  // Find JSON object boundaries
  const startIdx = cleaned.indexOf('{');
  const lastIdx = cleaned.lastIndexOf('}');
  
  if (startIdx === -1 || lastIdx === -1 || startIdx >= lastIdx) {
    return null;
  }

  let jsonText = cleaned.substring(startIdx, lastIdx + 1);

  // Normalize smart quotes to straight quotes
  // Do this carefully to handle nested quotes in string values
  jsonText = jsonText
    .replace(/[\u201C\u201D\u201E\u201F]/g, '\\"')  // " " „ ‟ -> escaped double quote
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")    // ' ' ‚ ‛ -> single quote (safe in JSON)
    .replace(/[\u2039\u203A]/g, "'");              // ‹ › -> single quote

  // Handle trailing commas (common AI mistake)
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');

  return jsonText;
}

/**
 * Parse AI response containing a Schema.org Recipe.
 * Handles multiple formats:
 * - Bare Recipe object
 * - Object with @graph array containing Recipe
 * - Top-level array containing Recipe
 * - Instructions as strings or HowToSection/HowToStep
 */
export function parseAiRecipeResponse(response: string): JsonLdRecipe {
  const jsonText = extractJson(response);
  
  if (!jsonText) {
    throw new Error(
      'Could not find valid JSON in response. Make sure the AI replied with a Schema.org Recipe JSON object.'
    );
  }

  // Try parsing with existing JSON-LD parser (which handles @graph, arrays, etc.)
  const recipe = extractRecipeFromJsonLd(jsonText);
  
  if (recipe && (recipe.ingredients.length > 0 || recipe.instructions.length > 0)) {
    return recipe;
  }

  // If no recipe found but JSON was valid, provide helpful error
  try {
    const parsed = JSON.parse(jsonText);
    
    // Check if it's an array and try first element
    if (Array.isArray(parsed) && parsed.length > 0) {
      const firstRecipe = extractRecipeFromJsonLd(JSON.stringify(parsed[0]));
      if (firstRecipe) return firstRecipe;
    }

    throw new Error(
      'JSON found but no Schema.org Recipe detected. Make sure the AI response includes a Recipe object with name, recipeIngredient, and recipeInstructions fields.'
    );
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(
        'Invalid JSON format. The AI response may have syntax errors. Please try again or paste the response manually.'
      );
    }
    throw e;
  }
}
