import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Simple tab index tracking
let lastTabIndex = 0;

export const useTabAnimation = (tabIndex: number) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const isInitialMount = useRef(true);

  useEffect(() => {
    // On initial mount, ensure content is visible and in position
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastTabIndex = tabIndex;
      // Ensure initial state is correct
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
      return;
    }

    // Only animate if we're actually changing tabs
    if (tabIndex !== lastTabIndex) {
      // Determine navigation direction
      const isForward = tabIndex > lastTabIndex;
      
      // Set initial positions based on direction
      if (isForward) {
        // Forward: Current tab slides LEFT, new tab slides in from RIGHT
        slideAnim.setValue(100); // Start from right
      } else {
        // Backward: Current tab slides RIGHT, new tab slides in from LEFT
        slideAnim.setValue(-100); // Start from left
      }
      
      // Reset opacity for smooth transition
      opacityAnim.setValue(0);

      // Animate to center position with fade in
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

      // Start animation
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
