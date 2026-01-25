/**
 * Home Screen
 * INCREMENTALLY TESTING: Step 7c - Add alerts for match results
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const audioRecorder = useState(() => new AudioRecorder())[0];
  const { isRecording, setRecording, isProcessing } = useRecognitionStore();
  const { recognize } = useRecognition();

  // Ref to prevent multiple stop calls
  const isStoppingRef = useRef(false);

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
  useEffect(() => {
    return () => {
      console.log('🧹 HomeScreen unmounting, cleaning up recording...');
      if (isRecording) {
        audioRecorder.disableChunking();
        audioRecorder.stopChunkedRecording().catch((err) => {
          console.error('Error stopping recording on unmount:', err);
        });
        setRecording(false);
        stopMatching();
      }
    };
  }, [isRecording]);

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

      // Reset stopping flag
      isStoppingRef.current = false;

      // Request permissions
      const hasPermission = await audioRecorder.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Microphone Permission', ERROR_MESSAGES.MICROPHONE_DENIED, [
          { text: 'OK' },
        ]);
        return;
      }

      console.log('✅ Permissions granted');

      // Enable chunking with callback
      audioRecorder.enableChunking(
        { chunkInterval: REALTIME_MATCHING_CONFIG.CHUNK_INTERVAL },
        async chunk => {
          console.log(
            `📦 Chunk ${chunk.chunkIndex} ready:`,
            chunk.duration,
            'ms',
            'isMatching:',
            isMatching
          );
          // Process chunk in real-time
          console.log('About to call processChunk...');
          await processChunk(chunk);
          console.log('processChunk completed for chunk', chunk.chunkIndex);
        }
      );

      console.log('✅ Chunking enabled');

      // Start real-time matching with auto-navigation callback
      startMatching((result: RecognitionResult) => {
        console.log('🎯 Match found! Auto-navigating...');
        console.log('📍 Navigation params:', {
          surahNumber: result.surah?.number,
          surahName: result.surah?.nameTransliteration,
          ayahNumber: result.ayah?.ayahNumber,
          ayahId: result.ayah?.id,
        });

        // Auto-stop recording
        stopRecording();

        // Navigate directly to Surah with the matched verse
        if (result.surah && result.ayah) {
          navigation.navigate('Surah', {
            surahNumber: result.surah.number,
            surahName: result.surah.nameTransliteration,
            highlightAyah: result.ayah.ayahNumber, // Fixed: use ayahNumber instead of number
            fromRecognition: true,
          });
        }
      });

      console.log('✅ Real-time matching started');

      // Start chunked recording
      await audioRecorder.startChunkedRecording();
      setRecording(true);

      console.log('🎙️ Started real-time matching...');
    } catch (error: any) {
      console.error('Start recording error:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      console.log('⏹️ stopRecording called');

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
      console.log('Setting recording to false');
      setRecording(false);

      console.log('Stopping matching');
      stopMatching();

      console.log('Disabling chunking');
      audioRecorder.disableChunking();

      console.log('Stopping chunked recording');
      await audioRecorder.stopChunkedRecording();

      console.log(`🛑 Stopped recording. Total chunks sent: ${chunksSent}`);

      // Reset stopping flag after a delay
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 1000);

      // If no match was found during real-time, show message
      if (matchingConfidence === 0) {
        Alert.alert(
          'No Match Found',
          'Could not identify the recitation. Please try again with a clearer audio.',
          [{ text: 'OK' }]
        );
      } else if (
        matchingConfidence <
        REALTIME_MATCHING_CONFIG.CONFIDENCE_THRESHOLD * 100
      ) {
        Alert.alert(
          'Low Confidence',
          `Found a possible match but confidence was only ${matchingConfidence}%. Please try again.`,
          [{ text: 'OK' }]
        );
      }

      console.log('✅ Stop recording complete');
    } catch (error: any) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Failed to stop recording');
      // Reset stopping flag on error
      isStoppingRef.current = false;
    }
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
        </View>

        {/* Listen Button */}
        <View style={styles.buttonContainer}>
          <ListenButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            onPress={handleButtonPress}
          />
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
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
            It will automatically find and show the verse
          </Text>
         
        </View>
      </View>
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
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructions: {
    paddingHorizontal: 24,
    gap: 4,
  },
});
