import React, { useMemo } from 'react';
import { View, Image, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import type { RecipePhoto } from '../domain/types';
import { photoDisplayUri } from '../storage/photos';
import { useTheme, space, type ThemeColors } from './theme';

interface Props {
  photos: RecipePhoto[];
  onAddCamera?: () => void;
  onAddGallery?: () => void;
  onRemove?: (id: string) => void;
  editable?: boolean;
}

export function PhotoGallery({
  photos,
  onAddCamera,
  onAddGallery,
  onRemove,
  editable,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Photos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((p) => {
          const uri = photoDisplayUri(p);
          return (
            <View key={p.id} style={styles.thumbWrap}>
              {uri ? (
                <Image source={{ uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.placeholder]}>
                  <Text style={styles.placeholderText}>No preview</Text>
                </View>
              )}
              {editable && onRemove ? (
                <Pressable style={styles.remove} onPress={() => onRemove(p.id)}>
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              ) : null}
              <Text style={styles.source}>{p.source}</Text>
            </View>
          );
        })}
        {editable ? (
          <>
            <Pressable style={styles.addBtn} onPress={onAddCamera}>
              <Text style={styles.addText}>Camera</Text>
            </Pressable>
            <Pressable style={styles.addBtn} onPress={onAddGallery}>
              <Text style={styles.addText}>Gallery</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
      {photos.length === 0 && !editable ? (
        <Text style={styles.empty}>No photos yet</Text>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { marginVertical: space.sm },
  label: { fontWeight: '600', color: colors.text, marginBottom: space.sm },
  row: { gap: space.sm, paddingVertical: space.xs },
  thumbWrap: { width: 112 },
  thumb: { width: 112, height: 112, borderRadius: 10, backgroundColor: colors.chip },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: colors.textMuted, fontSize: 11 },
  source: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.danger,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14, lineHeight: 16 },
  addBtn: {
    width: 112,
    height: 112,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  addText: { color: colors.primary, fontWeight: '600' },
  empty: { color: colors.textMuted, fontSize: 13 },
});
