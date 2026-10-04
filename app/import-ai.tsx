import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { parseAiRecipeResponse } from '../src/parse/aiRecipeParser';
import { parseIngredientLine } from '../src/parse/ingredientParse';
import { newId } from '../src/domain/ids';
import * as repo from '../src/storage/recipeRepo';
import { useRecipeStore } from '../src/store/recipeStore';
import { useTheme, space, type ThemeColors } from '../src/ui/theme';

const AI_PROMPT = `Please read the recipe and reply with ONLY a single Schema.org Recipe JSON-LD object.

Requirements:
- Use the Schema.org Recipe format (https://schema.org/Recipe)
- Include: name, description, recipeYield, prepTime/cookTime/totalTime (as ISO 8601 durations, e.g., "PT30M"), recipeIngredient (array of strings), recipeInstructions (as HowToStep array with "text" and "position" fields), cookingMethod (for oven settings and cooking notes), and optional keywords/recipeCategory
- Do NOT invent quantities or measurements - if text is unreadable or unclear, mark it as [unclear]
- Keep original units (cups, grams, teaspoons, etc.) - do not convert

For recipeInstructions:
- Emit one HowToStep per numbered method line. Do NOT merge multiple steps together. Do NOT return recipeInstructions as a single string.
- Set "position" to the printed step number (1, 2, 3, etc.) and copy ONLY that step's text into "text"
- Use HowToSection ONLY when the recipe has named sections (e.g., "Pastry", "Filling", "Sauce"). A plain numbered method list should be a flat array of HowToStep objects.
- Put oven temperature, shelf position, and general cooking notes in the "cookingMethod" field, NOT inside a step
- If there are additional notes that don't fit in cookingMethod, create a final HowToStep with name "Note"

Reply with ONLY the JSON object - no explanations, no markdown fences, no extra text.

Example format:
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Recipe Name",
  "description": "Brief description",
  "recipeYield": "4 servings",
  "prepTime": "PT15M",
  "cookTime": "PT30M",
  "totalTime": "PT45M",
  "recipeIngredient": [
    "2 cups flour",
    "1 tsp salt"
  ],
  "recipeInstructions": [
    {
      "@type": "HowToStep",
      "position": 1,
      "text": "Mix flour and salt in a bowl"
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "text": "Add water and stir until combined"
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "text": "Bake until golden"
    }
  ],
  "recipeCategory": "Dinner",
  "keywords": "quick, easy",
  "cookingMethod": "Bake at 350°F (180°C) on middle rack for 30 minutes"
}

Now, please provide the recipe in this format:`;

export default function ImportAiScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const refresh = useRecipeStore((s) => s.refresh);

  const [aiResponse, setAiResponse] = useState('');
  const [busy, setBusy] = useState(false);

  const onCopyPrompt = async () => {
    try {
      await Clipboard.setStringAsync(AI_PROMPT);
      Alert.alert('Copied', 'Prompt copied to clipboard. Paste it into ChatGPT, Claude, or any AI.');
    } catch (e) {
      Alert.alert('Copy failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const onSharePrompt = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing unavailable', 'Share is not available on this platform.');
        return;
      }
      const tempUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}ai-prompt.txt`;
      await FileSystem.writeAsStringAsync(tempUri, AI_PROMPT);
      await Sharing.shareAsync(tempUri);
    } catch (e) {
      Alert.alert('Share failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const onPasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) {
        Alert.alert('Clipboard empty', 'No text found in clipboard.');
        return;
      }
      setAiResponse(text);
    } catch (e) {
      Alert.alert('Paste failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const onImport = async () => {
    if (!aiResponse.trim()) {
      Alert.alert('Input required', 'Please paste the AI response first.');
      return;
    }

    setBusy(true);
    try {
      const data = parseAiRecipeResponse(aiResponse.trim());
      const created = await repo.createRecipe({
        title: data.title,
        description: data.description,
        notes: data.notes,
        servings: data.servings && data.servings > 0 ? data.servings : 4,
        ingredients: data.ingredients.map((line) => parseIngredientLine(line)),
        steps: data.instructions.map((text, order) => ({ id: newId(), text, order })),
        photos: [],
        sourceUrl: 'AI import',
      });
      await refresh();
      router.replace(`/recipe/edit?id=${created.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      Alert.alert('Import failed', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Import with AI</Text>
      <Text style={styles.help}>
        Use ChatGPT, Claude, Gemini, or any AI to convert recipes from text or photos into
        structured JSON. Completely offline after you get the AI response — no API keys needed.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 1: Copy the prompt</Text>
        <Text style={styles.sectionBody}>
          Copy the prompt below and paste it into your preferred AI (ChatGPT, Claude, Gemini, or a
          local model). Then either type the recipe or attach a photo of a cookbook page.
        </Text>
        <View style={styles.btnRow}>
          <Pressable style={styles.btnPrimary} onPress={() => void onCopyPrompt()}>
            <Text style={styles.btnPrimaryText}>Copy prompt</Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={() => void onSharePrompt()}>
            <Text style={styles.btnSecondaryText}>Share prompt</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 2: Paste AI response</Text>
        <Text style={styles.sectionBody}>
          The AI will reply with JSON. Copy that entire response and paste it here.
        </Text>
        <Pressable style={styles.btnSecondary} onPress={() => void onPasteFromClipboard()}>
          <Text style={styles.btnSecondaryText}>Paste from clipboard</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          value={aiResponse}
          onChangeText={setAiResponse}
          placeholder="Paste the AI's JSON response here..."
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />
      </View>

      <Pressable
        style={StyleSheet.flatten([styles.btnImport, busy && styles.btnDisabled])}
        onPress={() => void onImport()}
        disabled={busy || !aiResponse.trim()}
      >
        {busy ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.btnImportText}>Import recipe</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: { padding: space.md, paddingBottom: 48, backgroundColor: colors.bg },
    heading: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: space.sm,
    },
    help: {
      color: colors.textMuted,
      marginBottom: space.lg,
      lineHeight: 20,
    },
    section: {
      marginBottom: space.lg,
      padding: space.md,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: space.sm,
    },
    sectionBody: {
      color: colors.textMuted,
      marginBottom: space.md,
      lineHeight: 18,
    },
    btnRow: {
      flexDirection: 'row',
      gap: space.sm,
    },
    btnPrimary: {
      flex: 1,
      backgroundColor: colors.primary,
      padding: space.sm,
      borderRadius: 10,
      alignItems: 'center',
    },
    btnPrimaryText: {
      color: colors.onPrimary,
      fontWeight: '600',
    },
    btnSecondary: {
      flex: 1,
      backgroundColor: colors.chip,
      padding: space.sm,
      borderRadius: 10,
      alignItems: 'center',
    },
    btnSecondaryText: {
      color: colors.text,
      fontWeight: '600',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      backgroundColor: colors.bg,
      marginTop: space.sm,
      minHeight: 200,
      color: colors.text,
      fontSize: 13,
      fontFamily: 'monospace',
    },
    btnImport: {
      backgroundColor: colors.primary,
      padding: space.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    btnDisabled: { opacity: 0.6 },
    btnImportText: {
      color: colors.onPrimary,
      fontWeight: '700',
      fontSize: 16,
    },
  });
