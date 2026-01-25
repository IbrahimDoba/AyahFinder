/**
 * Quran List Screen
 * Displays list of all Surahs with HeroUI Native components
 */
import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text as RNText,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/presentation/navigation/RootNavigator';
import { Chip, Card } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SurahData {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: string;
  total_verses: number;
}

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
}

export default function QuranListScreen() {
  const navigation = useNavigation<NavigationProp>();

  // Map the data to expected format - lazy load JSON
  const surahs: Surah[] = useMemo(() => {
    try {
      const surahsData = require('@/data/quran/quran-surah-english.json');
      return (surahsData as SurahData[]).map(surah => ({
        number: surah.id,
        name: surah.name,
        englishName: surah.transliteration,
        englishNameTranslation: surah.translation,
        revelationType: surah.type,
        numberOfAyahs: surah.total_verses,
      }));
    } catch (error) {
      console.error('Failed to load Quran surah data:', error);
      return [];
    }
  }, []);

  const renderSurahCard = ({ item }: { item: Surah }) => (
    <Pressable
      onPress={() =>
        navigation.navigate('Surah', {
          surahNumber: item.number,
          surahName: item.name,
        })
      }
    >
      <Card variant="outlined" style={styles.card}>
        <Card.Body>
          <View style={styles.cardContent}>
            {/* Surah Number Badge */}
            <View style={styles.numberContainer}>
              <RNText style={styles.numberText}>{item.number}</RNText>
            </View>

            {/* Surah Info */}
            <View style={styles.infoContainer}>
              <RNText style={styles.arabicName}>{item.name}</RNText>
              <RNText style={styles.englishName}>
                {item.englishNameTranslation}
              </RNText>
              <View style={styles.metaRow}>
                <Chip
                  size="sm"
                  variant="soft"
                  color={
                    item.revelationType.toLowerCase() === 'meccan'
                      ? 'accent'
                      : 'success'
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

            {/* Chevron Icon */}
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </View>
        </Card.Body>
      </Card>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <RNText style={styles.title}>القرآن الكريم</RNText>
        <RNText style={styles.subtitle}>The Holy Quran</RNText>
      </View>

      {/* Surah List */}
      <FlatList
        data={surahs}
        renderItem={renderSurahCard}
        keyExtractor={item => item.number.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  numberText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e40af',
  },
  infoContainer: {
    flex: 1,
  },
  arabicName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  englishName: {
    fontSize: 15,
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
});
