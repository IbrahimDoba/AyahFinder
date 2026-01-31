/**
 * Home Screen
 * Audio recognition with usage tracking
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, Pressable, AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
import { useAuthStore } from '@/presentation/store/authStore';
import { AudioRecorder } from '@/services/audio/AudioRecorder';
import { useRealTimeRecognition } from '@/presentation/hooks/useRealTimeRecognition';
import serverUsageService from '@/services/usage/ServerUsageService';
import { UpgradePrompt } from '@/presentation/components/usage/UpgradePrompt';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const audioRecorder = useState(() => new AudioRecorder())[0];
  const { isRecording, setRecording, isProcessing, setProcessing } =
    useRecognitionStore();
  const { user } = useAuthStore();

  // Refs to prevent multiple stop calls and track match state
  const isStoppingRef = useRef(false);
  const matchFoundRef = useRef(false);
  const [showRetry, setShowRetry] = useState(false);

  // Usage tracking state
  const [usageStats, setUsageStats] = useState<any | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string>('');

  // Load usage stats on mount and when auth state changes
  useEffect(() => {
    loadUsageStats();
  }, [user]);

  // Refresh usage stats when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadUsageStats();
    }, [])
  );

  // Refresh usage stats when app comes to foreground (e.g., after being in background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[Usage] App came to foreground, refreshing stats');
        loadUsageStats();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Set up midnight refresh timer
  useEffect(() => {
    const setupMidnightRefresh = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      console.log(`[Usage] Setting up midnight refresh in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
      
      // Set timeout to refresh at midnight
      const midnightTimeout = setTimeout(() => {
        console.log('[Usage] Midnight reached, refreshing usage stats');
        loadUsageStats();
        // Set up the next day's refresh
        setupMidnightRefresh();
      }, msUntilMidnight);
      
      return midnightTimeout;
    };

    const timeout = setupMidnightRefresh();
    
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const loadUsageStats = async () => {
    try {
      console.log('[Usage] Fetching usage stats from server...');
      const stats = await serverUsageService.getUsageStats();
      console.log('[Usage] Stats received:', stats);
      setUsageStats(stats);
    } catch (error) {
      console.error('[Usage] Error loading usage stats:', error);
    }
  };

  // Format time until reset (e.g., "Resets in 5 hours" or "Resets in 15 days")
  const getResetTimeText = (): string => {
    if (!usageStats?.resetAt) return '';
    
    const now = new Date();
    const resetTime = new Date(usageStats.resetAt);
    const diffMs = resetTime.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return 'Resets soon';
    }
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // For monthly resets (premium), show days
    if (usageStats.period === 'monthly') {
      const days = Math.floor(diffHours / 24);
      const remainingHours = diffHours % 24;
      if (days > 0) {
        return `Resets in ${days} day${days > 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours}h` : ''}`;
      }
      return `Resets in ${diffHours}h ${diffMinutes}m`;
    }
    
    // For daily resets (anonymous/free), show hours/minutes
    if (diffHours > 0) {
      return `Resets in ${diffHours}h ${diffMinutes}m`;
    } else {
      return `Resets in ${diffMinutes}m`;
    }
  };

  const { startMatching, stopMatching, processChunk } =
    useRealTimeRecognition();

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
        audioRecorder.stopChunkedRecording().catch(err => {
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
      const usageCheck = await serverUsageService.canPerformSearch();

      if (!usageCheck.allowed) {
        console.log('❌ Usage limit reached');
        setUpgradeReason(usageCheck.reason || 'Usage limit reached');
        setShowUpgradePrompt(true);
        return;
      }

      console.log(
        `✅ Usage check passed: ${usageCheck.remaining}/${usageCheck.limit} remaining`
      );

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

        // Usage is already incremented on the server, update UI with returned stats
        if (result.usage) {
          setUsageStats({
            used: result.usage.used,
            remaining: result.usage.remaining,
            limit: result.usage.limit,
            tier: (result.usage.subscriptionTier || 'anonymous') as any,
            resetAt: result.usage.resetAt ? new Date(result.usage.resetAt) : new Date(),
            period: result.usage.subscriptionTier === 'premium' ? 'monthly' : 'daily',
          });
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
      setRecording(false);

      // IMPORTANT: Stop the RECORDER hardware but don't stop the MATCHING hook yet
      // so it can still process the final chunk we're about to give it.
      audioRecorder.disableChunking();

      // Stop recording and get the final chunk
      const finalChunk = await audioRecorder.stopChunkedRecording();

      if (finalChunk && finalChunk.duration >= 500) {
        console.log(
          `🚀 Manual stop: processing final chunk (${finalChunk.duration}ms)`
        );
        setProcessing(true);
        try {
          // Call processChunk while matching is still "active" in the hook
          await processChunk(finalChunk);

          // NOW stop matching to prevent any other late results
          stopMatching();

          // Wait a bit for the navigation callback to execute if a match was found
          setTimeout(() => {
            if (!matchFoundRef.current) {
              console.log('⏱️ No match found after manual stop');
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
          console.error('❌ Error processing final chunk:', error);
          stopMatching();
          setProcessing(false);
          setShowRetry(true);
        }
      } else {
        console.log('⏹️ Recording stopped (no chunk or too short)');
        stopMatching();
        setProcessing(false);
      }

      // Reset stopping flag after a delay
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 500);
    } catch (error: any) {
      console.error('Stop recording error:', error);
      isStoppingRef.current = false;
      setProcessing(false);
    }
  };

  const handleRetry = () => {
    console.log('🔄 Retry button pressed');
    setShowRetry(false);
    startRecording();
  };

  const handleUpgrade = () => {
    setShowUpgradePrompt(false);
    
    // Navigate based on user's current tier
    if (usageStats?.tier === 'anonymous') {
      // Anonymous user - redirect to signup for free account (5 searches/day)
      navigation.navigate('SignUp');
    } else if (usageStats?.tier === 'free') {
      // Free user - navigate to Paywall to upgrade to premium
      navigation.navigate('Paywall');
    } else {
      // Premium user - go to profile/account
      navigation.navigate('Profile' as any);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.topRow}>
            <View style={{ width: 40 }} />
            <Text
              variant="h1"
              align="center"
              style={{ color: COLORS.primary[900] }}
            >
              Ayahfinder
            </Text>
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
          <Text variant="body" color={COLORS.primary[700]} align="center">
            Identify Quran recitations instantly
          </Text>

          {/* Usage Counter */}
          {usageStats && (
            <View style={styles.usageCounter}>
              <Ionicons
                name="flash-outline"
                size={16}
                color={
                  usageStats.remaining === 0
                    ? COLORS.error[500]
                    : COLORS.primary[500]
                }
              />
              <View style={styles.usageTextContainer}>
                <Text
                  variant="caption"
                  color={
                    usageStats.remaining === 0
                      ? COLORS.error[500]
                      : COLORS.primary[500]
                  }
                  style={styles.usageMainText}
                >
                  {`${usageStats.remaining}/${usageStats.limit} searches ${usageStats.period === 'daily' ? 'today' : 'this month'}`}
                </Text>
                {usageStats.remaining < usageStats.limit && (
                  <Text
                    variant="caption"
                    color={COLORS.text.secondary}
                    style={styles.usageResetText}
                  >
                    {getResetTimeText()}
                  </Text>
                )}
              </View>
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
            <Text variant="body" align="center" color={COLORS.primary[500]}>
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
                {`Recording will auto-stop after ${REALTIME_MATCHING_CONFIG.CHUNK_INTERVAL / 1000} seconds`}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileButton: {
    padding: 4,
  },
  usageCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  usageTextContainer: {
    alignItems: 'center',
  },
  usageMainText: {
    fontWeight: '600',
  },
  usageResetText: {
    fontSize: 10,
    marginTop: 2,
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
    backgroundColor: '#E8F5E9',
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
