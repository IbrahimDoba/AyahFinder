/**
 * Bookmarks Screen
 * Lists all saved verses. Tap to open in Surah reader, swipe/press to delete.
 */
import React, { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants';
import { RootStackParamList } from '@/presentation/navigation/RootNavigator';
import { useBookmarkStore } from '@/presentation/store/bookmarkStore';
import { useAuthStore } from '@/presentation/store/authStore';
import { Bookmark } from '@/services/bookmarks/BookmarkService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookmarksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { bookmarks, total, limit, remaining, isLoading, loadBookmarks, removeBookmark } =
    useBookmarkStore();

  // Reload whenever this tab is focused
  useFocusEffect(
    useCallback(() => {
      if (user) loadBookmarks();
    }, [user])
  );

  const handleOpen = (item: Bookmark) => {
    navigation.navigate('Surah', {
      surahNumber: item.surahNumber,
      surahName: item.surahName,
      highlightAyah: item.ayahNumber,
    });
  };

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header />
        <View style={styles.centered}>
          <Ionicons name="bookmark-outline" size={56} color={COLORS.primary[200]} />
          <RNText style={styles.emptyTitle}>Sign in to save verses</RNText>
          <RNText style={styles.emptyBody}>
            Create a free account to bookmark your favourite Ayahs.
          </RNText>
          <Pressable
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login' as any)}
          >
            <RNText style={styles.signInText}>Sign In</RNText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading && bookmarks.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header total={total} limit={limit} remaining={remaining} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (!isLoading && bookmarks.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header total={total} limit={limit} remaining={remaining} />
        <View style={styles.centered}>
          <Ionicons name="bookmark-outline" size={56} color={COLORS.primary[200]} />
          <RNText style={styles.emptyTitle}>No bookmarks yet</RNText>
          <RNText style={styles.emptyBody}>
            Tap the bookmark icon on any verse while reading to save it here.
          </RNText>
        </View>
      </SafeAreaView>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header total={total} limit={limit} remaining={remaining} />
      <FlatList
        data={bookmarks}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => handleOpen(item)}
          >
            {/* Surah + ayah badge */}
            <View style={styles.badge}>
              <RNText style={styles.badgeSurah}>{item.surahNumber}</RNText>
              <RNText style={styles.badgeAyah}>:{item.ayahNumber}</RNText>
            </View>

            {/* Text */}
            <View style={styles.cardContent}>
              <RNText style={styles.surahName}>{item.surahName}</RNText>
              <RNText style={styles.arabicPreview} numberOfLines={2}>
                {item.arabicText}
              </RNText>
              {item.translation && (
                <RNText style={styles.translationPreview} numberOfLines={1}>
                  {item.translation}
                </RNText>
              )}
            </View>

            {/* Delete */}
            <Pressable
              onPress={() => removeBookmark(item.id)}
              hitSlop={10}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={18} color="#d1d5db" />
            </Pressable>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

// ── Header sub-component ─────────────────────────────────────────────────────
function Header({
  total,
  limit,
  remaining,
}: {
  total?: number;
  limit?: number;
  remaining?: number;
}) {
  return (
    <View style={styles.header}>
      <RNText style={styles.headerTitle}>Bookmarks</RNText>
      {total !== undefined && limit !== undefined && (
        <View style={styles.counterChip}>
          <RNText
            style={[
              styles.counterText,
              remaining === 0 && styles.counterTextFull,
            ]}
          >
            {total} / {limit}
          </RNText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFDF9',
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary[900],
  },
  counterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.primary[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  counterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary[700],
  },
  counterTextFull: {
    color: '#ef4444',
  },

  // ── List ───────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 14,
  },
  cardPressed: { opacity: 0.6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 52,
    justifyContent: 'center',
    backgroundColor: COLORS.primary[50],
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexShrink: 0,
  },
  badgeSurah: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary[800],
  },
  badgeAyah: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary[500],
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  surahName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary[700],
  },
  arabicPreview: {
    fontFamily: 'UthmanicHafs',
    fontSize: 18,
    lineHeight: 32,
    color: '#111827',
    textAlign: 'right',
  },
  translationPreview: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  deleteButton: {
    padding: 8,
  },

  // ── Empty / Auth states ────────────────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
  signInButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: COLORS.primary[600],
    borderRadius: 12,
  },
  signInText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
