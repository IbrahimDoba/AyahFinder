/**
 * Quran List Screen
 * Displays list of all Surahs with HeroUI Native components
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
import { Chip, Card } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import serverQuranService from '@/services/quran/ServerQuranService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

      // Force clear cache once to get fresh data from server (fixes stale 1-surah cache)
      console.log('[Quran] Clearing cache to force fresh data...');
      await serverQuranService.clearCache();

      const data = await serverQuranService.getAllSurahs();
      setSurahs(data);
    } catch (err: any) {
      console.error('Failed to load Quran surah data:', err);
      setError(err.message || 'Failed to load surahs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <RNText style={styles.loadingText}>Loading Surahs...</RNText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <RNText style={styles.errorText}>{error}</RNText>
          <Pressable onPress={loadSurahs} style={styles.retryButton}>
            <RNText style={styles.retryText}>Retry</RNText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const renderSurahCard = ({ item }: { item: Surah }) => (
    <Pressable
      onPress={() =>
        navigation.navigate('Surah', {
          surahNumber: item.number,
          surahName: item.name,
        })
      }
    >
      <Card style={styles.card}>
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
        <View style={styles.topRow}>
          <View style={{ width: 40 }} />
          <RNText style={styles.title}>Holy Quran</RNText>
          <Pressable
            onPress={() => navigation.navigate('Profile' as any)}
            style={styles.profileButton}
          >
            <Ionicons name="person-circle-outline" size={32} color="#4CAF50" />
          </Pressable>
        </View>
        <RNText style={styles.subtitle}>Read and explore the verses</RNText>
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
    color: '#1B5E20',
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileButton: {
    padding: 4,
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
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  numberText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
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
  loadingContainer: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
