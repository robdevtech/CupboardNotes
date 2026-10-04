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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe('Chocolate Chip Cookies');
    expect(result.description).toBe('Classic cookies');
    expect(result.ingredients).toHaveLength(3);
    expect(result.ingredients[0]).toBe('2 cups flour');
    expect(result.instructions).toHaveLength(3);
    expect(result.instructions[0]).toBe('Mix dry ingredients');
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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe('Pasta Carbonara');
    expect(result.ingredients).toHaveLength(3);
    expect(result.instructions).toHaveLength(3);
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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe('Quick Salad');
    expect(result.ingredients).toHaveLength(2);
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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe('Test Recipe');
    expect(result.ingredients).toHaveLength(2);
    expect(result.instructions).toHaveLength(1);
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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe("Chef's Special");
    expect(result.description).toContain('delicious');
  });

  it('handles instructions as plain strings', () => {
    const input = JSON.stringify({
      '@type': 'Recipe',
      name: 'Simple Toast',
      recipeIngredient: ['2 slices bread', '1 tbsp butter'],
      recipeInstructions: ['Toast the bread', 'Spread butter', 'Serve warm'],
    });

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe('Simple Toast');
    expect(result.instructions).toHaveLength(3);
    expect(result.instructions[0]).toBe('Toast the bread');
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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe('Complex Dish');
    expect(result.instructions).toHaveLength(3);
    expect(result.instructions[0]).toBe('Prep step 1');
    expect(result.instructions[2]).toBe('Cook step 1');
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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe('Graph Recipe');
    expect(result.ingredients).toHaveLength(2);
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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe('Array Recipe');
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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe('Chatty Recipe');
    expect(result.ingredients).toHaveLength(2);
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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe('Unclear Recipe');
    expect(result.ingredients).toHaveLength(3);
    expect(result.ingredients[0]).toContain('[unclear]');
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

    const result = parseAiRecipeResponse(input);

    expect(result.servings).toBe(4);
  });

  it('handles recipeYield as number', () => {
    const input = JSON.stringify({
      '@type': 'Recipe',
      name: 'Yield Number',
      recipeYield: 6,
      recipeIngredient: ['ingredient'],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'cook' }],
    });

    const result = parseAiRecipeResponse(input);

    expect(result.servings).toBe(6);
  });

  it('preserves original units and measurements', () => {
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

    const result = parseAiRecipeResponse(input);

    expect(result.ingredients[0]).toBe('250g flour');
    expect(result.ingredients[1]).toBe('2 cups milk');
    expect(result.ingredients[2]).toBe('1 tablespoon vanilla');
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

    const result = parseAiRecipeResponse(input);

    expect(result.title).toBe("Grandma's Apple Pie");
    expect(result.description).toContain('classic American apple pie');
    expect(result.servings).toBe(8);
    expect(result.ingredients).toHaveLength(8);
    expect(result.ingredients[0]).toBe('2 1/2 cups all-purpose flour');
    expect(result.ingredients[7]).toBe('a pinch of nutmeg');
    expect(result.instructions).toHaveLength(5);
    expect(result.instructions[4]).toContain('Bake at 375°F');
  });
});
