import { create } from 'zustand';
import type { Ingredient } from '../domain/types';

export interface GroceryItem {
  id: string;
  text: string;
  checked: boolean;
  /** Source recipe IDs that contributed this item */
  sources: string[];
}

interface GroceryState {
  items: GroceryItem[];
  addFromRecipe: (recipeId: string, recipeName: string, ingredients: Ingredient[]) => void;
  toggleItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
  clearChecked: () => void;
}

export const useGroceryStore = create<GroceryState>((set) => ({
  items: [],

  addFromRecipe: (recipeId: string, recipeName: string, ingredients: Ingredient[]) =>
    set((state) => {
      const newItems = [...state.items];
      
      ingredients.forEach((ing) => {
        // Try to merge similar items (same unit and food)
        const existing = newItems.find(
          (item) =>
            !item.checked &&
            item.text.toLowerCase().includes(ing.food.toLowerCase()) &&
            (ing.unit ? item.text.toLowerCase().includes(ing.unit.toLowerCase()) : true)
        );

        if (existing && ing.quantity !== null) {
          // Merge quantities if both are numeric
          const match = existing.text.match(/^([\d.]+)/);
          if (match) {
            const existingQty = parseFloat(match[1]);
            const newQty = existingQty + ing.quantity;
            existing.text = existing.text.replace(/^[\d.]+/, newQty.toFixed(2).replace(/\.?0+$/, ''));
            if (!existing.sources.includes(recipeId)) {
              existing.sources.push(recipeId);
            }
            return;
          }
        }

        // Add as new item
        newItems.push({
          id: `${recipeId}-${ing.id}-${Date.now()}`,
          text: ing.raw,
          checked: false,
          sources: [recipeId],
        });
      });

      return { items: newItems };
    }),

  toggleItem: (id: string) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ),
    })),

  removeItem: (id: string) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  clearAll: () => set({ items: [] }),

  clearChecked: () =>
    set((state) => ({
      items: state.items.filter((item) => !item.checked),
    })),
}));
