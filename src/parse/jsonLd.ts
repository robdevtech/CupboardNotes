/**
 * Extract schema.org Recipe from JSON-LD embedded in HTML.
 * Own TypeScript — concepts from schema.org, not Mealie source.
 */

export interface RecipeReference {
  name: string;
  page: string | null;
}

export interface JsonLdRecipe {
  title: string;
  description: string | null;
  servings: number | null;
  ingredients: string[];
  instructions: string[];
  /** Image URLs from schema.org Recipe.image when present */
  imageUrls: string[];
  sourceUrl: string | null;
  /** Cooking notes from cookingMethod or Note steps */
  notes: string | null;
  /** Time values in minutes (null if [unclear] or missing) */
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  /** Referenced recipes from cookbook cross-references */
  referencedRecipes: RecipeReference[];
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normalize common unit words to standard abbreviations.
 * Safety net for when AI doesn't follow prompt instructions.
 */
function normalizeUnits(text: string): string {
  return text
    .replace(/\bmillilitres?\b/gi, 'ml')
    .replace(/\bmilliliters?\b/gi, 'ml')
    .replace(/\bmls\b/gi, 'ml')
    .replace(/\blitres?\b/gi, 'l')
    .replace(/\bliters?\b/gi, 'l')
    .replace(/\bgrams?\b/gi, 'g')
    .replace(/\bgrammes?\b/gi, 'g')
    .replace(/\bkilograms?\b/gi, 'kg')
    .replace(/\bkilogrammes?\b/gi, 'kg')
    .replace(/\bteaspoon(?:ful)?s?\b/gi, 'tsp')
    .replace(/\btablespoon(?:ful)?s?\b/gi, 'tbsp')
    .replace(/\bounces?\b/gi, 'oz')
    .replace(/\bpounds?\b/gi, 'lb')
    // Remove "level" modifier before units
    .replace(/\blevel\s+(tsp|tbsp)\b/gi, '$1');
}

function parseIsoDuration(iso: unknown): number | null {
  if (iso == null) return null;
  const s = String(iso).trim();
  
  // Treat [unclear] or other non-ISO values as empty
  if (s === '[unclear]' || s === '' || !s.startsWith('PT')) return null;
  
  // Parse ISO 8601 duration (e.g., PT30M, PT1H30M, PT2H)
  const hourMatch = s.match(/(\d+)H/);
  const minMatch = s.match(/(\d+)M/);
  
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
  
  return hours * 60 + minutes;
}

function extractServings(yieldVal: unknown): number | null {
  if (yieldVal == null) return null;
  
  const s = String(yieldVal).trim();
  // Treat [unclear] as null
  if (s === '[unclear]') return null;
  
  if (typeof yieldVal === 'number' && Number.isFinite(yieldVal)) return yieldVal;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

interface InstructionStep {
  text: string;
  position: number | null;
}

function extractInstructions(inst: unknown): InstructionStep[] {
  const out: InstructionStep[] = [];
  for (const item of asArray(inst)) {
    if (typeof item === 'string') {
      const t = stripHtml(item);
      if (t) out.push({ text: t, position: null });
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const type = String(obj['@type'] ?? '');
      if (type.includes('HowToSection')) {
        out.push(...extractInstructions(obj.itemListElement));
      } else if (type.includes('HowToStep') || obj.text) {
        const t = stripHtml(String(obj.text ?? obj.name ?? ''));
        if (t) {
          const pos = typeof obj.position === 'number' ? obj.position : null;
          out.push({ text: t, position: pos });
        }
      } else if (obj.itemListElement) {
        out.push(...extractInstructions(obj.itemListElement));
      }
    }
  }
  return out;
}

function extractImageUrls(image: unknown): string[] {
  const urls: string[] = [];
  for (const item of asArray(image)) {
    if (typeof item === 'string' && /^https?:\/\//i.test(item)) {
      urls.push(item);
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const u = obj.url ?? obj.contentUrl;
      if (typeof u === 'string' && /^https?:\/\//i.test(u)) urls.push(u);
    }
  }
  return [...new Set(urls)];
}

function isRecipeType(t: unknown): boolean {
  const types = asArray(t).map((x) => String(x).toLowerCase());
  return types.some((x) => x === 'recipe' || x.endsWith('/recipe'));
}

function normalizeRecipe(node: Record<string, unknown>, pageUrl?: string): JsonLdRecipe | null {
  if (!isRecipeType(node['@type']) && !node.recipeIngredient && !node.recipeInstructions) {
    return null;
  }
  const title = String(node.name ?? node.headline ?? '').trim();
  if (!title) return null;

  const ingredients = asArray(node.recipeIngredient)
    .map((x) => normalizeUnits(stripHtml(String(x))))
    .filter(Boolean);

  const instructionSteps = extractInstructions(node.recipeInstructions);
  
  // Sort by position if present, otherwise keep original order
  const sortedSteps = [...instructionSteps].sort((a, b) => {
    if (a.position !== null && b.position !== null) return a.position - b.position;
    if (a.position !== null) return -1;
    if (b.position !== null) return 1;
    return 0;
  });
  
  // Extract notes from cookingMethod and Note steps
  const noteParts: string[] = [];
  const cookingMethod = node.cookingMethod;
  if (cookingMethod && typeof cookingMethod === 'string') {
    const cleaned = stripHtml(cookingMethod);
    if (cleaned) noteParts.push(cleaned);
  }
  
  // Check for Note steps (keep them separate from regular instructions)
  const regularInstructions: string[] = [];
  for (const step of sortedSteps) {
    if (step.text.toLowerCase().startsWith('note:') || step.text.toLowerCase().startsWith('note -')) {
      noteParts.push(step.text);
    } else {
      regularInstructions.push(step.text);
    }
  }

  // Extract referenced recipes
  const referencedRecipes: RecipeReference[] = [];
  const refs = node.referencedRecipes;
  if (Array.isArray(refs)) {
    for (const ref of refs) {
      if (ref && typeof ref === 'object') {
        const refObj = ref as Record<string, unknown>;
        const name = String(refObj.name ?? '').trim();
        if (name) {
          referencedRecipes.push({
            name,
            page: refObj.page ? String(refObj.page) : null,
          });
        }
      }
    }
  }

  return {
    title,
    description: node.description ? stripHtml(String(node.description)) : null,
    servings: extractServings(node.recipeYield ?? node.yield),
    ingredients,
    instructions: regularInstructions,
    imageUrls: extractImageUrls(node.image),
    sourceUrl: pageUrl ?? (typeof node.url === 'string' ? node.url : null),
    notes: noteParts.length > 0 ? noteParts.join('\n\n') : null,
    prepTimeMinutes: parseIsoDuration(node.prepTime),
    cookTimeMinutes: parseIsoDuration(node.cookTime),
    totalTimeMinutes: parseIsoDuration(node.totalTime),
    referencedRecipes,
  };
}

function walkGraph(data: unknown, pageUrl?: string): JsonLdRecipe | null {
  if (!data || typeof data !== 'object') return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = walkGraph(item, pageUrl);
      if (found) return found;
    }
    return null;
  }

  const obj = data as Record<string, unknown>;
  const direct = normalizeRecipe(obj, pageUrl);
  if (direct && (isRecipeType(obj['@type']) || direct.ingredients.length > 0)) {
    return direct;
  }

  if (obj['@graph']) {
    const fromGraph = walkGraph(obj['@graph'], pageUrl);
    if (fromGraph) return fromGraph;
  }

  if (obj.mainEntity) {
    const me = walkGraph(obj.mainEntity, pageUrl);
    if (me) return me;
  }

  return null;
}

export function extractRecipeFromJsonLd(jsonText: string, pageUrl?: string): JsonLdRecipe | null {
  try {
    const data = JSON.parse(jsonText);
    return walkGraph(data, pageUrl);
  } catch {
    return null;
  }
}

export function extractRecipeFromJsonLdBlocks(
  blocks: string[],
  pageUrl?: string
): JsonLdRecipe | null {
  for (const block of blocks) {
    const recipe = extractRecipeFromJsonLd(block, pageUrl);
    if (recipe && (recipe.ingredients.length > 0 || recipe.instructions.length > 0)) {
      return recipe;
    }
  }
  for (const block of blocks) {
    const recipe = extractRecipeFromJsonLd(block, pageUrl);
    if (recipe) return recipe;
  }
  return null;
}
