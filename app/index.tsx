import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { useRecipeStore } from '../src/store/recipeStore';
import { useTheme, space, type ThemeColors } from '../src/ui/theme';
import type { Recipe } from '../src/domain/types';
import { photoDisplayUri } from '../src/storage/photos';
import { Image } from 'react-native';

export default function RecipeListScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { recipes, loading, error, refresh } = useRecipeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [includeTags, setIncludeTags] = useState<string[]>([]);
  const [excludeTags, setExcludeTags] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  // Get all unique tags from recipes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach((r) => r.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [recipes]);

  // Filter recipes by search query and tags
  const filteredRecipes = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return recipes.filter((recipe) => {
      // Text search
      if (query) {
        const titleMatch = recipe.title.toLowerCase().includes(query);
        const descMatch = recipe.description?.toLowerCase().includes(query);
        const notesMatch = recipe.notes?.toLowerCase().includes(query);
        const ingredientMatch = recipe.ingredients.some((i) =>
          i.raw.toLowerCase().includes(query)
        );
        if (!titleMatch && !descMatch && !notesMatch && !ingredientMatch) {
          return false;
        }
      }

      // Include tags filter (recipe must have ALL included tags)
      if (includeTags.length > 0) {
        const recipeTags = recipe.tags || [];
        if (!includeTags.every((tag) => recipeTags.includes(tag))) {
          return false;
        }
      }

      // Exclude tags filter (recipe must have NONE of the excluded tags)
      if (excludeTags.length > 0) {
        const recipeTags = recipe.tags || [];
        if (excludeTags.some((tag) => recipeTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }, [recipes, searchQuery, includeTags, excludeTags]);

  const toggleIncludeTag = (tag: string) => {
    setIncludeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    // Remove from exclude if present
    setExcludeTags((prev) => prev.filter((t) => t !== tag));
  };

  const toggleExcludeTag = (tag: string) => {
    setExcludeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    // Remove from include if present
    setIncludeTags((prev) => prev.filter((t) => t !== tag));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setIncludeTags([]);
    setExcludeTags([]);
  };

  const renderItem = ({ item }: { item: Recipe }) => {
    const thumb = item.photos[0] ? photoDisplayUri(item.photos[0]) : null;
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/recipe/${item.id}`)}
      >
        {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} /> : <View style={StyleSheet.flatten([styles.thumb, styles.thumbEmpty])} />}
        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.meta}>
            {item.servings} servings · {item.ingredients.length} ingredients
          </Text>
          {item.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          {item.tags && item.tags.length > 0 ? (
            <View style={styles.tagRow}>
              {item.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {item.tags.length > 3 ? (
                <Text style={styles.tagMore}>+{item.tags.length - 3}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const hasActiveFilters = searchQuery || includeTags.length > 0 || excludeTags.length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <Link href="/import" asChild>
          <Pressable style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>Import URL</Text>
          </Pressable>
        </Link>
        <Link href={{ pathname: '/recipe/edit' }} asChild>
          <Pressable style={StyleSheet.flatten([styles.toolBtn, styles.primaryBtn])}>
            <Text style={StyleSheet.flatten([styles.toolBtnText, styles.primaryBtnText])}>New recipe</Text>
          </Pressable>
        </Link>
        <Link href="/grocery" asChild>
          <Pressable style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>Grocery</Text>
          </Pressable>
        </Link>
        <Link href="/recommendations" asChild>
          <Pressable style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>Discover</Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>Sync</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search recipes, ingredients..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          style={StyleSheet.flatten([
            styles.filterBtn,
            (includeTags.length > 0 || excludeTags.length > 0) && styles.filterBtnActive,
          ])}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text
            style={StyleSheet.flatten([
              styles.filterBtnText,
              (includeTags.length > 0 || excludeTags.length > 0) && styles.filterBtnTextActive,
            ])}
          >
            Filter
          </Text>
        </Pressable>
        {hasActiveFilters ? (
          <Pressable style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {showFilters && allTags.length > 0 ? (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Include tags (tap):</Text>
          <View style={styles.filterTagsRow}>
            {allTags.map((tag) => (
              <Pressable
                key={`inc-${tag}`}
                style={StyleSheet.flatten([
                  styles.filterTag,
                  includeTags.includes(tag) && styles.filterTagInclude,
                ])}
                onPress={() => toggleIncludeTag(tag)}
              >
                <Text
                  style={StyleSheet.flatten([
                    styles.filterTagText,
                    includeTags.includes(tag) && styles.filterTagTextInclude,
                  ])}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.filterLabel}>Exclude tags (long press):</Text>
          <View style={styles.filterTagsRow}>
            {allTags.map((tag) => (
              <Pressable
                key={`exc-${tag}`}
                style={StyleSheet.flatten([
                  styles.filterTag,
                  excludeTags.includes(tag) && styles.filterTagExclude,
                ])}
                onLongPress={() => toggleExcludeTag(tag)}
              >
                <Text
                  style={StyleSheet.flatten([
                    styles.filterTagText,
                    excludeTags.includes(tag) && styles.filterTagTextExclude,
                  ])}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && recipes.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={filteredRecipes.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {hasActiveFilters ? 'No matching recipes' : 'No recipes yet'}
              </Text>
              <Text style={styles.emptyBody}>
                {hasActiveFilters
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Create one manually or import from a recipe page that publishes schema.org JSON-LD. Cupboard Notes keeps everything on-device in SQLite — offline-first for the kitchen.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolBtn: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 8,
    backgroundColor: colors.chip,
  },
  toolBtnText: { color: colors.text, fontWeight: '600' },
  primaryBtn: { backgroundColor: colors.primary },
  primaryBtnText: { color: colors.onPrimary },
  list: { padding: space.md, gap: space.sm },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: space.sm,
  },
  thumb: { width: 88, height: 88 },
  thumbEmpty: { backgroundColor: colors.chip },
  cardBody: { flex: 1, padding: space.sm, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  error: { color: colors.danger, padding: space.md },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: space.xl },
  empty: { alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: space.sm, color: colors.text },
  emptyBody: { textAlign: 'center', color: colors.textMuted, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
  },
  tagText: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  tagMore: { fontSize: 10, color: colors.textMuted, fontWeight: '600', paddingVertical: 2 },
  searchSection: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 8,
    backgroundColor: colors.chip,
    color: colors.text,
    fontSize: 15,
  },
  filterBtn: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 8,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterBtnText: { fontWeight: '600', color: colors.text },
  filterBtnTextActive: { color: colors.primary },
  clearBtn: {
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  clearBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  filterPanel: {
    padding: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: space.sm,
  },
  filterLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  filterTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTagInclude: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterTagExclude: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  filterTagText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  filterTagTextInclude: { color: colors.primary, fontWeight: '600' },
  filterTagTextExclude: { color: colors.danger, fontWeight: '600' },
});
