/**
 * Quran List Screen
 * Displays all 114 Surahs with Arabic-Indic numbered ornament badges
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text as RNText,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/presentation/navigation/RootNavigator';
import { Chip } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import serverQuranService from '@/services/quran/ServerQuranService';
import { COLORS } from '@/constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
}

/**
 * Double-ring ornamental badge — same language as the SurahScreen verse marker.
 * Used here to show the surah number in Arabic-Indic numerals.
 */
function SurahBadge({ number }: { number: number }) {
  return (
    <View style={styles.badgeOuter}>
      <View style={styles.badgeInner}>
        <RNText style={styles.badgeText} numberOfLines={1} adjustsFontSizeToFit>
          {number}
        </RNText>
      </View>
    </View>
  );
}

export default function QuranListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSurahs();
  }, []);

  const loadSurahs = async () => {
    try {
      setLoading(true);
      setError(null);
      await serverQuranService.clearCache();
      const data = await serverQuranService.getAllSurahs();
      setSurahs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load surahs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <RNText style={styles.loadingText}>Loading Surahs...</RNText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <RNText style={styles.errorText}>{error}</RNText>
          <Pressable onPress={loadSurahs} style={styles.retryButton}>
            <RNText style={styles.retryText}>Retry</RNText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: Surah }) => (
    <Pressable
      onPress={() =>
        navigation.navigate('Surah', {
          surahNumber: item.number,
          surahName: item.name,
        })
      }
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Ornamental surah number badge */}
      <SurahBadge number={item.number} />

      {/* Surah info */}
      <View style={styles.info}>
        <RNText style={styles.arabicName}>{item.name}</RNText>
        <RNText style={styles.englishName}>{item.englishNameTranslation}</RNText>
        <View style={styles.metaRow}>
          <Chip
            size="sm"
            variant="soft"
            color={
              item.revelationType.toLowerCase() === 'meccan' ? 'accent' : 'success'
            }
          >
            <Chip.Label>
              {item.revelationType.charAt(0).toUpperCase() +
                item.revelationType.slice(1)}
            </Chip.Label>
          </Chip>
          <RNText style={styles.ayahCount}>
            {item.numberOfAyahs} Ayahs
          </RNText>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color="#C4C4C4" />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={{ width: 40 }} />
          <View style={styles.titleBlock}>
            <RNText style={styles.arabicTitle}>القرآن الكريم</RNText>
            <RNText style={styles.title}>Holy Quran</RNText>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Profile' as any)}
            style={styles.profileButton}
          >
            <Ionicons
              name="person-circle-outline"
              size={32}
              color={COLORS.primary[600]}
            />
          </Pressable>
        </View>
        <RNText style={styles.subtitle}>Read and explore the verses</RNText>
      </View>

      <FlatList
        data={surahs}
        renderItem={renderItem}
        keyExtractor={item => item.number.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const BADGE_OUTER = 52;
const BADGE_INNER = 38;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFDF9',
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleBlock: {
    alignItems: 'center',
  },
  arabicTitle: {
    fontFamily: 'UthmanicHafs',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary[700],
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[900],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  profileButton: { padding: 4 },

  // ── List ─────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginLeft: 16 + BADGE_OUTER + 14, // align with text, skip badge
  },

  // ── Surah card ───────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  cardPressed: {
    opacity: 0.6,
  },

  // ── Ornamental badge ──────────────────────────────────────────────────────
  badgeOuter: {
    width: BADGE_OUTER,
    height: BADGE_OUTER,
    borderRadius: BADGE_OUTER / 2,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  badgeInner: {
    width: BADGE_INNER,
    height: BADGE_INNER,
    borderRadius: BADGE_INNER / 2,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary[800],
    includeFontPadding: false,
  },

  // ── Surah info ────────────────────────────────────────────────────────────
  info: {
    flex: 1,
  },
  arabicName: {
    fontFamily: 'UthmanicHafs',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  englishName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ayahCount: {
    fontSize: 13,
    color: '#9ca3af',
  },

  // ── States ────────────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary[500],
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
