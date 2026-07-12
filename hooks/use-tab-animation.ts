import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

/**
 * Entrance animation for tab screens: a quick fade + subtle upward slide each
 * time the tab regains focus. Returns a Reanimated style — wrap the screen
 * content in Reanimated's <Animated.View style={[..., animatedStyle]}>.
 */
export const useTabAnimation = () => {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const isInitialMount = useRef(true);

  useFocusEffect(
    useCallback(() => {
      // Skip animation on initial mount for instant first load
      if (isInitialMount.current) {
        isInitialMount.current = false;
        opacity.value = 1;
        translateY.value = 0;
        return;
      }

      // Combined fade + subtle slide animation for premium feel
      opacity.value = 0;
      translateY.value = 8;
      opacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300, mass: 0.8 });
    }, [opacity, translateY])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { animatedStyle };
};
