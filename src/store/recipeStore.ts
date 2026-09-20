import { create } from 'zustand';
import type { Recipe } from '../domain/types';
import * as repo from '../storage/recipeRepo';

interface RecipeState {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  loadRecipes: () => Promise<void>;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  loading: false,
  error: null,
  hydrated: false,

  async loadRecipes() {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const recipes = await repo.listRecipes();
      set({ recipes, loading: false, hydrated: true });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load recipes',
        hydrated: true,
      });
    }
  },

  async refresh() {
    set({ loading: true, error: null });
    try {
      const recipes = await repo.listRecipes();
      set({ recipes, loading: false, hydrated: true });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to refresh',
      });
    }
  },

  async remove(id: string) {
    await repo.deleteRecipe(id);
    set({ recipes: get().recipes.filter((r) => r.id !== id) });
  },
}));
