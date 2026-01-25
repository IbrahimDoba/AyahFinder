/**
 * Result Screen
 * Displays recognition results
 */
import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/presentation/navigation/RootNavigator';
import { COLORS } from '@/constants';
import { Text } from '@/presentation/components/common/Text';
import { Button, Card, Chip, Progress } from 'heroui-native';
import { useRecognitionStore } from '@/presentation/store/recognitionStore';
import { Ionicons } from '@expo/vector-icons';

type ResultScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>;
};

export default function ResultScreen({ navigation }: ResultScreenProps) {
  const { result, error, reset } = useRecognitionStore();

  const handleTryAgain = () => {
    reset();
    navigation.goBack();
  };

  // Error state
  if (error || !result || !result.success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.errorContainer}>
            <Ionicons name="close-circle" size={80} color={COLORS.danger} />
            <Text variant="h3" align="center" style={styles.errorTitle}>
              No Match Found
            </Text>
            <Text variant="body" align="center" color={COLORS.text.secondary}>
              {error || result?.error?.message || 'Could not identify the recitation'}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              onPress={handleTryAgain}
              variant="solid"
              color="accent"
              size="lg"
              fullWidth
            >
              <Button.Label>Try Again</Button.Label>
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color="#ffffff" />
          </View>

          {/* Result Card */}
          <Card variant="elevated" style={styles.resultCard}>
            <Card.Body style={styles.cardBody}>
              <Text variant="caption" align="center" color={COLORS.text.secondary}>
                SURAH
              </Text>
              <Text variant="h2" align="center" style={styles.surahName}>
                {result.surah?.nameArabic || 'Unknown'}
              </Text>
              <Text variant="body" align="center" color={COLORS.text.secondary}>
                {result.surah?.nameEnglish || `Surah ${result.surah?.number}`}
              </Text>

              <View style={styles.divider} />

              <Text variant="caption" align="center" color={COLORS.text.secondary}>
                AYAH
              </Text>
              <Text variant="h1" align="center" style={styles.ayahNumber}>
                {result.ayah?.ayahNumber}
              </Text>

              {/* Confidence */}
              <View style={styles.confidenceContainer}>
                <Progress value={result.confidence * 100} color="accent" size="md" />
                <Text variant="caption" align="center" color={COLORS.text.secondary}>
                  {(result.confidence * 100).toFixed(0)}% confident
                </Text>
              </View>

              {/* Processing Time */}
              <Chip size="sm" variant="soft" color="success">
                <Chip.Label>Processed in {result.processingTimeMs}ms</Chip.Label>
              </Chip>
            </Card.Body>
          </Card>

          {/* Ambiguous Warning */}
          {result.isAmbiguous && result.alternatives && result.alternatives.length > 0 && (
            <Card variant="soft" style={styles.ambiguousWarning}>
              <Card.Body>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={20} color={COLORS.warning} />
                  <Text variant="body" color={COLORS.warning}>
                    Multiple similar verses detected
                  </Text>
                </View>
                <Text variant="caption" color={COLORS.text.secondary} style={styles.altTitle}>
                  Alternative matches:
                </Text>
                {result.alternatives.slice(0, 2).map((alt, idx) => (
                  <Chip key={idx} size="sm" variant="soft" color="warning" style={styles.altChip}>
                    <Chip.Label>
                      Surah {alt.surah.number}, Ayah {alt.ayah.ayahNumber} ({(alt.confidence * 100).toFixed(0)}%)
                    </Chip.Label>
                  </Chip>
                ))}
              </Card.Body>
            </Card>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              onPress={handleTryAgain}
              variant="solid"
              color="accent"
              size="lg"
              fullWidth
            >
              <Button.Label>Listen Again</Button.Label>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  resultCard: {
    width: '100%',
  },
  cardBody: {
    gap: 12,
    alignItems: 'center',
  },
  surahName: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 12,
    width: '100%',
  },
  ayahNumber: {
    marginTop: 4,
    color: COLORS.primary[500],
  },
  confidenceContainer: {
    marginTop: 16,
    gap: 8,
    width: '100%',
  },
  ambiguousWarning: {
    width: '100%',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  altTitle: {
    marginTop: 8,
    marginBottom: 8,
  },
  altChip: {
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  errorTitle: {
    marginTop: 16,
  },
  actions: {
    marginTop: 'auto',
  },
});
