/**
 * Pulse Animation Component
 * Animated pulse effect for listen button
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS } from '@/constants';

interface PulseAnimationProps {
  isActive: boolean;
  size?: number;
}

export function PulseAnimation({ isActive, size = 200 }: PulseAnimationProps) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.7)).current;
  const opacity2 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!isActive) {
      // Reset
      pulse1.setValue(1);
      pulse2.setValue(1);
      opacity1.setValue(0.7);
      opacity2.setValue(0.5);
      return;
    }

    // Start pulsing animations
    const animation1 = Animated.loop(
      Animated.parallel([
        Animated.timing(pulse1, {
          toValue: 1.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity1, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    const animation2 = Animated.loop(
      Animated.parallel([
        Animated.timing(pulse2, {
          toValue: 1.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity2, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Start second animation with delay
    setTimeout(() => animation2.start(), 300);
    animation1.start();

    return () => {
      animation1.stop();
      animation2.stop();
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pulse1 }],
            opacity: opacity1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pulse2 }],
            opacity: opacity2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    backgroundColor: COLORS.primary[500],
  },
});
