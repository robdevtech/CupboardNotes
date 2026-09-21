import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
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

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

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
        </View>
      </Pressable>
    );
  };

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
        <Link href="/settings" asChild>
          <Pressable style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>Cloud</Text>
          </Pressable>
        </Link>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && recipes.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={recipes.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No recipes yet</Text>
              <Text style={styles.emptyBody}>
                Create one manually or import from a recipe page that publishes schema.org JSON-LD.
                Cupboard Notes keeps everything on-device in SQLite — offline-first for the kitchen.
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
});
