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
  const [syncing, setSyncing] = useState(false);

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

  const onSyncToCloud = async () => {
    // Check if any provider is connected and supports sync
    const hasConnectedSyncProvider = adapters.some(
      (a) => connected[a.id] && a.syncRecipeBundle
    );

    if (!hasConnectedSyncProvider) {
      Alert.alert(
        'No cloud storage connected',
        'Connect at least one cloud provider (like Dropbox) to sync your recipes.'
      );
      return;
    }

    setSyncing(true);

    try {
      const { listRecipes } = await import('../src/storage/recipeRepo');
      const { syncAllRecipesToCloud } = await import('../src/storage/cloudSync');
      const recipes = await listRecipes();

      if (recipes.length === 0) {
        Alert.alert('Nothing to sync', 'No recipes found to sync to cloud.');
        setSyncing(false);
        return;
      }

      const results = await syncAllRecipesToCloud(recipes);

      // Build status message
      const successResults = results.filter((r) => r.status === 'success');
      const notConnectedResults = results.filter((r) => r.status === 'not_connected');

      if (successResults.length === 0) {
        Alert.alert(
          'Sync failed',
          'No connected providers could sync recipes. Check your connections and try again.'
        );
      } else {
        const messages: string[] = [];
        
        successResults.forEach((r) => {
          const uploaded = r.recipesUploaded || 0;
          const failed = r.recipesFailed || 0;
          if (failed === 0) {
            messages.push(`${r.providerName}: ${uploaded} recipe${uploaded !== 1 ? 's' : ''}`);
          } else {
            messages.push(
              `${r.providerName}: ${uploaded} synced, ${failed} failed`
            );
          }
        });

        if (notConnectedResults.length > 0) {
          const notConnectedNames = notConnectedResults.map((r) => r.providerName);
          messages.push(`\n${notConnectedNames.join(', ')}: not connected`);
        }

        Alert.alert(
          'Synced to cloud',
          `✓ ${messages.join('\n')}`
        );
      }
    } catch (error) {
      Alert.alert(
        'Sync failed',
        `Failed to sync recipes: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.intro}>
        Your recipes are stored locally on this device. Optionally sync to your personal cloud storage
        (Dropbox, Google Drive, iCloud, OneDrive, or Box). One-tap connection, no accounts or keys needed.
        Enable one or more providers below.
      </Text>

      {/* Unified sync button for all connected providers */}
      <Pressable
        style={[styles.syncButton, syncing && styles.btnDisabled]}
        onPress={() => void onSyncToCloud()}
        disabled={syncing}
      >
        <Text style={styles.syncButtonText}>
          {syncing ? 'Syncing to cloud...' : 'Sync to cloud'}
        </Text>
        <Text style={styles.syncButtonHint}>
          Upload all recipes to connected providers
        </Text>
      </Pressable>

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
              <Pressable style={styles.btnSecondary} onPress={() => void onDisconnect(a.id)}>
                <Text style={styles.btnSecondaryText}>Disconnect</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Text style={styles.footer}>
        Recipes and photos sync to your cloud folder (/Cupboard Notes/recipeId/). Dropbox and Box are live;
        other providers coming soon. Your data stays in your personal cloud — no managed server.
      </Text>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scroll: { padding: space.md, paddingBottom: 48, backgroundColor: colors.bg },
  intro: { color: colors.textMuted, lineHeight: 20, marginBottom: space.lg },
  syncButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: space.md,
    marginBottom: space.lg,
    alignItems: 'center',
  },
  syncButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  syncButtonHint: {
    color: colors.onPrimary,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
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
