import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRecipeStore } from '../src/store/recipeStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { ThemeProvider, useTheme } from '../src/ui/theme';

export default function RootLayout() {
  const loadRecipes = useRecipeStore((s) => s.loadRecipes);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    void loadRecipes();
    void hydrateSettings();
  }, [loadRecipes, hydrateSettings]);

  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Cupboard Notes' }} />
        <Stack.Screen name="recipe/[id]" options={{ title: 'Recipe' }} />
        <Stack.Screen name="recipe/edit" options={{ title: 'Edit recipe', presentation: 'modal' }} />
        <Stack.Screen name="import" options={{ title: 'Import from URL', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Cloud & settings' }} />
      </Stack>
    </>
  );
}
