import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Switch, Alert, Platform, ActivityIndicator } from 'react-native';
import { listAdapters } from '../src/cloud/registry';
import { syncAllStores } from '../src/cloud/syncManager';
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
      
      if (id === 'local') {
        Alert.alert(
          'Local Storage Connected',
          `Recipes will be stored in your app's Documents directory.\n\nLocation: ${session.accountLabel}\n\nThis folder syncs with other connected storage providers using last-write-wins merge.`
        );
      } else {
        Alert.alert(
          'Connected (stub)',
          `${adapter.displayName}: Milestone 1 uses a stub session. Real OAuth lands in Milestone 2.\n\n${adapter.authNotes}`
        );
      }
    } catch (e) {
      Alert.alert(
        adapter.displayName,
        `${e instanceof Error ? e.message : 'Failed'}\n\n${adapter.authNotes}`
      );
    }
  };

  const onDisconnect = async (id: CloudProviderId) => {
    const adapter = adapters.find((a) => a.id === id);
    if (!adapter) return;
    await adapter.disconnect();
    setConnected((c) => ({ ...c, [id]: false }));
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const result = await syncAllStores();
      
      if (result.errors.length > 0) {
        Alert.alert(
          'Sync completed with errors',
          `Pulled: ${result.pulledCount}, Pushed: ${result.pushedCount}, Conflicts: ${result.conflictsResolved}\n\nErrors:\n${result.errors.join('\n')}`
        );
      } else {
        Alert.alert(
          'Sync complete',
          `✓ Pulled ${result.pulledCount} recipes\n✓ Pushed ${result.pushedCount} recipes\n✓ Resolved ${result.conflictsResolved} conflicts`
        );
      }
    } catch (e) {
      Alert.alert('Sync failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.intro}>
        Offline SQLite is the source of truth. Storage sync is optional and additive. Enable Local
        Folder to keep recipes in your device's Documents directory, or Dropbox (OAuth stub) for
        cloud storage. Multi-store sync uses last-write-wins merge. No managed server.
      </Text>

      {Object.values(connected).some(Boolean) && (
        <Pressable
          style={StyleSheet.flatten([styles.syncBtn, syncing && styles.syncBtnDisabled])}
          onPress={() => void onSync()}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.syncBtnText}>Sync All Stores</Text>
          )}
        </Pressable>
      )}

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
        const isLocal = a.id === 'local';
        return (
          <View key={a.id} style={StyleSheet.flatten([styles.card, !a.available && styles.cardDisabled])}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{a.displayName}</Text>
                <Text style={styles.status}>
                  {!a.available
                    ? 'Unavailable on this platform'
                    : isOn
                      ? isLocal ? 'Connected' : 'Stub-connected'
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
                disabled={!a.available || isOn}
              >
                <Text style={styles.btnText}>{isOn ? 'Connected' : 'Connect'}</Text>
              </Pressable>
              <Pressable 
                style={styles.btnSecondary} 
                onPress={() => void onDisconnect(a.id)}
                disabled={!isOn}
              >
                <Text style={styles.btnSecondaryText}>Disconnect</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Text style={styles.footer}>
        Recipe bundles are stored as /Cupboard Notes/&#123;recipeId&#125;/recipe.json + photos/* in each
        enabled store. Multi-store sync merges by newest updatedAt (last-write-wins). Other cloud
        providers (Google Drive, iCloud, OneDrive, Box) are stubbed for future OAuth implementation.
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
  btnText: { color: colors.onPrimary, fontWeight: '600' },
  btnSecondary: {
    backgroundColor: colors.chip,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 8,
  },
  btnSecondaryText: { color: colors.text, fontWeight: '600' },
  syncBtn: {
    backgroundColor: colors.success,
    paddingVertical: space.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: space.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
  footer: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: space.md },
});
