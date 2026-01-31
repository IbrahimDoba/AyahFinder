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

type Props = NativeStackScreenProps<RootStackParamList, 'Surah'>;

export default function SurahScreen({ navigation, route }: Props) {
  const { surahNumber, surahName, highlightAyah, fromRecognition } =
    route.params;
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get settings
  const { showTranslation } = useSettingsStore();

  // Refs for auto-scroll
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchSurahAyahs();
  }, [surahNumber]);

  // Auto-scroll to highlighted ayah after loading
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let retryTimer: NodeJS.Timeout;
    
    if (!loading && highlightAyah && ayahs.length > 0) {
      // Find the index of the ayah to scroll to
      const ayahIndex = ayahs.findIndex(
        ayah => (ayah.numberInSurah || ayah.ayahNumber) === highlightAyah
      );

      if (ayahIndex !== -1) {
        console.log(
          `📍 Scrolling to ayah ${highlightAyah} (index ${ayahIndex})`
        );
        
        // First attempt after layout is likely complete
        timer = setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: ayahIndex,
            animated: true,
            viewPosition: 0.25, // Position item 25% from top for better visibility
          });
          
          // Retry once more after animation to ensure correct position
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

  const fetchSurahAyahs = async () => {
    try {
      setLoading(true);
      console.log(`📖 Loading Surah ${surahNumber} from server...`);

      const surahData = await serverQuranService.getSurah(surahNumber);

      if (surahData && surahData.verses) {
        setAyahs(surahData.verses);
        console.log(
          `✅ Loaded ${surahData.verses.length} verses for Surah ${surahNumber}`
        );
      } else {
        console.error(`No verses found for Surah ${surahNumber}`);
        setAyahs([]);
      }
    } catch (error) {
      console.error('Error loading surah from server:', error);
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
            Surah {surahNumber}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
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
          showsVerticalScrollIndicator={true}
          // Note: We don't use getItemLayout because verses vary greatly in height
          // FlatList will measure items automatically for accurate scrolling
          onScrollToIndexFailed={info => {
            // Fallback: scroll to approximate offset based on average item length
            console.warn('ScrollToIndex failed, using offset fallback:', info);
            const fallbackOffset = info.averageItemLength * info.index;
            flatListRef.current?.scrollToOffset({
              offset: fallbackOffset,
              animated: true,
            });
            // Try again after a delay once items are laid out
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.3,
              });
            }, 300);
          }}
          // Performance optimizations to prevent glitchy scrolling
          maxToRenderPerBatch={20}
          windowSize={15}
          updateCellsBatchingPeriod={50}
          maintainVisibleContentPosition={undefined}
          ListHeaderComponent={
            surahNumber !== 9 && surahNumber !== 1 ? (
              <View style={styles.bismillahContainer}>
                <Text variant="h2" align="center" style={styles.bismillah}>
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item: ayah, index }) => {
            const isHighlighted = ayah.numberInSurah === highlightAyah;

            return (
              <View
                style={[
                  styles.ayahContainer,
                  index % 2 === 0 ? styles.ayahOdd : styles.ayahEven,
                  isHighlighted && {
                    backgroundColor: '#E8F5E9',
                    borderLeftWidth: 4,
                    borderLeftColor: '#4CAF50',
                  },
                ]}
              >
                {/* Ayah Number on Left */}
                <View
                  style={[
                    styles.ayahNumberContainer,
                    isHighlighted && styles.ayahNumberHighlighted,
                  ]}
                >
                  <RNText
                    style={[
                      styles.ayahNumberText,
                      isHighlighted && styles.ayahNumberTextHighlighted,
                    ]}
                  >
                    {ayah.numberInSurah || ayah.ayahNumber}
                  </RNText>
                </View>

                {/* Ayah Text */}
                <View style={styles.ayahTextContainer}>
                  {isHighlighted && fromRecognition && (
                    <Text
                      variant="caption"
                      style={styles.matchLabel}
                      color={COLORS.info}
                    >
                      🎯 Matched Verse
                    </Text>
                  )}
                  
                  {/* Arabic Text */}
                  <Text variant="arabic" style={styles.ayahText}>
                    {ayah.arabicText || ayah.text}
                  </Text>
                  
                  {/* English Translation (if enabled) */}
                  {showTranslation && ayah.translation && (
                    <Text
                      variant="body"
                      style={styles.translationText}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 200, // Extra padding to allow last items to scroll into full view
  },
  bismillahContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 2,
    backgroundColor: '#E8F5E9',
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  bismillah: {
    fontSize: 26,
    lineHeight: 44,
    color: '#1B5E20',
  },
  ayahContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 2,
    alignItems: 'flex-start',
  },
  ayahOdd: {
    backgroundColor: '#f9fafb', // Very light gray
  },
  ayahEven: {
    backgroundColor: '#ffffff', // White
  },
  ayahNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  ayahNumberHighlighted: {
    backgroundColor: '#4CAF50',
  },
  ayahNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  ayahNumberTextHighlighted: {
    color: '#ffffff',
  },
  ayahTextContainer: {
    flex: 1,
  },
  ayahText: {
    fontSize: 28,
    lineHeight: 56,
    textAlign: 'right',
    color: '#111827',
  },
  translationText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'left',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  matchLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
});
