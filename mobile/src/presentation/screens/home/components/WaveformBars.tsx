/**
 * Waveform Bars Component
 * Animated audio equalizer visualization shown during recording.
 * Uses Easing.bezier instead of Easing.inOut/sine for Reanimated v4 compat.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '@/constants';

const MAX_HEIGHT = 36;
const MIN_HEIGHT = 5;
const BAR_WIDTH = 5;

// Smooth ease-in-out for organic bar movement (equivalent to ease-in-out-sine)
const EASE_INOUT = Easing.bezier(0.37, 0, 0.63, 1);

// Each bar has independent speed + height sequence for natural-looking movement
const BAR_CONFIGS: { speed: number; ratios: number[] }[] = [
  { speed: 540, ratios: [0.55, 0.2, 0.85, 0.35] },
  { speed: 380, ratios: [0.9, 0.45, 0.65, 0.25] },
  { speed: 660, ratios: [1.0, 0.3, 0.75, 0.5] },
  { speed: 430, ratios: [0.45, 0.85, 0.3, 0.7] },
  { speed: 580, ratios: [0.7, 0.25, 0.95, 0.45] },
];

const toHeight = (ratio: number) =>
  MIN_HEIGHT + ratio * (MAX_HEIGHT - MIN_HEIGHT);

interface WaveBarProps {
  speed: number;
  ratios: number[];
  delay: number;
}

function WaveBar({ speed, ratios, delay }: WaveBarProps) {
  const barHeight = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    barHeight.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(toHeight(ratios[0]), {
            duration: speed,
            easing: EASE_INOUT,
          }),
          withTiming(toHeight(ratios[1]), {
            duration: speed * 0.7,
            easing: EASE_INOUT,
          }),
          withTiming(toHeight(ratios[2]), {
            duration: speed * 0.9,
            easing: EASE_INOUT,
          }),
          withTiming(toHeight(ratios[3]), {
            duration: speed * 0.8,
            easing: EASE_INOUT,
          }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    height: barHeight.value,
  }));

  return <Animated.View style={[styles.bar, style]} />;
}

export function WaveformBars() {
  return (
    <View style={styles.container}>
      {BAR_CONFIGS.map((config, i) => (
        <WaveBar
          key={i}
          speed={config.speed}
          ratios={config.ratios}
          delay={i * 70}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: MAX_HEIGHT + 8,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
    backgroundColor: COLORS.primary[400],
  },
});
