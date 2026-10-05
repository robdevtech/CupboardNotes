import { parseAiRecipeResponse } from '../aiRecipeParser';

describe('parseAiRecipeResponse', () => {
  it('parses clean JSON-LD Recipe', () => {
    const input = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Chocolate Chip Cookies',
      description: 'Classic cookies',
      recipeYield: '24 cookies',
      prepTime: 'PT15M',
      cookTime: 'PT12M',
      recipeIngredient: ['2 cups flour', '1 cup sugar', '1/2 cup butter'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Mix dry ingredients' },
        { '@type': 'HowToStep', text: 'Add butter and mix' },
        { '@type': 'HowToStep', text: 'Bake at 350°F for 12 minutes' },
      ],
    });

    const recipes = parseAiRecipeResponse(input);

    expect(recipes).toHaveLength(1);
    expect(recipes[0].title).toBe('Chocolate Chip Cookies');
    expect(recipes[0].description).toBe('Classic cookies');
    expect(recipes[0].ingredients).toHaveLength(3);
    expect(recipes[0].ingredients[0]).toBe('2 cups flour');
    expect(recipes[0].instructions).toHaveLength(3);
    expect(recipes[0].instructions[0]).toBe('Mix dry ingredients');
  });

  it('extracts JSON from markdown code fence', () => {
    const input = `Here's your recipe:

\`\`\`json
{
  "@type": "Recipe",
  "name": "Pasta Carbonara",
  "recipeIngredient": ["400g spaghetti", "200g pancetta", "4 eggs"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Boil pasta" },
    { "@type": "HowToStep", "text": "Fry pancetta" },
    { "@type": "HowToStep", "text": "Mix with eggs" }
  ]
}
\`\`\`

Hope this helps!`;

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe('Pasta Carbonara');
    expect(recipes[0].ingredients).toHaveLength(3);
    expect(recipes[0].instructions).toHaveLength(3);
  });

  it('extracts JSON from code fence without language tag', () => {
    const input = `\`\`\`
{
  "@type": "Recipe",
  "name": "Quick Salad",
  "recipeIngredient": ["1 head lettuce", "2 tomatoes"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Chop vegetables" },
    { "@type": "HowToStep", "text": "Toss with dressing" }
  ]
}
\`\`\``;

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe('Quick Salad');
    expect(recipes[0].ingredients).toHaveLength(2);
  });

  it('handles trailing commas', () => {
    const input = `{
  "@type": "Recipe",
  "name": "Test Recipe",
  "recipeIngredient": [
    "1 cup flour",
    "2 eggs",
  ],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Mix ingredients" },
  ],
}`;

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe('Test Recipe');
    expect(recipes[0].ingredients).toHaveLength(2);
    expect(recipes[0].instructions).toHaveLength(1);
  });

  it('handles smart quotes', () => {
    // Use Unicode escapes for smart quotes
    const input = `{
  "@type": "Recipe",
  "name": "Chef\u2019s Special",
  "description": "A \u201Cdelicious\u201D recipe",
  "recipeIngredient": ["1 cup \u2018special\u2019 sauce"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Cook with care" }
  ]
}`;

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe("Chef's Special");
    expect(recipes[0].description).toContain('delicious');
  });

  it('handles instructions as plain strings', () => {
    const input = JSON.stringify({
      '@type': 'Recipe',
      name: 'Simple Toast',
      recipeIngredient: ['2 slices bread', '1 tbsp butter'],
      recipeInstructions: ['Toast the bread', 'Spread butter', 'Serve warm'],
    });

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe('Simple Toast');
    expect(recipes[0].instructions).toHaveLength(3);
    expect(recipes[0].instructions[0]).toBe('Toast the bread');
  });

  it('handles instructions with HowToSection', () => {
    const input = JSON.stringify({
      '@type': 'Recipe',
      name: 'Complex Dish',
      recipeIngredient: ['ingredient 1', 'ingredient 2'],
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          name: 'Prep',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Prep step 1' },
            { '@type': 'HowToStep', text: 'Prep step 2' },
          ],
        },
        {
          '@type': 'HowToSection',
          name: 'Cook',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Cook step 1' },
          ],
        },
      ],
    });

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe('Complex Dish');
    expect(recipes[0].instructions).toHaveLength(3);
    expect(recipes[0].instructions[0]).toBe('Prep step 1');
    expect(recipes[0].instructions[2]).toBe('Cook step 1');
  });

  it('handles @graph wrapper', () => {
    const input = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: 'Recipe Page',
        },
        {
          '@type': 'Recipe',
          name: 'Graph Recipe',
          recipeIngredient: ['flour', 'water'],
          recipeInstructions: [{ '@type': 'HowToStep', text: 'Mix and bake' }],
        },
      ],
    });

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe('Graph Recipe');
    expect(recipes[0].ingredients).toHaveLength(2);
  });

  it('handles top-level array', () => {
    const input = JSON.stringify([
      {
        '@type': 'Recipe',
        name: 'Array Recipe',
        recipeIngredient: ['ingredient 1'],
        recipeInstructions: [{ '@type': 'HowToStep', text: 'Step 1' }],
      },
    ]);

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe('Array Recipe');
  });

  it('extracts JSON surrounded by chatter', () => {
    const input = `Sure! Here's the recipe you requested:

{
  "@type": "Recipe",
  "name": "Chatty Recipe",
  "recipeIngredient": ["1 cup sugar", "2 cups flour"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Mix everything" }
  ]
}

Let me know if you need any modifications!`;

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe('Chatty Recipe');
    expect(recipes[0].ingredients).toHaveLength(2);
  });

  it('handles [unclear] markers from AI', () => {
    const input = JSON.stringify({
      '@type': 'Recipe',
      name: 'Unclear Recipe',
      recipeIngredient: ['[unclear] flour', '2 cups [unclear]', '1 tsp salt'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Mix [unclear] together' },
      ],
    });

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe('Unclear Recipe');
    expect(recipes[0].ingredients).toHaveLength(3);
    expect(recipes[0].ingredients[0]).toContain('[unclear]');
  });

  it('throws error when no JSON found', () => {
    const input = 'This is just plain text with no JSON at all.';

    expect(() => parseAiRecipeResponse(input)).toThrow(
      'Could not find valid JSON in response'
    );
  });

  it('throws error when JSON has no Recipe', () => {
    const input = JSON.stringify({
      '@type': 'Person',
      name: 'John Doe',
    });

    expect(() => parseAiRecipeResponse(input)).toThrow(
      'JSON found but no Schema.org Recipe detected'
    );
  });

  it('throws error for invalid JSON syntax', () => {
    const input = `{
  "@type": "Recipe",
  "name": "Broken Recipe"
  "recipeIngredient": [
}`;

    expect(() => parseAiRecipeResponse(input)).toThrow('Invalid JSON format');
  });

  it('handles recipeYield as string', () => {
    const input = JSON.stringify({
      '@type': 'Recipe',
      name: 'Yield Test',
      recipeYield: '4 servings',
      recipeIngredient: ['ingredient'],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'cook' }],
    });

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].servings).toBe(4);
  });

  it('handles recipeYield as number', () => {
    const input = JSON.stringify({
      '@type': 'Recipe',
      name: 'Yield Number',
      recipeYield: 6,
      recipeIngredient: ['ingredient'],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'cook' }],
    });

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].servings).toBe(6);
  });

  it('preserves quantities while normalizing unit names', () => {
    const input = JSON.stringify({
      '@type': 'Recipe',
      name: 'Unit Test',
      recipeIngredient: [
        '250g flour',
        '2 cups milk',
        '1 tablespoon vanilla',
        '3 whole eggs',
      ],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'Mix all' }],
    });

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].ingredients[0]).toBe('250g flour');
    expect(recipes[0].ingredients[1]).toBe('2 cups milk');
    expect(recipes[0].ingredients[2]).toBe('1 tbsp vanilla');  // normalized
    expect(recipes[0].ingredients[3]).toBe('3 whole eggs');
  });

  it('handles real-world AI response with extra formatting', () => {
    const input = `I've analyzed the recipe and here's the structured output:

\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Grandma's Apple Pie",
  "description": "A classic American apple pie with a flaky crust",
  "recipeYield": "8 servings",
  "prepTime": "PT30M",
  "cookTime": "PT50M",
  "totalTime": "PT1H20M",
  "recipeIngredient": [
    "2 1/2 cups all-purpose flour",
    "1 cup cold butter, cubed",
    "1/4 cup ice water",
    "6 medium apples, peeled and sliced",
    "3/4 cup sugar",
    "2 tablespoons flour",
    "1 teaspoon cinnamon",
    "a pinch of nutmeg"
  ],
  "recipeInstructions": [
    {
      "@type": "HowToStep",
      "text": "Make the crust: Mix flour and butter until crumbly, add water"
    },
    {
      "@type": "HowToStep",
      "text": "Roll out dough and line a 9-inch pie pan"
    },
    {
      "@type": "HowToStep",
      "text": "Mix apples with sugar, flour, and spices"
    },
    {
      "@type": "HowToStep",
      "text": "Fill crust with apple mixture and cover with top crust"
    },
    {
      "@type": "HowToStep",
      "text": "Bake at 375°F for 50 minutes until golden brown"
    }
  ],
  "recipeCategory": "Dessert",
  "keywords": "apple, pie, dessert, baking"
}
\`\`\`

This recipe should work well for you! Let me know if you need any adjustments.`;

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe("Grandma's Apple Pie");
    expect(recipes[0].description).toContain('classic American apple pie');
    expect(recipes[0].servings).toBe(8);
    expect(recipes[0].ingredients).toHaveLength(8);
    expect(recipes[0].ingredients[0]).toBe('2 1/2 cups all-purpose flour');
    expect(recipes[0].ingredients[7]).toBe('a pinch of nutmeg');
    expect(recipes[0].instructions).toHaveLength(5);
    expect(recipes[0].instructions[4]).toContain('Bake at 375°F');
  });

  it('handles cookbook recipe with position, cookingMethod, and [unclear] values', () => {
    const input = `Here's the recipe in JSON format:

\`\`\`json
{"@context":"https://schema.org","@type":"Recipe","name":"Strawberry Tartlets","description":"Tartlet cases of biscuit pastry or rich short pastry filled with strawberries, glazed with thickened fruit juice, and decorated with whipped cream.","recipeYield":"[unclear]","prepTime":"[unclear]","cookTime":"PT20M","totalTime":"[unclear]","recipeIngredient":["200 g biscuit pastry (page 309) or rich short pastry (page 308)","200 g fresh strawberries or 1 packet frozen strawberries","125 ml cream","125 ml fruit juice","Colouring if required","2 level tsp arrowroot or sachet of quick setting gel","1 tbsp sugar"],"recipeInstructions":[{"@type":"HowToStep","position":1,"text":"To make fruit juice: soak fresh strawberries with 1 tbsp sugar until juice flows. Make up if necessary to 125 ml with water."},{"@type":"HowToStep","position":2,"text":"Line patty tins with pastry, fork the base."},{"@type":"HowToStep","position":3,"text":"Bake until a very pale brown. Cool."},{"@type":"HowToStep","position":4,"text":"Fill up cases with prepared fruit – halved if necessary."},{"@type":"HowToStep","position":5,"text":"Thicken the fruit juice with blended arrowroot and cook for 1–2 minutes or use a sachet of quick setting gel."},{"@type":"HowToStep","position":6,"text":"Glaze fruit, allow to cool and decorate with whipped cream."}],"recipeCategory":"Dessert","keywords":"strawberry tartlets, pastry","cookingMethod":"Bake at 190°C, No. 5, one-third from the top, 15–20 minutes. Note: A little cream spread on bottom of case helps to prevent the pastry softening.","referencedRecipes":[{"name":"Biscuit Pastry","page":"309"},{"name":"Rich Short Pastry","page":"308"}]}
\`\`\`

Would you like me to import the Biscuit Pastry (page 309) and Rich Short Pastry (page 308) recipes as well?`;

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].title).toBe('Strawberry Tartlets');
    expect(recipes[0].description).toContain('Tartlet cases');
    
    // [unclear] values should be treated as null/empty
    expect(recipes[0].servings).toBeNull();
    expect(recipes[0].prepTimeMinutes).toBeNull();
    expect(recipes[0].totalTimeMinutes).toBeNull();
    
    // Valid ISO duration should parse
    expect(recipes[0].cookTimeMinutes).toBe(20);
    
    // Instructions should be in order by position
    expect(recipes[0].instructions).toHaveLength(6);
    expect(recipes[0].instructions[0]).toContain('To make fruit juice');
    expect(recipes[0].instructions[1]).toContain('Line patty tins');
    expect(recipes[0].instructions[2]).toContain('Bake until a very pale brown');
    expect(recipes[0].instructions[3]).toContain('Fill up cases');
    expect(recipes[0].instructions[4]).toContain('Thicken the fruit juice');
    expect(recipes[0].instructions[5]).toContain('Glaze fruit');
    
    // cookingMethod should be extracted as notes
    expect(recipes[0].notes).toContain('Bake at 190°C');
    expect(recipes[0].notes).toContain('Note: A little cream spread on bottom of case');
    
    // Ingredients should have ml abbreviations (normalized)
    expect(recipes[0].ingredients).toContain('125 ml cream');
    expect(recipes[0].ingredients).toContain('125 ml fruit juice');
    expect(recipes[0].ingredients).toContain('2 tsp arrowroot or sachet of quick setting gel');
    expect(recipes[0].ingredients).toContain('1 tbsp sugar');
    
    // Referenced recipes should be extracted
    expect(recipes[0].referencedRecipes).toHaveLength(2);
    expect(recipes[0].referencedRecipes[0]).toEqual({ name: 'Biscuit Pastry', page: '309' });
    expect(recipes[0].referencedRecipes[1]).toEqual({ name: 'Rich Short Pastry', page: '308' });
  });

  it('normalizes verbose unit names to abbreviations', () => {
    const input = JSON.stringify({
      '@type': 'Recipe',
      name: 'Unit Test Recipe',
      recipeIngredient: [
        '250 millilitres milk',
        '2 litres water',
        '500 grams flour',
        '1 kilogram sugar',
        '3 teaspoons vanilla',
        '2 tablespoons butter',
        '8 ounces cheese',
        '1 pound beef',
        '2 level teaspoonfuls salt',
      ],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'Mix all' }],
    });

    const recipes = parseAiRecipeResponse(input);

    expect(recipes[0].ingredients[0]).toBe('250 ml milk');
    expect(recipes[0].ingredients[1]).toBe('2 l water');
    expect(recipes[0].ingredients[2]).toBe('500 g flour');
    expect(recipes[0].ingredients[3]).toBe('1 kg sugar');
    expect(recipes[0].ingredients[4]).toBe('3 tsp vanilla');
    expect(recipes[0].ingredients[5]).toBe('2 tbsp butter');
    expect(recipes[0].ingredients[6]).toBe('8 oz cheese');
    expect(recipes[0].ingredients[7]).toBe('1 lb beef');
    expect(recipes[0].ingredients[8]).toBe('2 tsp salt');
  });
});

  it('handles multiple recipes in JSON array', () => {
    const input = JSON.stringify([
      {
        '@type': 'Recipe',
        name: 'Recipe One',
        recipeIngredient: ['ingredient 1'],
        recipeInstructions: [{ '@type': 'HowToStep', text: 'Step 1' }],
      },
      {
        '@type': 'Recipe',
        name: 'Recipe Two',
        recipeIngredient: ['ingredient 2'],
        recipeInstructions: [{ '@type': 'HowToStep', text: 'Step 2' }],
      },
    ]);

    const recipes = parseAiRecipeResponse(input);

    expect(recipes).toHaveLength(2);
    expect(recipes[0].title).toBe('Recipe One');
    expect(recipes[1].title).toBe('Recipe Two');
  });

  it('handles multiple fenced code blocks', () => {
    const input = `Here are your recipes:

\`\`\`json
{
  "@type": "Recipe",
  "name": "First Recipe",
  "recipeIngredient": ["flour"],
  "recipeInstructions": [{"@type": "HowToStep", "text": "Mix"}]
}
\`\`\`

\`\`\`json
{
  "@type": "Recipe",
  "name": "Second Recipe",
  "recipeIngredient": ["sugar"],
  "recipeInstructions": [{"@type": "HowToStep", "text": "Stir"}]
}
\`\`\``;

    const recipes = parseAiRecipeResponse(input);

    expect(recipes).toHaveLength(2);
    expect(recipes[0].title).toBe('First Recipe');
    expect(recipes[1].title).toBe('Second Recipe');
  });

  it('handles batch import with cross-references (Strawberry Tartlets + Biscuit Pastry)', () => {
    const input = JSON.stringify([
      {
        '@type': 'Recipe',
        name: 'Biscuit Pastry',
        recipeIngredient: ['200 g flour', '100 g butter', '50 ml water'],
        recipeInstructions: [
          { '@type': 'HowToStep', position: 1, text: 'Rub butter into flour' },
          { '@type': 'HowToStep', position: 2, text: 'Add water and form dough' },
        ],
      },
      {
        '@type': 'Recipe',
        name: 'Strawberry Tartlets',
        recipeIngredient: [
          '200 g biscuit pastry (see above)',
          '200 g strawberries',
          '125 ml cream',
        ],
        recipeInstructions: [
          { '@type': 'HowToStep', position: 1, text: 'Line tins with pastry' },
          { '@type': 'HowToStep', position: 2, text: 'Fill with strawberries' },
        ],
        referencedRecipes: [{ name: 'Biscuit Pastry', page: null }],
      },
    ]);

    const recipes = parseAiRecipeResponse(input);

    expect(recipes).toHaveLength(2);
    expect(recipes[0].title).toBe('Biscuit Pastry');
    expect(recipes[1].title).toBe('Strawberry Tartlets');
    expect(recipes[1].referencedRecipes).toHaveLength(1);
    expect(recipes[1].referencedRecipes[0].name).toBe('Biscuit Pastry');
  });
