/**
 * Onboarding Screen
 * 3-slide first-launch experience explaining how AyahFinder works.
 * Shown once on first install; skippable at any time.
 */
import React, { useState } from 'react';
import { View, Text as RNText, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants';
import { useSettingsStore } from '@/presentation/store/settingsStore';

const SLIDES: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
}[] = [
  {
    icon: 'search-outline',
    title: 'Find Any Verse Instantly',
    body: 'AyahFinder identifies Quran verses from audio in seconds.',
  },
  {
    icon: 'ear-outline',
    title: 'Two Ways to Search',
    body: "Recite the verse yourself, or play a recitation near your phone — we'll find the match.",
  },
  {
    icon: 'library-outline',
    title: 'Explore the Quran',
    body: 'Browse all 114 Surahs. Matched verses are highlighted instantly in the full chapter.',
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const opacity = useSharedValue(1);
  const setHasSeenOnboarding = useSettingsStore(s => s.setHasSeenOnboarding);

  const slideStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const transition = (toIndex: number) => {
    opacity.value = withTiming(0, { duration: 160 }, finished => {
      if (finished) {
        runOnJS(setActiveIndex)(toIndex);
        opacity.value = withTiming(1, { duration: 200 });
      }
    });
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      transition(activeIndex + 1);
    } else {
      setHasSeenOnboarding(true);
    }
  };

  const slide = SLIDES[activeIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setHasSeenOnboarding(true)} hitSlop={12}>
          <RNText style={styles.skipText}>Skip</RNText>
        </Pressable>
      </View>

      {/* Slide content */}
      <Animated.View style={[styles.slideContent, slideStyle]}>
        <View style={styles.iconWrap}>
          <Ionicons name={slide.icon} size={56} color={COLORS.primary[600]} />
        </View>
        <RNText style={styles.title}>{slide.title}</RNText>
        <RNText style={styles.body}>{slide.body}</RNText>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleNext}
        >
          <RNText style={styles.buttonText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </RNText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFDF9',
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  skipText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary[50],
    borderWidth: 1.5,
    borderColor: COLORS.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 34,
  },
  body: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 26,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary[200],
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary[600],
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: COLORS.primary[600],
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
