import type { RecipeLinkRef } from '../domain/types';
import type { RecipeReference } from '../parse/jsonLd';

export interface BatchAutoLink {
  fromRecipeId: string;
  toRecipeId: string;
  label: string | null;
  page: string | null;
}

/**
 * When a batch of AI-imported recipes includes referencedRecipes names that
 * match another recipe title in the same batch (case-insensitive), produce
 * directed links to persist. Self-links and duplicate pairs are skipped.
 */
export function resolveBatchAutoLinks(
  recipes: Array<{ title: string; referencedRecipes: RecipeReference[] }>,
  nameToId: Record<string, string>
): BatchAutoLink[] {
  const links: BatchAutoLink[] = [];
  const seen = new Set<string>();

  for (const recipe of recipes) {
    const fromRecipeId = nameToId[recipe.title.toLowerCase()];
    if (!fromRecipeId) continue;

    for (const ref of recipe.referencedRecipes) {
      const toRecipeId = nameToId[ref.name.toLowerCase()];
      if (!toRecipeId || toRecipeId === fromRecipeId) continue;

      const key = `${fromRecipeId}\0${toRecipeId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      links.push({
        fromRecipeId,
        toRecipeId,
        label: ref.name,
        page: ref.page,
      });
    }
  }

  return links;
}

export function formatRecipeLinkCaption(link: {
  title: string;
  label: string | null;
  page: string | null;
}): string {
  if (link.page) return `${link.title} (p. ${link.page})`;
  if (link.label && link.label.toLowerCase() !== link.title.toLowerCase()) {
    return `${link.title} (${link.label})`;
  }
  return link.title;
}

/** Longest title/label match contained in free text (ingredient line, etc.). */
export function findLinkedRecipeForText(
  text: string,
  uses: RecipeLinkRef[]
): RecipeLinkRef | undefined {
  const lower = text.toLowerCase();
  let best: RecipeLinkRef | undefined;
  let bestLen = 0;
  for (const link of uses) {
    const candidates = [link.title, link.label].filter((v): v is string => !!v);
    for (const name of candidates) {
      if (name.length > bestLen && lower.includes(name.toLowerCase())) {
        best = link;
        bestLen = name.length;
      }
    }
  }
  return best;
}
