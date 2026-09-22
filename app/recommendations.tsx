import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme, space, type ThemeColors } from '../src/ui/theme';
import { importRecipeFromUrl } from '../src/parse/htmlFetch';
import { parseIngredientLine } from '../src/parse/ingredientParse';
import { newId } from '../src/domain/ids';
import { photosFromImportUrls } from '../src/storage/photos';
import * as repo from '../src/storage/recipeRepo';
import { useRecipeStore } from '../src/store/recipeStore';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
}

interface RecommendationsFeed {
  version: string;
  updatedAt: string;
  season: string;
  recommendations: Recommendation[];
}

const FEED_URL =
  'https://raw.githubusercontent.com/robdevtech/CupboardNotes/main/recommendations.json';

export default function RecommendationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const refresh = useRecipeStore((s) => s.refresh);
  const [feed, setFeed] = useState<RecommendationsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      // Try to load from remote first, fallback to local
      let feedData: RecommendationsFeed;
      
      try {
        const response = await fetch(FEED_URL);
        if (response.ok) {
          feedData = await response.json();
        } else {
          throw new Error('Failed to fetch');
        }
      } catch (e) {
        // Fallback to local bundled feed
        feedData = require('../recommendations.json');
      }
      
      setFeed(feedData);
    } catch (e) {
      Alert.alert('Failed to load recommendations', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const onImportRecipe = async (rec: Recommendation) => {
    setImporting(rec.id);
    try {
      const data = await importRecipeFromUrl(rec.url);
      const photos = await photosFromImportUrls(data.imageUrls);
      const created = await repo.createRecipe({
        title: data.title,
        description: data.description,
        notes: null,
        servings: data.servings && data.servings > 0 ? data.servings : 4,
        ingredients: data.ingredients.map((line) => parseIngredientLine(line)),
        steps: data.instructions.map((text, order) => ({ id: newId(), text, order })),
        photos,
        sourceUrl: data.sourceUrl ?? rec.url,
        tags: rec.tags,
      });
      await refresh();
      Alert.alert('Recipe imported!', `"${created.title}" added to your collection.`, [
        { text: 'View', onPress: () => router.push(`/recipe/${created.id}`) },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert(
        'Import failed',
        `${rec.title}\n\n${e instanceof Error ? e.message : 'Could not import this recipe.'}\n\nTry importing manually via URL.`
      );
    } finally {
      setImporting(null);
    }
  };

  const renderItem = ({ item }: { item: Recommendation }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.description}>{item.description}</Text>
      {item.tags.length > 0 && (
        <View style={styles.tags}>
          {item.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      <Pressable
        style={StyleSheet.flatten([styles.importBtn, importing === item.id && styles.importBtnDisabled])}
        onPress={() => void onImportRecipe(item)}
        disabled={importing !== null}
      >
        {importing === item.id ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.importBtnText}>Import Recipe</Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Recommendations' }} />
      <View style={styles.screen}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : feed ? (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{feed.season}</Text>
              <Text style={styles.headerSubtitle}>
                Curated recipes to try · Updated {new Date(feed.updatedAt).toLocaleDateString()}
              </Text>
            </View>
            <FlatList
              data={feed.recommendations}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
            />
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No recommendations available</Text>
            <Pressable onPress={loadFeed} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: {
      backgroundColor: colors.surface,
      padding: space.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    list: { padding: space.md, gap: space.md },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.md,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: space.sm,
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, paddingRight: space.sm },
    categoryBadge: {
      backgroundColor: colors.chip,
      paddingHorizontal: space.sm,
      paddingVertical: 4,
      borderRadius: 12,
    },
    categoryText: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
    description: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: space.sm },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: space.md },
    tag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
    },
    tagText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
    importBtn: {
      backgroundColor: colors.primary,
      paddingVertical: space.sm,
      borderRadius: 8,
      alignItems: 'center',
      minHeight: 40,
      justifyContent: 'center',
    },
    importBtnDisabled: { opacity: 0.6 },
    importBtnText: { fontSize: 15, fontWeight: '700', color: colors.onPrimary },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xl,
    },
    emptyText: { fontSize: 16, color: colors.textMuted, marginBottom: space.md },
    retryBtn: {
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    retryBtnText: { fontSize: 15, fontWeight: '600', color: colors.onPrimary },
  });
