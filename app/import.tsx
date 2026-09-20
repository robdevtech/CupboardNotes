import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { importRecipeFromUrl } from '../src/parse/htmlFetch';
import { parseIngredientLine } from '../src/parse/ingredientParse';
import { newId } from '../src/domain/ids';
import { photosFromImportUrls } from '../src/storage/photos';
import * as repo from '../src/storage/recipeRepo';
import { useRecipeStore } from '../src/store/recipeStore';
import { useTheme, space, type ThemeColors } from '../src/ui/theme';

export default function ImportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const refresh = useRecipeStore((s) => s.refresh);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteIngredients, setPasteIngredients] = useState('');
  const [pasteSteps, setPasteSteps] = useState('');

  const onImport = async () => {
    setBusy(true);
    try {
      const data = await importRecipeFromUrl(url.trim());
      const photos = await photosFromImportUrls(data.imageUrls);
      const created = await repo.createRecipe({
        title: data.title,
        description: data.description,
        notes: null,
        servings: data.servings && data.servings > 0 ? data.servings : 4,
        ingredients: data.ingredients.map((line) => parseIngredientLine(line)),
        steps: data.instructions.map((text, order) => ({ id: newId(), text, order })),
        photos,
        sourceUrl: data.sourceUrl ?? url.trim(),
      });
      await refresh();
      router.replace(`/recipe/${created.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      Alert.alert('Import failed', `${msg}\n\nYou can paste the recipe manually instead.`, [
        { text: 'Paste manually', onPress: () => setPasteMode(true) },
        { text: 'OK' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onPasteSave = async () => {
    if (!pasteTitle.trim()) {
      Alert.alert('Title required');
      return;
    }
    setBusy(true);
    try {
      const created = await repo.createRecipe({
        title: pasteTitle,
        description: null,
        notes: null,
        servings: 4,
        ingredients: pasteIngredients
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => parseIngredientLine(l)),
        steps: pasteSteps
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .map((text, order) => ({ id: newId(), text, order })),
        photos: [],
        sourceUrl: url.trim() || null,
      });
      await refresh();
      router.replace(`/recipe/${created.id}`);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.help}>
        Fetches HTTPS HTML on-device and extracts schema.org Recipe JSON-LD (including images).
        No backend. If the page has no Recipe JSON-LD, paste manually.
      </Text>
      <Text style={styles.label}>Recipe URL (HTTPS)</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="https://example.com/recipe/…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholderTextColor={colors.textMuted}
      />
      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        onPress={() => void onImport()}
        disabled={busy || !url.trim()}
      >
        {busy ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.btnText}>Import JSON-LD</Text>
        )}
      </Pressable>

      <Pressable onPress={() => setPasteMode((v) => !v)} style={styles.linkBtn}>
        <Text style={styles.link}>{pasteMode ? 'Hide paste form' : 'Paste / enter manually'}</Text>
      </Pressable>

      {pasteMode ? (
        <View style={styles.paste}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={pasteTitle} onChangeText={setPasteTitle} />
          <Text style={styles.label}>Ingredients (one per line)</Text>
          <TextInput
            style={[styles.input, styles.tall]}
            value={pasteIngredients}
            onChangeText={setPasteIngredients}
            multiline
          />
          <Text style={styles.label}>Steps (one per line)</Text>
          <TextInput
            style={[styles.input, styles.tall]}
            value={pasteSteps}
            onChangeText={setPasteSteps}
            multiline
          />
          <Pressable style={styles.btn} onPress={() => void onPasteSave()} disabled={busy}>
            <Text style={styles.btnText}>Save pasted recipe</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scroll: { padding: space.md, paddingBottom: 48, backgroundColor: colors.bg },
  help: { color: colors.textMuted, marginBottom: space.md, lineHeight: 20 },
  label: { fontWeight: '600', marginBottom: 6, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    marginBottom: space.md,
    color: colors.text,
  },
  tall: { minHeight: 100, textAlignVertical: 'top' },
  btn: {
    backgroundColor: colors.primary,
    padding: space.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.onPrimary, fontWeight: '700' },
  linkBtn: { marginTop: space.lg, alignItems: 'center' },
  link: { color: colors.primary, fontWeight: '600' },
  paste: { marginTop: space.md },
});
