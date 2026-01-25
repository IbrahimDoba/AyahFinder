/**
 * Listen Button Component
 * Main button for starting/stopping audio recording with HeroUI
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  Text as RNText,
} from 'react-native';
import { Spinner } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';
import { PulseAnimation } from './PulseAnimation';

interface ListenButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onPress: () => void;
}

export function ListenButton({
  isRecording,
  isProcessing,
  onPress,
}: ListenButtonProps) {
  const getButtonText = () => {
    if (isProcessing) return 'Processing...';
    if (isRecording) return 'Listening...';
    return 'Tap to Listen';
  };

  const getButtonColor = () => {
    if (isProcessing) return '#9ca3af';
    if (isRecording) return '#ef4444';
    return '#1e40af';
  };

  return (
    <View style={styles.container}>
      <PulseAnimation isActive={isRecording} size={280} />

      <Pressable
        style={[
          styles.button,
          { backgroundColor: getButtonColor() },
        ]}
        onPress={onPress}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Spinner size="lg" color="#ffffff" />
        ) : (
          <Ionicons
            name={isRecording ? "stop-circle" : "mic"}
            size={64}
            color="#ffffff"
          />
        )}
        <RNText style={styles.text}>{getButtonText()}</RNText>
      </Pressable>

      {isRecording && (
        <RNText style={styles.hint}>Tap again to stop</RNText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  hint: {
    marginTop: 24,
    color: '#6b7280',
    fontSize: 14,
  },
});
