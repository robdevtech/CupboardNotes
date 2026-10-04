import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTheme, space, type ThemeColors } from '../../src/ui/theme';
import { importRecipeFromUrl } from '../../src/parse/htmlFetch';
import { parseIngredientLine } from '../../src/parse/ingredientParse';
import { photosFromImportUrls } from '../../src/storage/photos';
import { newId } from '../../src/domain/ids';
import * as repo from '../../src/storage/recipeRepo';
import { useRecipeStore } from '../../src/store/recipeStore';
import type { JsonLdRecipe } from '../../src/parse/jsonLd';

export default function RecommendationPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const refresh = useRecipeStore((s) => s.refresh);

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [recipe, setRecipe] = useState<JsonLdRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const url = Array.isArray(params.url) ? params.url[0] : params.url;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const tags = params.tags
    ? (Array.isArray(params.tags) ? params.tags : [params.tags])
    : [];

  useEffect(() => {
    if (!url) {
      setError('No recipe URL provided');
      setLoading(false);
      return;
    }
    loadRecipe();
  }, [url]);

  const loadRecipe = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const data = await importRecipeFromUrl(url);
      setRecipe(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recipe preview');
    } finally {
      setLoading(false);
    }
  };

  const onImport = async () => {
    if (!recipe || !url) return;
    setImporting(true);
    try {
      const photos = await photosFromImportUrls(recipe.imageUrls);
      const created = await repo.createRecipe({
        title: recipe.title,
        description: recipe.description,
        notes: null,
        servings: recipe.servings && recipe.servings > 0 ? recipe.servings : 4,
        ingredients: recipe.ingredients.map((line) => parseIngredientLine(line)),
        steps: recipe.instructions.map((text, order) => ({ id: newId(), text, order })),
        photos,
        sourceUrl: recipe.sourceUrl ?? url,
        tags: tags as string[],
      });
      await refresh();
      Alert.alert('Recipe imported!', `"${created.title}" added to your collection.`, [
        { text: 'View', onPress: () => router.replace(`/recipe/${created.id}`) },
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert(
        'Import failed',
        e instanceof Error ? e.message : 'Could not import this recipe.'
      );
    } finally {
      setImporting(false);
    }
  };

  const onOpenOriginal = async () => {
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      // Fallback to Linking if WebBrowser fails
      await Linking.openURL(url);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: title || 'Recipe Preview' }} />
      <View style={styles.screen}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading recipe preview...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={loadRecipe}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </Pressable>
          </View>
        ) : recipe ? (
          <>
            <ScrollView contentContainerStyle={styles.scroll}>
              <Text style={styles.recipeTitle}>{recipe.title}</Text>
              {recipe.description && (
                <Text style={styles.recipeDescription}>{recipe.description}</Text>
              )}

              {recipe.servings && recipe.servings > 0 && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Servings:</Text>
                  <Text style={styles.metaValue}>{recipe.servings}</Text>
                </View>
              )}

              {recipe.ingredients.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Ingredients</Text>
                  {recipe.ingredients.map((ingredient, idx) => (
                    <View key={idx} style={styles.ingredientRow}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.ingredientText}>{ingredient}</Text>
                    </View>
                  ))}
                </View>
              )}

              {recipe.instructions.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  {recipe.instructions.map((step, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <Text style={styles.stepNumber}>{idx + 1}.</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}

              {url && (
                <Pressable style={styles.linkBtn} onPress={onOpenOriginal}>
                  <Text style={styles.linkBtnText}>Open Original Recipe</Text>
                </Pressable>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={StyleSheet.flatten([styles.importBtn, importing && styles.importBtnDisabled])}
                onPress={onImport}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.importBtnText}>Import to My Recipes</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xl,
    },
    loadingText: {
      color: colors.textMuted,
      marginTop: space.md,
      fontSize: 14,
    },
    errorText: {
      color: colors.error,
      fontSize: 16,
      textAlign: 'center',
      marginBottom: space.lg,
    },
    retryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      borderRadius: 8,
      marginBottom: space.sm,
    },
    retryBtnText: {
      color: colors.onPrimary,
      fontWeight: '600',
      fontSize: 15,
    },
    secondaryBtn: {
      backgroundColor: colors.chip,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      borderRadius: 8,
    },
    secondaryBtnText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 15,
    },
    scroll: {
      padding: space.md,
      paddingBottom: 100, // Space for footer
    },
    recipeTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: space.sm,
    },
    recipeDescription: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 22,
      marginBottom: space.md,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: space.sm,
    },
    metaLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginRight: space.xs,
    },
    metaValue: {
      fontSize: 14,
      color: colors.textMuted,
    },
    section: {
      marginTop: space.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: space.sm,
    },
    ingredientRow: {
      flexDirection: 'row',
      marginBottom: space.xs,
    },
    bullet: {
      color: colors.primary,
      fontSize: 16,
      marginRight: space.sm,
      lineHeight: 22,
    },
    ingredientText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    stepRow: {
      flexDirection: 'row',
      marginBottom: space.md,
    },
    stepNumber: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
      marginRight: space.sm,
      minWidth: 24,
    },
    stepText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    linkBtn: {
      backgroundColor: colors.chip,
      paddingVertical: space.md,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: space.lg,
    },
    linkBtnText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 15,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: space.md,
    },
    importBtn: {
      backgroundColor: colors.primary,
      paddingVertical: space.md,
      borderRadius: 8,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    importBtnDisabled: {
      opacity: 0.6,
    },
    importBtnText: {
      color: colors.onPrimary,
      fontWeight: '700',
      fontSize: 16,
    },
  });
