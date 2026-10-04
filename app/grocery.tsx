import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useRecipeStore } from '../src/store/recipeStore';
import { useGroceryStore, type GroceryItem } from '../src/store/groceryStore';
import { useTheme, space, type ThemeColors } from '../src/ui/theme';
import type { Recipe } from '../src/domain/types';

export default function GroceryListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const recipes = useRecipeStore((s) => s.recipes);
  const refresh = useRecipeStore((s) => s.refresh);
  const { items, toggleItem, removeItem, clearAll, clearChecked, addFromRecipe } = useGroceryStore();
  const [showRecipePicker, setShowRecipePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const onAddRecipe = (recipe: Recipe) => {
    addFromRecipe(recipe.id, recipe.title, recipe.ingredients);
    setShowRecipePicker(false);
  };

  const onClearAll = () => {
    Alert.alert('Clear all items?', 'This will remove all grocery items.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearAll },
    ]);
  };

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  const renderItem = ({ item }: { item: GroceryItem }) => (
    <Pressable
      style={styles.itemRow}
      onPress={() => toggleItem(item.id)}
      onLongPress={() => {
        Alert.alert('Remove item?', item.text, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.id) },
        ]);
      }}
    >
      <View style={styles.checkbox}>
        {item.checked ? <View style={styles.checkboxInner} /> : null}
      </View>
      <Text style={StyleSheet.flatten([styles.itemText, item.checked && styles.itemTextChecked])}>
        {item.text}
      </Text>
    </Pressable>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Grocery List' }} />
      <View style={styles.screen}>
        <View style={styles.toolbar}>
          <Pressable
            style={StyleSheet.flatten([styles.toolBtn, styles.primaryBtn])}
            onPress={() => setShowRecipePicker(true)}
          >
            <Text style={StyleSheet.flatten([styles.toolBtnText, styles.primaryBtnText])}>
              Add from recipe
            </Text>
          </Pressable>
          {checkedItems.length > 0 ? (
            <Pressable style={styles.toolBtn} onPress={clearChecked}>
              <Text style={styles.toolBtnText}>Clear checked</Text>
            </Pressable>
          ) : null}
          {items.length > 0 ? (
            <Pressable style={styles.toolBtn} onPress={onClearAll}>
              <Text style={styles.toolBtnText}>Clear all</Text>
            </Pressable>
          ) : null}
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No grocery items yet</Text>
            <Text style={styles.emptyBody}>
              Tap "Add from recipe" to generate a shopping list from your recipes.
            </Text>
          </View>
        ) : (
          <FlatList
            data={[...uncheckedItems, ...checkedItems]}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}

        <Modal
          visible={showRecipePicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowRecipePicker(false)}
        >
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Recipe</Text>
              <Pressable onPress={() => setShowRecipePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={recipes}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) => (
                <Pressable style={styles.recipeRow} onPress={() => onAddRecipe(item)}>
                  <Text style={styles.recipeTitle}>{item.title}</Text>
                  <Text style={styles.recipeMeta}>
                    {item.ingredients.length} ingredients
                  </Text>
                </Pressable>
              )}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </Modal>
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      backgroundColor: colors.surface,
      padding: space.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 56,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxInner: {
      width: 16,
      height: 16,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    itemText: { flex: 1, fontSize: 15, color: colors.text },
    itemTextChecked: { textDecorationLine: 'line-through', opacity: 0.5 },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xl,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: space.sm, color: colors.text },
    emptyBody: { textAlign: 'center', color: colors.textMuted, lineHeight: 20 },
    modal: { flex: 1, backgroundColor: colors.bg },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: space.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    modalClose: { fontSize: 16, fontWeight: '600', color: colors.primary },
    modalList: { padding: space.md, gap: space.sm },
    recipeRow: {
      backgroundColor: colors.surface,
      padding: space.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recipeTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
    recipeMeta: { fontSize: 13, color: colors.textMuted },
  });
