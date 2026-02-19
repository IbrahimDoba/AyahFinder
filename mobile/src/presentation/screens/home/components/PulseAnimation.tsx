/**
 * Pulse Animation Component
 * Three staggered ripple rings that scale outward from the button.
 *
 * Renders as absolute-fill children inside the parent buttonArea (160×160).
 * Each ring starts at 100% the button size and scales up via transform — so
 * no explicit centering coordinates are needed and the rings always align
 * perfectly with the button regardless of where PulseAnimation is placed.
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Ease-out curve: fast start, decelerates — looks natural for expanding rings
const EASE_OUT = Easing.bezier(0, 0, 0.2, 1);
const PULSE_DURATION = 2000;

interface PulseRingProps {
  delay: number;
  color: string;
  isActive: boolean;
}

function PulseRing({ delay, color, isActive }: PulseRingProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Reset before starting
      scale.value = 1;
      opacity.value = 0;

      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(2.6, { duration: PULSE_DURATION, easing: EASE_OUT }),
          ),
          -1,
          false,
        ),
      );

      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0.5, { duration: 0 }),
            withTiming(0, { duration: PULSE_DURATION, easing: EASE_OUT }),
          ),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      // Fade out fast at current scale — rings dissolve in place rather than
      // shrinking back in (which looked wrong while the processing UI appeared)
      opacity.value = withTiming(0, { duration: 180 });
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.ring, { backgroundColor: color }, animStyle]}
    />
  );
}

interface PulseAnimationProps {
  isActive: boolean;
  color?: string;
}

/**
 * Must be placed inside a View with explicit width/height (the "anchor").
 * The rings use absoluteFillObject, so they inherit the anchor's dimensions
 * and scale outward from its center.
 */
export function PulseAnimation({
  isActive,
  color = 'rgba(129,199,132,0.6)',
}: PulseAnimationProps) {
  return (
    <>
      <PulseRing delay={0} color={color} isActive={isActive} />
      <PulseRing delay={666} color={color} isActive={isActive} />
      <PulseRing delay={1333} color={color} isActive={isActive} />
    </>
  );
}

const styles = StyleSheet.create({
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 9999,
  },
});
