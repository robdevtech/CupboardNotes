import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import * as repo from '../../src/storage/recipeRepo';
import { shareRecipeAsJson } from '../../src/storage/exportShare';
import type { Recipe } from '../../src/domain/types';
import { scaleIngredients, scaleRatio } from '../../src/scale/servings';
import { formatIngredient } from '../../src/parse/ingredientParse';
import { ScaleServings } from '../../src/ui/ScaleServings';
import { PhotoGallery } from '../../src/ui/PhotoGallery';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { useRecipeStore } from '../../src/store/recipeStore';
import { useCookingStore } from '../../src/store/cookingStore';
import { useTheme, space, type ThemeColors } from '../../src/ui/theme';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isTablet } = useBreakpoint();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const remove = useRecipeStore((s) => s.remove);
  const toggleStep = useCookingStore((s) => s.toggleStep);
  const resetRecipe = useCookingStore((s) => s.resetRecipe);
  const checkedSteps = useCookingStore((s) => s.checkedSteps[id || ''] || new Set());
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [targetServings, setTargetServings] = useState(4);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const r = id ? await repo.getRecipe(id) : null;
        if (!alive) return;
        setRecipe(r);
        if (r) setTargetServings(r.servings);
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [id])
  );

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    const ratio = scaleRatio(recipe.servings, targetServings);
    return scaleIngredients(recipe.ingredients, ratio);
  }, [recipe, targetServings]);

  const onDelete = () => {
    if (!recipe) return;
    Alert.alert('Delete recipe?', recipe.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(recipe.id);
          router.replace('/');
        },
      },
    ]);
  };

  const onShare = async () => {
    if (!recipe) return;
    try {
      await shareRecipeAsJson(recipe);
    } catch (e) {
      Alert.alert('Share failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  }
  if (!recipe) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Recipe not found</Text>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={{ color: colors.primary }}>Back to list</Text>
        </Pressable>
      </View>
    );
  }

  const ingredientsBlock = (
    <View style={styles.panel}>
      <Text style={styles.heading}>Ingredients</Text>
      <ScaleServings
        baseServings={recipe.servings}
        targetServings={targetServings}
        onChange={setTargetServings}
      />
      {scaledIngredients.map((ing) => (
        <View key={ing.id} style={styles.ingRow}>
          <Text style={styles.ingText}>{formatIngredient(ing)}</Text>
          {ing.scaleMode === 'fixed' ? (
            <Text style={styles.fixedBadge}>fixed</Text>
          ) : null}
        </View>
      ))}
    </View>
  );

  const stepsBlock = (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Instructions</Text>
        {recipe.steps.length > 0 && checkedSteps.size > 0 ? (
          <Pressable onPress={() => resetRecipe(recipe.id)} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        ) : null}
      </View>
      {recipe.steps
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((step, idx) => {
          const isChecked = checkedSteps.has(step.id);
          return (
            <Pressable
              key={step.id}
              style={styles.stepRow}
              onPress={() => toggleStep(recipe.id, step.id)}
            >
              <View style={styles.stepCheckbox}>
                {isChecked ? (
                  <View style={styles.stepCheckboxInner} />
                ) : null}
              </View>
              <Text style={styles.stepNum}>{idx + 1}</Text>
              <Text style={StyleSheet.flatten([styles.stepText, isChecked && styles.stepTextChecked])}>
                {step.text}
              </Text>
            </Pressable>
          );
        })}
      {recipe.steps.length === 0 ? (
        <Text style={styles.muted}>No steps yet</Text>
      ) : null}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: recipe.title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerActions}>
          {recipe.steps.length > 0 ? (
            <Pressable
              style={StyleSheet.flatten([styles.action, styles.cookAction])}
              onPress={() => router.push(`/cook/${recipe.id}`)}
            >
              <Text style={StyleSheet.flatten([styles.actionText, styles.cookActionText])}>Cook Mode</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.action}
            onPress={() =>
              router.push({ pathname: '/recipe/edit', params: { id: recipe.id } })
            }
          >
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => void onShare()}>
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
          <Pressable style={StyleSheet.flatten([styles.action, styles.danger])} onPress={onDelete}>
            <Text style={StyleSheet.flatten([styles.actionText, { color: colors.danger }])}>Delete</Text>
          </Pressable>
        </View>

        {recipe.description ? (
          <Text style={styles.description}>{recipe.description}</Text>
        ) : null}

        <PhotoGallery photos={recipe.photos} />

        {recipe.tags && recipe.tags.length > 0 ? (
          <View style={styles.tagsContainer}>
            {recipe.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {recipe.notes ? (
          <View style={styles.panel}>
            <Text style={styles.heading}>Notes</Text>
            <Text style={styles.notes}>{recipe.notes}</Text>
          </View>
        ) : null}

        {isTablet ? (
          <View style={styles.split}>
            <View style={styles.splitCol}>{ingredientsBlock}</View>
            <View style={styles.splitCol}>{stepsBlock}</View>
          </View>
        ) : (
          <>
            {ingredientsBlock}
            {stepsBlock}
          </>
        )}

        {recipe.sourceUrl ? (
          <Text style={styles.source}>Source: {recipe.sourceUrl}</Text>
        ) : null}
      </ScrollView>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scroll: { padding: space.md, paddingBottom: space.xl, backgroundColor: colors.bg },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, backgroundColor: colors.bg },
  missingText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  action: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.chip,
    borderRadius: 8,
  },
  danger: { backgroundColor: colors.dangerSoft },
  cookAction: { backgroundColor: colors.primary },
  actionText: { fontWeight: '600', color: colors.text },
  cookActionText: { color: colors.onPrimary },
  description: { fontSize: 15, color: colors.textMuted, marginBottom: space.md, lineHeight: 22 },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.md,
  },
  heading: { fontSize: 17, fontWeight: '700', marginBottom: space.sm, color: colors.text },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  resetBtn: { paddingHorizontal: space.sm, paddingVertical: 4, backgroundColor: colors.chip, borderRadius: 6 },
  resetText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  ingText: { flex: 1, color: colors.text, fontSize: 15 },
  fixedBadge: {
    fontSize: 10,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '700',
  },
  stepRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.md, alignItems: 'flex-start', minHeight: 44 },
  stepCheckbox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepCheckboxInner: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
    overflow: 'hidden',
    marginTop: 2,
  },
  stepText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.text, paddingTop: 5 },
  stepTextChecked: { textDecorationLine: 'line-through', opacity: 0.5 },
  notes: { fontSize: 14, lineHeight: 20, color: colors.text },
  muted: { color: colors.textMuted },
  split: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  splitCol: { flex: 1 },
  source: { fontSize: 12, color: colors.textMuted, marginTop: space.sm },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tagChipText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
});
