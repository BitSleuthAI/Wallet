import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Simple tab index tracking
let lastTabIndex = 0;

export const useTabAnimation = (tabIndex: number) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip animation on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastTabIndex = tabIndex;
      return;
    }

    // Determine slide direction based on tab index change
    // REVERSED LOGIC: Forward navigation slides from LEFT, backward slides from RIGHT
    const slideDirection = tabIndex > lastTabIndex ? -1 : 1; // Reversed from original
    const slideDistance = 100;

    // Only animate if we're actually changing tabs
    if (tabIndex !== lastTabIndex) {
      // Slide in from the appropriate direction with fade in
      const slideIn = Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]);

      // Start with slide out position based on direction
      slideAnim.setValue(slideDirection * slideDistance);
      opacityAnim.setValue(0);

      // Animate in
      slideIn.start();

      // Update last tab index for next comparison
      lastTabIndex = tabIndex;

      return () => {
        // Cleanup animations
        slideIn.stop();
      };
    }
  }, [tabIndex, slideAnim, opacityAnim]);

  const animatedStyle = {
    transform: [{ translateX: slideAnim }],
    opacity: opacityAnim,
  };

  return { animatedStyle };
};
