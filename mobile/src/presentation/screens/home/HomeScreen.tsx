/**
 * Home Screen
 * Audio recognition with usage tracking
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '@/presentation/navigation/RootNavigator';
import { COLORS, REALTIME_MATCHING_CONFIG } from '@/constants';
import { ERROR_MESSAGES } from '@/constants/errors';
import { RecognitionResult } from '@/domain/entities/RecognitionResult';
import { Text } from '@/presentation/components/common/Text';
import { ListenButton } from './components/ListenButton';
import { useRecognitionStore } from '@/presentation/store/recognitionStore';
import { AudioRecorder } from '@/services/audio/AudioRecorder';
import { useRecognition } from '@/presentation/hooks/useRecognition';
import { useRealTimeRecognition } from '@/presentation/hooks/useRealTimeRecognition';
import usageValidator from '@/services/usage/UsageValidator';
import { UpgradePrompt } from '@/presentation/components/usage/UpgradePrompt';
import type { UsageStats } from '@/services/usage/UsageValidator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const audioRecorder = useState(() => new AudioRecorder())[0];
  const { isRecording, setRecording, isProcessing, setProcessing } = useRecognitionStore();
  const { recognize } = useRecognition();

  // Refs to prevent multiple stop calls and track match state
  const isStoppingRef = useRef(false);
  const matchFoundRef = useRef(false);
  const [showRetry, setShowRetry] = useState(false);

  // Usage tracking state
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string>('');

  // Load usage stats on mount
  useEffect(() => {
    loadUsageStats();
  }, []);

  const loadUsageStats = async () => {
    try {
      const stats = await usageValidator.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const {
    isMatching,
    matchingConfidence,
    chunksSent,
    startMatching,
    stopMatching,
    processChunk,
    reset: resetRealTime,
  } = useRealTimeRecognition();

  // Set up auto-stop callback
  useEffect(() => {
    audioRecorder.setOnAutoStop(() => {
      stopRecording();
    });
  }, []);

  // Cleanup: Stop recording when component unmounts (e.g., when navigating away)
  // NOTE: Empty dependency array so this ONLY runs on actual unmount, not on state changes
  useEffect(() => {
    return () => {
      console.log('🧹 HomeScreen unmounting, cleaning up recording...');
      // Check if recording is still active
      if (audioRecorder.isRecording()) {
        audioRecorder.disableChunking();
        audioRecorder.stopChunkedRecording().catch((err) => {
          console.error('Error stopping recording on unmount:', err);
        });
      }
      // Always stop matching on unmount
      stopMatching();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only cleanup on actual unmount

  const handleButtonPress = async () => {
    if (isRecording) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      console.log('🎙️ startRecording called');

      // Check usage limit FIRST (before recording)
      const usageCheck = await usageValidator.canPerformSearch();

      if (!usageCheck.allowed) {
        console.log('❌ Usage limit reached');
        setUpgradeReason(usageCheck.reason || 'Usage limit reached');
        setShowUpgradePrompt(true);
        return;
      }

      console.log(`✅ Usage check passed: ${usageCheck.remaining}/${usageCheck.limit} remaining`);

      // Reset states
      isStoppingRef.current = false;
      matchFoundRef.current = false;
      setShowRetry(false);
      setProcessing(false);

      // Request permissions
      const hasPermission = await audioRecorder.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Microphone Permission', ERROR_MESSAGES.MICROPHONE_DENIED, [
          { text: 'OK' },
        ]);
        return;
      }

      console.log('✅ Permissions granted');

      // Enable chunking with callback for SINGLE chunk
      audioRecorder.enableChunking(
        { chunkInterval: REALTIME_MATCHING_CONFIG.CHUNK_INTERVAL },
        async chunk => {
          console.log(`📦 Single chunk ready: ${chunk.duration}ms`);

          // Stop recording hardware (no more chunks)
          console.log('🛑 Stopping recording hardware...');
          setRecording(false);
          audioRecorder.disableChunking();
          await audioRecorder.stopChunkedRecording();

          // Set processing state
          console.log('⏳ Starting to process chunk...');
          setProcessing(true);

          try {
            // Process the single chunk (BEFORE stopping matching!)
            console.log('📤 Processing chunk...');
            await processChunk(chunk);
            console.log('✅ Chunk processing completed');

            // NOW stop matching after processing is done
            console.log('🛑 Stopping matching after processing');
            stopMatching();

            // Wait a bit for the callback to execute
            setTimeout(() => {
              // If no match was found, show retry
              if (!matchFoundRef.current) {
                console.log('⏱️ No match found after processing');
                setProcessing(false);
                setShowRetry(true);
                Alert.alert(
                  'No Match Found',
                  'Could not identify the recitation. Please try again with a clearer audio.',
                  [{ text: 'OK' }]
                );
              }
            }, 2000);
          } catch (error) {
            console.error('❌ Error processing chunk:', error);
            stopMatching(); // Stop matching on error too
            setProcessing(false);
            setShowRetry(true);
            Alert.alert(
              'Processing Failed',
              'Failed to process audio. Please try again.',
              [{ text: 'OK' }]
            );
          }
        }
      );

      console.log('✅ Single-chunk mode enabled');

      // Start real-time matching with auto-navigation callback
      startMatching(async (result: RecognitionResult) => {
        console.log('🎯 Match found! Auto-navigating...');
        console.log('📍 Navigation params:', {
          surahNumber: result.surah?.number,
          surahName: result.surah?.nameTransliteration,
          ayahNumber: result.ayah?.ayahNumber,
          ayahId: result.ayah?.id,
        });

        // Mark that match was found
        matchFoundRef.current = true;

        // Increment usage counter AFTER successful recognition
        try {
          await usageValidator.incrementUsage();
          console.log('✅ Usage incremented');

          // Reload usage stats to update UI
          await loadUsageStats();
        } catch (error) {
          console.error('Error incrementing usage:', error);
          // Don't block navigation on usage tracking error
        }

        // Clear processing state
        setProcessing(false);

        // Navigate directly to Surah with the matched verse
        if (result.surah && result.ayah) {
          navigation.navigate('Surah', {
            surahNumber: result.surah.number,
            surahName: result.surah.nameTransliteration,
            highlightAyah: result.ayah.ayahNumber,
            fromRecognition: true,
          });
        }
      });

      console.log('✅ Real-time matching started');

      // Start chunked recording (will record for CHUNK_INTERVAL then auto-stop)
      await audioRecorder.startChunkedRecording();
      setRecording(true);

      console.log('🎙️ Recording single chunk...');
    } catch (error: any) {
      console.error('Start recording error:', error);
      setProcessing(false);
      setShowRetry(true);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      console.log('⏹️ Manual stopRecording called');

      // Prevent multiple simultaneous stop calls
      if (isStoppingRef.current) {
        console.log('⚠️ Already stopping, skipping duplicate call');
        return;
      }

      // Check if still recording before stopping
      if (!isRecording) {
        console.log('Not recording, skipping stop');
        return;
      }

      // Mark as stopping
      isStoppingRef.current = true;

      // Set to false first to prevent multiple calls
      setRecording(false);

      stopMatching();
      audioRecorder.disableChunking();
      await audioRecorder.stopChunkedRecording();

      console.log('🛑 Recording stopped manually');

      // Reset stopping flag
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 500);
    } catch (error: any) {
      console.error('Stop recording error:', error);
      isStoppingRef.current = false;
    }
  };

  const handleRetry = () => {
    console.log('🔄 Retry button pressed');
    setShowRetry(false);
    startRecording();
  };

  const handleUpgrade = () => {
    setShowUpgradePrompt(false);
    // TODO: Navigate to auth/subscription screen
    // For now, just log
    console.log('Upgrade button pressed');
    Alert.alert(
      'Coming Soon',
      'Sign up and subscription features will be available soon!',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="h1" align="center">
            Ayahfinder
          </Text>
          <Text variant="body" color={COLORS.text.secondary} align="center">
            Identify Quran recitations instantly
          </Text>

          {/* Usage Counter */}
          {usageStats && (
            <View style={styles.usageCounter}>
              <Ionicons
                name="flash-outline"
                size={16}
                color={usageStats.remaining === 0 ? COLORS.error[500] : COLORS.primary[500]}
              />
              <Text
                variant="caption"
                color={usageStats.remaining === 0 ? COLORS.error[500] : COLORS.primary[500]}
              >
                {usageStats.remaining}/{usageStats.limit} searches {usageStats.period === 'daily' ? 'today' : 'this month'}
              </Text>
            </View>
          )}
        </View>

        {/* Listen Button */}
        <View style={styles.buttonContainer}>
          <ListenButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            onPress={handleButtonPress}
          />

          {/* Retry Button */}
          {showRetry && !isRecording && !isProcessing && (
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <Ionicons name="refresh" size={24} color={COLORS.primary[500]} />
              <Text variant="body" color={COLORS.primary[500]}>
                Retry
              </Text>
            </Pressable>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          {isProcessing ? (
            <Text
              variant="body"
              align="center"
              color={COLORS.primary[500]}
            >
              Processing audio...
            </Text>
          ) : (
            <>
              <Text
                variant="caption"
                align="center"
                color={COLORS.text.secondary}
              >
                Tap the button and play a Quran recitation
              </Text>
              <Text
                variant="caption"
                align="center"
                color={COLORS.text.secondary}
              >
                Recording will auto-stop after {REALTIME_MATCHING_CONFIG.CHUNK_INTERVAL / 1000} seconds
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Upgrade Prompt Modal */}
      {usageStats && (
        <UpgradePrompt
          visible={showUpgradePrompt}
          tier={usageStats.tier}
          remaining={usageStats.remaining}
          limit={usageStats.limit}
          reason={upgradeReason}
          onUpgrade={handleUpgrade}
          onDismiss={() => setShowUpgradePrompt(false)}
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 48,
  },
  header: {
    paddingHorizontal: 24,
    gap: 8,
  },
  usageCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background.paper,
    borderRadius: 20,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructions: {
    paddingHorizontal: 24,
    gap: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.background.paper,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary[500],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
