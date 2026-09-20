import { Parser } from 'htmlparser2';
import { extractRecipeFromJsonLdBlocks, type JsonLdRecipe } from './jsonLd';

/**
 * Fetch HTTPS HTML and extract schema.org Recipe via JSON-LD.
 * On-device only — no backend.
 */
export async function fetchHtml(url: string): Promise<string> {
  if (!/^https:\/\//i.test(url)) {
    throw new Error('Only HTTPS URLs are supported');
  }
  const res = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Cupboard Notes/1.0 (mobile; offline-first recipe importer)',
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status}`);
  }
  return await res.text();
}

/** Collect application/ld+json script bodies from HTML. */
export function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  let inLdJson = false;
  let buffer = '';

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (
          name === 'script' &&
          attribs.type &&
          attribs.type.toLowerCase().includes('ld+json')
        ) {
          inLdJson = true;
          buffer = '';
        }
      },
      ontext(text) {
        if (inLdJson) buffer += text;
      },
      onclosetag(name) {
        if (name === 'script' && inLdJson) {
          inLdJson = false;
          const trimmed = buffer.trim();
          if (trimmed) blocks.push(trimmed);
          buffer = '';
        }
      },
    },
    { decodeEntities: true }
  );

  parser.write(html);
  parser.end();
  return blocks;
}

export async function importRecipeFromUrl(url: string): Promise<JsonLdRecipe> {
  const html = await fetchHtml(url);
  const blocks = extractJsonLdBlocks(html);
  if (blocks.length === 0) {
    throw new Error('No JSON-LD found on page. Paste ingredients manually or try another URL.');
  }
  const recipe = extractRecipeFromJsonLdBlocks(blocks, url);
  if (!recipe) {
    throw new Error(
      'JSON-LD found but no schema.org Recipe. Paste or enter the recipe manually.'
    );
  }
  return recipe;
}
