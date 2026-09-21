import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Switch, Alert, Platform } from 'react-native';
import { listAdapters } from '../src/cloud/registry';
import type { CloudProviderId } from '../src/cloud/CloudStorageAdapter';
import { useSettingsStore } from '../src/store/settingsStore';
import { useTheme, space, type ThemeColors, type ThemeMode } from '../src/ui/theme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const adapters = listAdapters();
  const { enabledProviders, toggleProvider, themePreference, setThemePreference } = useSettingsStore();
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const map: Record<string, boolean> = {};
      for (const a of adapters) {
        try {
          map[a.id] = await a.isConnected();
        } catch {
          map[a.id] = false;
        }
      }
      setConnected(map);
    })();
  }, [adapters]);

  const onConnect = async (id: CloudProviderId) => {
    const adapter = adapters.find((a) => a.id === id);
    if (!adapter) return;
    if (!adapter.available) {
      Alert.alert(
        adapter.displayName,
        Platform.OS === 'android' && id === 'iCloud'
          ? 'iCloud Drive is limited to iOS / Apple platforms. It is stubbed gracefully here.'
          : 'This provider is unavailable on this platform.'
      );
      return;
    }
    try {
      const session = await adapter.connect();
      setConnected((c) => ({ ...c, [id]: true }));
      if (!enabledProviders.includes(id)) toggleProvider(id);
      Alert.alert(
        'Connected',
        `${adapter.displayName} connected successfully!${session.accountLabel ? `\n\nAccount: ${session.accountLabel}` : ''}`
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Connection failed';
      const isDeveloperError = errorMessage.includes('developer setup') || errorMessage.includes('not configured');
      
      Alert.alert(
        adapter.displayName,
        isDeveloperError 
          ? errorMessage
          : `Failed to connect to ${adapter.displayName}. Please try again.\n\n${errorMessage}`
      );
    }
  };

  const onDisconnect = async (id: CloudProviderId) => {
    const adapter = adapters.find((a) => a.id === id);
    if (!adapter) return;
    await adapter.disconnect();
    setConnected((c) => ({ ...c, [id]: false }));
  };

  const onSync = async (id: CloudProviderId) => {
    const adapter = adapters.find((a) => a.id === id);
    if (!adapter || !adapter.syncRecipeBundle) return;

    setSyncing((s) => ({ ...s, [id]: true }));

    try {
      const { listRecipes } = await import('../src/storage/recipeRepo');
      const recipes = await listRecipes();

      if (recipes.length === 0) {
        Alert.alert('Nothing to sync', 'No recipes found to sync to Dropbox.');
        setSyncing((s) => ({ ...s, [id]: false }));
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const recipe of recipes) {
        try {
          const recipeJson = JSON.stringify(recipe, null, 2);
          const photos = (recipe.photos || []).map((p) => ({
            fileName: p.localUri?.split('/').pop() || `photo-${Date.now()}.jpg`,
            localUri: p.localUri || '',
          })).filter(p => p.localUri); // Only include photos with valid localUri

          await adapter.syncRecipeBundle(recipe.id, recipeJson, photos);
          synced++;
        } catch (error) {
          console.error(`Failed to sync recipe ${recipe.id}:`, error);
          failed++;
        }
      }

      setSyncing((s) => ({ ...s, [id]: false }));

      if (failed === 0) {
        Alert.alert(
          'Synced to Dropbox',
          `Successfully synced ${synced} recipe${synced !== 1 ? 's' : ''} to your Dropbox!`
        );
      } else {
        Alert.alert(
          'Sync completed with errors',
          `Synced ${synced} recipe${synced !== 1 ? 's' : ''}, ${failed} failed. Check your connection and try again.`
        );
      }
    } catch (error) {
      setSyncing((s) => ({ ...s, [id]: false }));
      Alert.alert(
        'Sync failed',
        `Failed to sync recipes: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.intro}>
        Your recipes are stored locally on this device. Optionally sync to your personal cloud storage
        (Dropbox, Google Drive, iCloud, OneDrive, or Box). One-tap connection, no accounts or keys needed.
        Enable one or more providers below.
      </Text>

      <View style={styles.themeCard}>
        <Text style={styles.themeTitle}>Appearance</Text>
        <Text style={styles.themeHint}>Choose a palette that feels comfortable in your kitchen.</Text>
        <View style={styles.themeOptions}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={StyleSheet.flatten([styles.themeOption, themePreference === mode && styles.themeOptionSelected])}
              onPress={() => void setThemePreference(mode)}
            >
              <Text style={StyleSheet.flatten([styles.themeOptionText, themePreference === mode && styles.themeOptionTextSelected])}>
                {mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {adapters.map((a) => {
        const enabled = enabledProviders.includes(a.id);
        const isOn = !!connected[a.id];
        const isSyncing = !!syncing[a.id];
        const canSync = isOn && a.syncRecipeBundle;
        return (
          <View key={a.id} style={StyleSheet.flatten([styles.card, !a.available && styles.cardDisabled])}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{a.displayName}</Text>
                <Text style={styles.status}>
                  {!a.available
                    ? 'Unavailable on this platform'
                    : isOn
                      ? 'Connected'
                      : 'Not connected'}
                </Text>
              </View>
              <Switch
                value={enabled}
                disabled={!a.available}
                trackColor={{ false: colors.chip, true: colors.primarySoft }}
                thumbColor={enabled ? colors.primary : colors.textMuted}
                onValueChange={() => toggleProvider(a.id)}
              />
            </View>
            <Text style={styles.notes}>{a.authNotes}</Text>
            <View style={styles.row}>
              <Pressable
                style={styles.btn}
                onPress={() => void onConnect(a.id)}
                disabled={!a.available}
              >
                <Text style={styles.btnText}>Connect</Text>
              </Pressable>
              {canSync && (
                <Pressable
                  style={[styles.btn, isSyncing && styles.btnDisabled]}
                  onPress={() => void onSync(a.id)}
                  disabled={isSyncing}
                >
                  <Text style={styles.btnText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
                </Pressable>
              )}
              <Pressable style={styles.btnSecondary} onPress={() => void onDisconnect(a.id)}>
                <Text style={styles.btnSecondaryText}>Disconnect</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Text style={styles.footer}>
        Recipes and photos sync to your cloud folder (/Cupboard Notes/recipeId/). Dropbox is live;
        other providers coming soon. Your data stays in your personal cloud — no managed server.
      </Text>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scroll: { padding: space.md, paddingBottom: 48, backgroundColor: colors.bg },
  intro: { color: colors.textMuted, lineHeight: 20, marginBottom: space.lg },
  themeCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.lg,
  },
  themeTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  themeHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  themeOptions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space.sm,
    backgroundColor: colors.chip,
  },
  themeOptionSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  themeOptionText: { color: colors.textMuted, fontWeight: '600' },
  themeOptionTextSelected: { color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.md,
  },
  cardDisabled: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  status: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  notes: { fontSize: 12, color: colors.textMuted, marginVertical: space.sm, lineHeight: 18 },
  row: { flexDirection: 'row', gap: space.sm },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: { color: colors.onPrimary, fontWeight: '600' },
  btnSecondary: {
    backgroundColor: colors.chip,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 8,
  },
  btnSecondaryText: { color: colors.text, fontWeight: '600' },
  footer: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: space.md },
});
