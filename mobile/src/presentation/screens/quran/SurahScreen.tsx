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

type Props = NativeStackScreenProps<RootStackParamList, 'Surah'>;

interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
}

export default function SurahScreen({ navigation, route }: Props) {
  const { surahNumber, surahName, highlightAyah, fromRecognition } = route.params;
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs for auto-scroll
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchSurahAyahs();
  }, [surahNumber]);

  // Auto-scroll to highlighted ayah after loading
  useEffect(() => {
    if (!loading && highlightAyah && fromRecognition && ayahs.length > 0) {
      // Find the index of the ayah to scroll to
      const ayahIndex = ayahs.findIndex(
        (ayah) => ayah.numberInSurah === highlightAyah
      );

      if (ayahIndex !== -1) {
        // Wait longer for FlatList to fully render and measure items
        const timer = setTimeout(() => {
          console.log(`📍 Scrolling to ayah ${highlightAyah} (index ${ayahIndex})`);
          flatListRef.current?.scrollToIndex({
            index: ayahIndex,
            animated: true,
            viewPosition: 0.2, // Scroll so the ayah appears at 20% from top
          });
        }, 1000); // Increased delay for large lists

        return () => clearTimeout(timer);
      }
    }
  }, [loading, highlightAyah, fromRecognition, ayahs]);

  const fetchSurahAyahs = async () => {
    try {
      setLoading(true);
      console.log(`📖 Loading Surah ${surahNumber} from local JSON...`);

      // Load from local JSON files
      try {
        const quranArabic = require('@/data/quran/quran-arabic.json');
        console.log('✅ quran-arabic.json loaded successfully');

        const surahData = quranArabic[surahNumber.toString()];
        console.log(`📊 Surah ${surahNumber} data:`, surahData ? `${surahData.length} verses` : 'Not found');

        if (surahData && Array.isArray(surahData)) {
          // Map to the expected format
          const ayahsData = surahData.map((verse: any) => ({
            number: verse.verse, // Global ayah number
            text: verse.text,
            numberInSurah: verse.verse, // Ayah number within this surah
          }));

          setAyahs(ayahsData);
          console.log(`✅ Loaded ${ayahsData.length} ayahs for Surah ${surahNumber}`);
        } else {
          console.error(`No data found for Surah ${surahNumber}`);
          setAyahs([]);
        }
      } catch (requireError) {
        console.error('❌ Error requiring JSON file:', requireError);
        throw requireError;
      }
    } catch (error) {
      console.error('Error loading surah from local data:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
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
          keyExtractor={(item) => item.number.toString()}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          getItemLayout={(data, index) => ({
            length: 120, // Approximate height of each ayah container
            offset: 120 * index,
            index,
          })}
          removeClippedSubviews={false}
          onScrollToIndexFailed={(info) => {
            // Fallback: scroll to offset if index scroll fails
            console.warn('ScrollToIndex failed, using offset fallback');
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
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
                    backgroundColor: '#dbeafe',
                    borderLeftWidth: 4,
                    borderLeftColor: '#3b82f6',
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
                    {ayah.numberInSurah}
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
                  <Text variant="arabic" style={styles.ayahText}>
                    {ayah.text}
                  </Text>
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
    paddingBottom: 40,
  },
  bismillahContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 2,
    backgroundColor: '#eff6ff', // Light blue background
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  bismillah: {
    fontSize: 26,
    lineHeight: 44,
    color: '#1e40af',
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
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  ayahNumberHighlighted: {
    backgroundColor: '#3b82f6',
  },
  ayahNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
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
  matchLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
});
