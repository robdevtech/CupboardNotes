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
      await adapter.connect();
      setConnected((c) => ({ ...c, [id]: true }));
      if (!enabledProviders.includes(id)) toggleProvider(id);
      Alert.alert(
        'Connected (stub)',
        `${adapter.displayName}: Milestone 1 uses a stub session. Real OAuth lands in Milestone 2.\n\n${adapter.authNotes}`
      );
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

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.intro}>
        Offline SQLite is the source of truth. Cloud sync is optional and additive — your own
        Dropbox, OneDrive, Google Drive, iCloud, or Box via OAuth. No managed server. Enable one or
        more providers; switch or add later.
      </Text>

      <View style={styles.themeCard}>
        <Text style={styles.themeTitle}>Appearance</Text>
        <Text style={styles.themeHint}>Choose a palette that feels comfortable in your kitchen.</Text>
        <View style={styles.themeOptions}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.themeOption, themePreference === mode && styles.themeOptionSelected]}
              onPress={() => void setThemePreference(mode)}
            >
              <Text style={[styles.themeOptionText, themePreference === mode && styles.themeOptionTextSelected]}>
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
          <View key={a.id} style={[styles.card, !a.available && styles.cardDisabled]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{a.displayName}</Text>
                <Text style={styles.status}>
                  {!a.available
                    ? 'Unavailable on this platform'
                    : isOn
                      ? 'Stub-connected'
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
        Photo files sync with recipe JSON under /Cupboard Notes/&#123;recipeId&#125;/ via CloudStorageAdapter
        (upload paths stubbed until OAuth is live). Amazon Drive consumer API is discontinued; Box
        is included as the fifth provider.
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
  footer: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: space.md },
});
