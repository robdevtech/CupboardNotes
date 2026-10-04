import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Ingredient, RecipeDraft, RecipePhoto, RecipeStep } from '../../src/domain/types';
import { newId } from '../../src/domain/ids';
import { parseIngredientLine } from '../../src/parse/ingredientParse';
import * as repo from '../../src/storage/recipeRepo';
import { captureFromCamera, pickFromGallery } from '../../src/storage/photos';
import { PhotoGallery } from '../../src/ui/PhotoGallery';
import { useRecipeStore } from '../../src/store/recipeStore';
import { useTheme, space, type ThemeColors } from '../../src/ui/theme';

function linesToSteps(text: string): RecipeStep[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((text, order) => ({ id: newId(), text, order }));
}

export default function RecipeEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const refresh = useRecipeStore((s) => s.refresh);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [servings, setServings] = useState('4');
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [photos, setPhotos] = useState<RecipePhoto[]>([]);
  const [fixedIds, setFixedIds] = useState<Record<string, boolean>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await repo.getRecipe(id);
      if (!r) {
        Alert.alert('Not found');
        router.back();
        return;
      }
      setTitle(r.title);
      setDescription(r.description ?? '');
      setNotes(r.notes ?? '');
      setServings(String(r.servings));
      setIngredientsText(r.ingredients.map((i) => i.raw).join('\n'));
      setStepsText(
        r.steps
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s) => s.text)
          .join('\n')
      );
      setSourceUrl(r.sourceUrl ?? '');
      setPhotos(r.photos);
      setTags(r.tags || []);
      const flags: Record<string, boolean> = {};
      r.ingredients.forEach((i) => {
        if (i.scaleMode === 'fixed') flags[i.raw] = true;
      });
      setFixedIds(flags);
      setLoading(false);
    })();
  }, [id, router]);

  const buildIngredients = (): Ingredient[] => {
    return ingredientsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parsed = parseIngredientLine(line);
        if (fixedIds[line]) {
          parsed.scaleMode = 'fixed';
        }
        return parsed;
      });
  };

  const toggleFixedForLine = (line: string) => {
    setFixedIds((prev) => ({ ...prev, [line]: !prev[line] }));
  };

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required');
      return;
    }
    setSaving(true);
    try {
      const draft: RecipeDraft = {
        title,
        description: description.trim() || null,
        notes: notes.trim() || null,
        servings: parseFloat(servings) || 1,
        ingredients: buildIngredients(),
        steps: linesToSteps(stepsText),
        photos,
        sourceUrl: sourceUrl.trim() || null,
        tags,
      };
      if (id) {
        await repo.updateRecipe(id, draft);
      } else {
        const created = await repo.createRecipe(draft);
        await refresh();
        router.replace(`/recipe/${created.id}`);
        return;
      }
      await refresh();
      router.back();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const addCamera = async () => {
    try {
      const photo = await captureFromCamera();
      if (photo) setPhotos((p) => [...p, photo]);
    } catch (e) {
      Alert.alert('Camera', e instanceof Error ? e.message : 'Failed');
    }
  };

  const addGallery = async () => {
    try {
      const photo = await pickFromGallery();
      if (photo) setPhotos((p) => [...p, photo]);
    } catch (e) {
      Alert.alert('Gallery', e instanceof Error ? e.message : 'Failed');
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  }

  const previewLines = ingredientsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const presetTags = ['breakfast', 'lunch', 'dinner', 'coffee', 'party'];

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const addCustomTag = () => {
    const trimmed = customTagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setCustomTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Weeknight pasta" />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Short summary"
        multiline
      />
      <Field
        label="Servings (base)"
        value={servings}
        onChangeText={setServings}
        keyboardType="decimal-pad"
      />
      <Field
        label="Ingredients (one per line)"
        value={ingredientsText}
        onChangeText={setIngredientsText}
        placeholder={'2 cups flour\n1 tsp salt\na pinch of salt'}
        multiline
        tall
      />

      {previewLines.length > 0 ? (
        <View style={styles.fixedPanel}>
          <Text style={styles.fixedTitle}>Mark fixed (non-linear) ingredients</Text>
          {previewLines.map((line) => (
            <View key={line} style={styles.fixedRow}>
              <Text style={styles.fixedLine} numberOfLines={1}>
                {line}
              </Text>
              <Switch
                value={!!fixedIds[line]}
                onValueChange={() => toggleFixedForLine(line)}
              />
            </View>
          ))}
        </View>
      ) : null}

      <Field
        label="Steps (one per line)"
        value={stepsText}
        onChangeText={setStepsText}
        placeholder={'Boil water\nCook pasta\nServe'}
        multiline
        tall
      />
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Substitutions, timing, kitchen notes…"
        multiline
      />
      <Field
        label="Source URL"
        value={sourceUrl}
        onChangeText={setSourceUrl}
        placeholder="https://…"
        autoCapitalize="none"
      />

      <View style={styles.field}>
        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagsSection}>
          <View style={styles.tagsRow}>
            {presetTags.map((tag) => (
              <Pressable
                key={tag}
                style={StyleSheet.flatten([
                  styles.tag,
                  tags.includes(tag) && styles.tagSelected,
                ])}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={StyleSheet.flatten([
                    styles.tagText,
                    tags.includes(tag) && styles.tagTextSelected,
                  ])}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
          {tags.filter((t) => !presetTags.includes(t)).map((tag) => (
            <Pressable
              key={tag}
              style={StyleSheet.flatten([styles.tag, styles.tagSelected])}
              onPress={() => removeTag(tag)}
            >
              <Text style={styles.tagTextSelected}>{tag}</Text>
              <Text style={styles.tagRemove}> ×</Text>
            </Pressable>
          ))}
          <View style={styles.customTagRow}>
            <TextInput
              style={styles.customTagInput}
              value={customTagInput}
              onChangeText={setCustomTagInput}
              placeholder="Add custom tag"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              onSubmitEditing={addCustomTag}
            />
            <Pressable
              style={styles.customTagBtn}
              onPress={addCustomTag}
              disabled={!customTagInput.trim()}
            >
              <Text style={styles.customTagBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <PhotoGallery
        photos={photos}
        editable
        onAddCamera={() => void addCamera()}
        onAddGallery={() => void addGallery()}
        onRemove={(pid) => setPhotos((p) => p.filter((x) => x.id !== pid))}
      />

      <Pressable style={styles.save} onPress={() => void onSave()} disabled={saving}>
        <Text style={styles.saveText}>{saving ? 'Saving…' : id ? 'Save changes' : 'Create recipe'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  tall,
  ...props
}: {
  label: string;
  tall?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={StyleSheet.flatten([styles.input, props.multiline && styles.multiline, tall && styles.tall])}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scroll: { padding: space.md, paddingBottom: 48, backgroundColor: colors.bg },
  field: { marginBottom: space.md },
  label: { fontWeight: '600', marginBottom: 6, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: space.sm,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  tall: { minHeight: 120 },
  save: {
    backgroundColor: colors.primary,
    padding: space.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: space.md,
  },
  saveText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
  fixedPanel: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: space.sm,
    marginBottom: space.md,
  },
  fixedTitle: { fontWeight: '600', marginBottom: space.sm, color: colors.primary },
  fixedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginBottom: 4,
  },
  fixedLine: { flex: 1, fontSize: 13, color: colors.text },
  tagsSection: { gap: space.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tagText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  tagTextSelected: { color: colors.primary, fontWeight: '600' },
  tagRemove: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  customTagRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  customTagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 14,
  },
  customTagBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTagBtnText: { fontSize: 20, color: colors.onPrimary, fontWeight: '700' },
});
