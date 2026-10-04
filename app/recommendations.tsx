import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme, space, type ThemeColors } from '../src/ui/theme';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
}

interface RecommendationsFeed {
  version: string;
  updatedAt: string;
  season: string;
  recommendations: Recommendation[];
}

const FEED_URL =
  'https://raw.githubusercontent.com/robdevtech/CupboardNotes/main/recommendations.json';

export default function RecommendationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [feed, setFeed] = useState<RecommendationsFeed | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      // Prefer local bundled feed (always up to date with the branch)
      let feedData: RecommendationsFeed;
      
      try {
        feedData = require('../recommendations.json');
      } catch (e) {
        // Fallback to remote if bundled file somehow missing
        const response = await fetch(FEED_URL);
        if (response.ok) {
          feedData = await response.json();
        } else {
          throw new Error('Failed to fetch');
        }
      }
      
      setFeed(feedData);
    } catch (e) {
      Alert.alert('Failed to load recommendations', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const onOpenPreview = (item: Recommendation) => {
    router.push({
      pathname: '/recommendations/preview',
      params: {
        url: item.url,
        title: item.title,
        tags: item.tags,
      },
    });
  };

  const renderItem = ({ item }: { item: Recommendation }) => (
    <Pressable style={styles.card} onPress={() => onOpenPreview(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.description}>{item.description}</Text>
      {item.tags.length > 0 && (
        <View style={styles.tags}>
          {item.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.cardFooter}>
        <Text style={styles.tapHint}>Tap to preview</Text>
      </View>
    </Pressable>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Recommendations' }} />
      <View style={styles.screen}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : feed ? (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{feed.season}</Text>
              <Text style={styles.headerSubtitle}>
                Curated recipes to try · Updated {new Date(feed.updatedAt).toLocaleDateString()}
              </Text>
            </View>
            <FlatList
              data={feed.recommendations}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
            />
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No recommendations available</Text>
            <Pressable onPress={loadFeed} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: {
      backgroundColor: colors.surface,
      padding: space.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    list: { padding: space.md, gap: space.md },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.md,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: space.sm,
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, paddingRight: space.sm },
    categoryBadge: {
      backgroundColor: colors.chip,
      paddingHorizontal: space.sm,
      paddingVertical: 4,
      borderRadius: 12,
    },
    categoryText: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
    description: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: space.sm },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: space.md },
    tag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
    },
    tagText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
    cardFooter: {
      paddingTop: space.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: space.sm,
    },
    tapHint: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xl,
    },
    emptyText: { fontSize: 16, color: colors.textMuted, marginBottom: space.md },
    retryBtn: {
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    retryBtnText: { fontSize: 15, fontWeight: '600', color: colors.onPrimary },
  });
