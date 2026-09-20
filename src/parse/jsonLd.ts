/**
 * Extract schema.org Recipe from JSON-LD embedded in HTML.
 * Own TypeScript — concepts from schema.org, not Mealie source.
 */

export interface JsonLdRecipe {
  title: string;
  description: string | null;
  servings: number | null;
  ingredients: string[];
  instructions: string[];
  /** Image URLs from schema.org Recipe.image when present */
  imageUrls: string[];
  sourceUrl: string | null;
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractServings(yieldVal: unknown): number | null {
  if (yieldVal == null) return null;
  if (typeof yieldVal === 'number' && Number.isFinite(yieldVal)) return yieldVal;
  const s = String(yieldVal);
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function extractInstructions(inst: unknown): string[] {
  const out: string[] = [];
  for (const item of asArray(inst)) {
    if (typeof item === 'string') {
      const t = stripHtml(item);
      if (t) out.push(t);
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const type = String(obj['@type'] ?? '');
      if (type.includes('HowToSection')) {
        out.push(...extractInstructions(obj.itemListElement));
      } else if (type.includes('HowToStep') || obj.text) {
        const t = stripHtml(String(obj.text ?? obj.name ?? ''));
        if (t) out.push(t);
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
    .map((x) => stripHtml(String(x)))
    .filter(Boolean);

  const instructions = extractInstructions(node.recipeInstructions);

  return {
    title,
    description: node.description ? stripHtml(String(node.description)) : null,
    servings: extractServings(node.recipeYield ?? node.yield),
    ingredients,
    instructions,
    imageUrls: extractImageUrls(node.image),
    sourceUrl: pageUrl ?? (typeof node.url === 'string' ? node.url : null),
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
