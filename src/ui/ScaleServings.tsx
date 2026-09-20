import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, space, type ThemeColors } from './theme';

interface Props {
  baseServings: number;
  targetServings: number;
  onChange: (n: number) => void;
}

export function ScaleServings({ baseServings, targetServings, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dec = () => onChange(Math.max(1, Math.round((targetServings - 1) * 10) / 10));
  const inc = () => onChange(Math.round((targetServings + 1) * 10) / 10);
  const reset = () => onChange(baseServings);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>Servings</Text>
      <View style={styles.controls}>
        <Pressable onPress={dec} style={styles.btn}>
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{targetServings}</Text>
        <Pressable onPress={inc} style={styles.btn}>
          <Text style={styles.btnText}>+</Text>
        </Pressable>
        {targetServings !== baseServings ? (
          <Pressable onPress={reset} style={styles.reset}>
            <Text style={styles.resetText}>Reset ({baseServings})</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.hint}>Linear scale · fixed lines (pinch / to taste) stay put</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { marginVertical: space.sm },
  label: { fontWeight: '600', marginBottom: space.xs, color: colors.text },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 20, color: colors.primary, fontWeight: '700' },
  value: { minWidth: 40, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  reset: { marginLeft: space.sm, paddingHorizontal: space.sm, paddingVertical: 6 },
  resetText: { color: colors.primary, fontWeight: '600' },
  hint: { marginTop: space.xs, color: colors.textMuted, fontSize: 12 },
});
