/**
 * Listen Button Component
 * Clean recording button: color interpolation + spinner arc + spring press.
 * No pulse rings or waveform bars — removed to avoid green animation artifacts.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants';
import { PulseAnimation } from './PulseAnimation';

const BUTTON_SIZE = 160;
const SPINNER_SCALE = 1.16;

// State indices for interpolateColor
// Flow is always sequential: 0 → 1 → 2, never a jump, so no colour bleed-through
const STATE_IDLE = 0;
const STATE_RECORDING = 1;
const STATE_PROCESSING = 2;

const IDLE_COLOR = COLORS.primary[700];      // #388E3C — forest green
const RECORDING_COLOR = COLORS.primary[900]; // #1B5E20 — deep green
const PROCESSING_COLOR = '#6B7280';          // neutral gray

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
  const pressScale = useSharedValue(1);
  const stateValue = useSharedValue(STATE_IDLE);
  const spinAngle = useSharedValue(0);
  const spinnerOpacity = useSharedValue(0);

  useEffect(() => {
    if (isProcessing) {
      stateValue.value = withTiming(STATE_PROCESSING, { duration: 350 });
      spinnerOpacity.value = withTiming(1, { duration: 250 });
      spinAngle.value = withRepeat(
        withTiming(360, { duration: 1100, easing: Easing.linear }),
        -1,
        false,
      );
    } else if (isRecording) {
      stateValue.value = withTiming(STATE_RECORDING, { duration: 350 });
      spinnerOpacity.value = withTiming(0, { duration: 200 });
      cancelAnimation(spinAngle);
    } else {
      stateValue.value = withTiming(STATE_IDLE, { duration: 350 });
      spinnerOpacity.value = withTiming(0, { duration: 200 });
      cancelAnimation(spinAngle);
    }
  }, [isRecording, isProcessing]);

  const handlePressIn = () => {
    pressScale.value = withSpring(0.93, { damping: 20, stiffness: 450 });
  };
  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  // Single animated style handles both scale and colour — no layer bleed-through
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
    backgroundColor: interpolateColor(
      stateValue.value,
      [STATE_IDLE, STATE_RECORDING, STATE_PROCESSING],
      [IDLE_COLOR, RECORDING_COLOR, PROCESSING_COLOR],
    ),
  }));

  const spinnerContainerStyle = useAnimatedStyle(() => ({
    opacity: spinnerOpacity.value,
    transform: [{ rotate: `${spinAngle.value}deg` }],
  }));

  const getIcon = (): 'mic' | 'stop-circle' =>
    isRecording ? 'stop-circle' : 'mic';

  const getLabel = () => {
    if (isProcessing) return 'Analyzing recitation...';
    if (isRecording) return 'Listening...';
    return 'Tap to Listen';
  };

  return (
    <View style={styles.outer}>
      {/* buttonArea: 160×160 anchor for all absolutely-positioned children */}
      <View style={styles.buttonArea}>
        {/*
         * Pulse rings — always mounted so isActive=false triggers the internal
         * fade-out animation (180ms dissolve) rather than an abrupt unmount.
         * Rings only animate when isActive is true (recording, not processing).
         */}
        <PulseAnimation
          isActive={isRecording && !isProcessing}
          color={COLORS.primary[300]}
        />

        {/* Rotating arc — visible only during processing */}
        <Animated.View
          style={[styles.spinnerContainer, spinnerContainerStyle]}
          pointerEvents="none"
        >
          <View style={styles.spinnerRing} />
        </Animated.View>

        {/* Main button */}
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          disabled={isProcessing}
          accessibilityRole="button"
          accessibilityLabel={getLabel()}
        >
          <Animated.View style={[styles.button, buttonStyle]}>
            <Ionicons
              name={isProcessing ? 'mic' : getIcon()}
              size={54}
              color={isProcessing ? 'rgba(255,255,255,0.4)' : '#ffffff'}
            />
          </Animated.View>
        </Pressable>
      </View>

      {/* Status label */}
      <RNText style={[styles.label, isProcessing && styles.labelDimmed]}>
        {getLabel()}
      </RNText>

      {/* Hint — only shown while actively recording */}
      {isRecording && !isProcessing && (
        <RNText style={styles.hint}>Tap to stop early</RNText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
  },

  buttonArea: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // absoluteFillObject + center → arc ring (slightly larger) stays centred,
  // whole container rotates for the spinner effect
  spinnerContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerRing: {
    width: BUTTON_SIZE * SPINNER_SCALE,
    height: BUTTON_SIZE * SPINNER_SCALE,
    borderRadius: (BUTTON_SIZE * SPINNER_SCALE) / 2,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.85)',
    borderRightColor: 'rgba(255,255,255,0.85)',
  },

  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },

  label: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: 0.2,
  },
  labelDimmed: {
    color: COLORS.text.secondary,
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.text.secondary,
    letterSpacing: 0.1,
  },
});
