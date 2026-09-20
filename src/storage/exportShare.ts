import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Share, Platform } from 'react-native';
import type { Recipe, RecipeExport } from '../domain/types';

export function toExportPayload(recipe: Recipe): RecipeExport {
  return {
    format: 'cupboard-notes/v1',
    exportedAt: new Date().toISOString(),
    recipe,
  };
}

/**
 * Share recipe as JSON via OS share sheet (expo-sharing) with Share API fallback.
 */
export async function shareRecipeAsJson(recipe: Recipe): Promise<void> {
  const payload = toExportPayload(recipe);
  const json = JSON.stringify(payload, null, 2);
  const safeName = recipe.title.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'recipe';
  const fileName = `${safeName}.recipe.json`;

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? null;

  if (baseDir && (await Sharing.isAvailableAsync())) {
    const path = `${baseDir}${fileName}`;
    await FileSystem.writeAsStringAsync(path, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: `Share ${recipe.title}`,
      UTI: 'public.json',
    });
    return;
  }

  await Share.share({
    title: recipe.title,
    message: Platform.OS === 'ios' ? json : `${recipe.title}\n\n${json}`,
  });
}
