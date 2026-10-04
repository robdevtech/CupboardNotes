import { create } from 'zustand';

/**
 * Session-scoped cooking state: checked steps per recipe.
 * Persists across navigation but resets on app restart.
 */
interface CookingState {
  /** Map of recipeId -> Set of checked step IDs */
  checkedSteps: Record<string, Set<string>>;
  toggleStep: (recipeId: string, stepId: string) => void;
  resetRecipe: (recipeId: string) => void;
  clearAll: () => void;
}

export const useCookingStore = create<CookingState>((set) => ({
  checkedSteps: {},

  toggleStep: (recipeId: string, stepId: string) =>
    set((state) => {
      const current = state.checkedSteps[recipeId] || new Set();
      const updated = new Set(current);
      if (updated.has(stepId)) {
        updated.delete(stepId);
      } else {
        updated.add(stepId);
      }
      return {
        checkedSteps: { ...state.checkedSteps, [recipeId]: updated },
      };
    }),

  resetRecipe: (recipeId: string) =>
    set((state) => {
      const { [recipeId]: _, ...rest } = state.checkedSteps;
      return { checkedSteps: rest };
    }),

  clearAll: () => set({ checkedSteps: {} }),
}));
