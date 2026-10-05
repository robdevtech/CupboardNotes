import {
  findLinkedRecipeForText,
  formatRecipeLinkCaption,
  resolveBatchAutoLinks,
} from '../recipeLinks';
import type { RecipeLinkRef } from '../../domain/types';

describe('resolveBatchAutoLinks', () => {
  it('links referencedRecipes to another recipe in the same batch (case-insensitive)', () => {
    const recipes = [
      { title: 'Biscuit Pastry', referencedRecipes: [] },
      {
        title: 'Strawberry Tartlets',
        referencedRecipes: [
          { name: 'biscuit pastry', page: '309' },
          { name: 'Rich Short Pastry', page: '308' },
        ],
      },
    ];
    const nameToId = {
      'biscuit pastry': 'pastry-id',
      'strawberry tartlets': 'tartlets-id',
    };

    expect(resolveBatchAutoLinks(recipes, nameToId)).toEqual([
      {
        fromRecipeId: 'tartlets-id',
        toRecipeId: 'pastry-id',
        label: 'biscuit pastry',
        page: '309',
      },
    ]);
  });

  it('skips names that are not in the batch and skips self-links', () => {
    const recipes = [
      {
        title: 'Cake',
        referencedRecipes: [
          { name: 'Cake', page: null },
          { name: 'Missing Recipe', page: '1' },
        ],
      },
    ];
    expect(resolveBatchAutoLinks(recipes, { cake: 'cake-id' })).toEqual([]);
  });

  it('dedupes the same from→to pair', () => {
    const recipes = [
      { title: 'Pastry', referencedRecipes: [] },
      {
        title: 'Tart',
        referencedRecipes: [
          { name: 'Pastry', page: '1' },
          { name: 'pastry', page: '2' },
        ],
      },
    ];
    const links = resolveBatchAutoLinks(recipes, {
      pastry: 'p',
      tart: 't',
    });
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ fromRecipeId: 't', toRecipeId: 'p', page: '1' });
  });
});

describe('formatRecipeLinkCaption', () => {
  it('appends a page when present', () => {
    expect(
      formatRecipeLinkCaption({ title: 'Biscuit Pastry', label: 'Biscuit Pastry', page: '309' })
    ).toBe('Biscuit Pastry (p. 309)');
  });

  it('appends a distinct label when there is no page', () => {
    expect(
      formatRecipeLinkCaption({ title: 'Pastry', label: 'Biscuit pastry base', page: null })
    ).toBe('Pastry (Biscuit pastry base)');
  });
});

describe('findLinkedRecipeForText', () => {
  const uses: RecipeLinkRef[] = [
    {
      linkId: 'l1',
      recipeId: 'pastry-id',
      title: 'Biscuit Pastry',
      label: 'biscuit pastry',
      page: '309',
    },
    {
      linkId: 'l2',
      recipeId: 'short-id',
      title: 'Rich Short Pastry',
      label: null,
      page: '308',
    },
  ];

  it('matches the longest linked title or label in an ingredient line', () => {
    const found = findLinkedRecipeForText(
      '200 g biscuit pastry (page 309) or rich short pastry (page 308)',
      uses
    );
    expect(found?.recipeId).toBe('short-id');
  });

  it('returns undefined when no linked recipe is mentioned', () => {
    expect(findLinkedRecipeForText('200 g fresh strawberries', uses)).toBeUndefined();
  });
});
