/**
 * Surah Screen
 * Displays all verses of a Surah with auto-scroll and highlighting
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/presentation/navigation/RootNavigator';
import { Text } from '@/presentation/components/common/Text';
import { COLORS } from '@/constants';
import { Ionicons } from '@expo/vector-icons';

import serverQuranService from '@/services/quran/ServerQuranService';
import { useSettingsStore } from '@/presentation/store/settingsStore';
import { useBookmarkStore } from '@/presentation/store/bookmarkStore';
import { useAuthStore } from '@/presentation/store/authStore';
import { showAlert } from '@/presentation/store/alertStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Surah'>;

/**
 * Traditional Quran verse-end ornament.
 * Double-ring circle with the ayah number in Arabic-Indic numerals.
 */
function AyahMarker({
  number,
  highlighted,
}: {
  number: number;
  highlighted: boolean;
}) {
  return (
    <View style={[styles.markerOuter, highlighted && styles.markerOuterHL]}>
      <View style={[styles.markerInner, highlighted && styles.markerInnerHL]}>
        <RNText
          style={[styles.markerText, highlighted && styles.markerTextHL]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {number}
        </RNText>
      </View>
    </View>
  );
}

export default function SurahScreen({ navigation, route }: Props) {
  const { surahNumber, surahName, highlightAyah, fromRecognition } =
    route.params;
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showTranslation } = useSettingsStore();
  const { user } = useAuthStore();
  const { isBookmarked, getBookmarkId, addBookmark, removeBookmark, loadBookmarks } =
    useBookmarkStore();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchSurahAyahs();
  }, [surahNumber]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let retryTimer: NodeJS.Timeout;

    if (!loading && highlightAyah && ayahs.length > 0) {
      const ayahIndex = ayahs.findIndex(
        a => (a.numberInSurah || a.ayahNumber) === highlightAyah
      );
      if (ayahIndex !== -1) {
        timer = setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: ayahIndex,
            animated: true,
            viewPosition: 0.25,
          });
          retryTimer = setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: ayahIndex,
              animated: true,
              viewPosition: 0.25,
            });
          }, 600);
        }, 300);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [loading, highlightAyah, ayahs]);

  // Load bookmarks so we can show correct filled/outline state
  useEffect(() => {
    if (user) loadBookmarks();
  }, [user]);

  const handleBookmarkToggle = async (ayah: any) => {
    if (!user) {
      navigation.navigate('Login' as any);
      return;
    }
    const ayahNum = ayah.numberInSurah || ayah.ayahNumber;
    const bookmarkId = getBookmarkId(surahNumber, ayahNum);

    if (bookmarkId) {
      await removeBookmark(bookmarkId);
    } else {
      const result = await addBookmark({
        surahNumber,
        surahName,
        ayahNumber: ayahNum,
        arabicText: ayah.arabicText || ayah.text,
        translation: ayah.translation ?? null,
      });
      if (result.error) {
        showAlert({ title: 'Bookmark', message: result.error, type: 'error' });
      }
    }
  };

  const fetchSurahAyahs = async () => {
    try {
      setLoading(true);
      const surahData = await serverQuranService.getSurah(surahNumber);
      setAyahs(surahData?.verses ?? []);
    } catch {
      setAyahs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text variant="h2" align="center">
            {surahName}
          </Text>
          <Text variant="caption" align="center" color={COLORS.text.secondary}>
            {'Surah ' + surahNumber}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <RNText style={styles.loadingText}>Loading verses...</RNText>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={ayahs}
          keyExtractor={item => item.number.toString()}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={info => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.3,
              });
            }, 300);
          }}
          maxToRenderPerBatch={20}
          windowSize={15}
          updateCellsBatchingPeriod={50}
          ListHeaderComponent={
            surahNumber !== 9 && surahNumber !== 1 ? (
              <View style={styles.bismillahContainer}>
                <View style={styles.bismillahRule} />
                <Text variant="h2" align="center" style={styles.bismillahText}>
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </Text>
                <View style={styles.bismillahRule} />
              </View>
            ) : null
          }
          renderItem={({ item: ayah, index }) => {
            const ayahNum = ayah.numberInSurah || ayah.ayahNumber;
            const isHighlighted = ayahNum === highlightAyah;
            const bookmarked = isBookmarked(surahNumber, ayahNum);

            return (
              <View
                style={[
                  styles.ayahRow,
                  index > 0 && styles.ayahDivider,
                  isHighlighted && styles.ayahRowHL,
                ]}
              >
                {/* Ornamental verse marker */}
                <AyahMarker number={ayahNum} highlighted={isHighlighted} />

                {/* Verse text */}
                <View style={styles.verseContent}>
                  {/* Top row: matched badge + bookmark button */}
                  <View style={styles.ayahTopRow}>
                    {isHighlighted && fromRecognition ? (
                      <View style={styles.matchBadge}>
                        <Ionicons
                          name="musical-notes"
                          size={11}
                          color={COLORS.primary[700]}
                        />
                        <RNText style={styles.matchBadgeText}>
                          Matched Verse
                        </RNText>
                      </View>
                    ) : (
                      <View />
                    )}
                    <TouchableOpacity
                      onPress={() => handleBookmarkToggle(ayah)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={bookmarked ? COLORS.primary[600] : '#d1d5db'}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text variant="arabic" style={styles.arabicText}>
                    {ayah.arabicText || ayah.text}
                  </Text>
                  {showTranslation && ayah.translation && (
                    <Text
                      variant="body"
                      style={styles.translation}
                      color={COLORS.text.secondary}
                    >
                      {ayah.translation}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const MARKER_OUTER = 46;
const MARKER_INNER = 34;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFDF9',
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, alignItems: 'center' },
  placeholder: { width: 40 },

  // ── States ───────────────────────────────────────────────────────────────
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6b7280' },
  scrollView: { flex: 1 },
  content: { paddingBottom: 200 },

  // ── Bismillah ────────────────────────────────────────────────────────────
  bismillahContainer: {
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 14,
  },
  bismillahRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.primary[200],
    alignSelf: 'stretch',
  },
  bismillahText: {
    fontSize: 24,
    lineHeight: 44,
    color: COLORS.primary[900],
  },

  // ── Ayah rows ────────────────────────────────────────────────────────────
  ayahRow: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    backgroundColor: '#FAFDF9',
  },
  ayahDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  ayahRowHL: {
    backgroundColor: '#F1F8F1',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary[500],
  },

  // ── Verse marker (double-ring ornament) ──────────────────────────────────
  markerOuter: {
    width: MARKER_OUTER,
    height: MARKER_OUTER,
    borderRadius: MARKER_OUTER / 2,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 6,
    flexShrink: 0,
  },
  markerOuterHL: {
    borderColor: COLORS.primary[400],
  },
  markerInner: {
    width: MARKER_INNER,
    height: MARKER_INNER,
    borderRadius: MARKER_INNER / 2,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInnerHL: {
    backgroundColor: COLORS.primary[600],
  },
  markerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary[800],
    includeFontPadding: false,
  },
  markerTextHL: {
    color: '#fff',
  },

  // ── Verse content ─────────────────────────────────────────────────────────
  verseContent: { flex: 1 },
  ayahTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  arabicText: {
    fontSize: 28,
    lineHeight: 56,
    textAlign: 'right',
    color: '#111827',
  },
  translation: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'left',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },

  // ── Match badge ───────────────────────────────────────────────────────────
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    alignSelf: 'flex-end',
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary[700],
  },
});
