import { useFocusEffect } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

export const useTabAnimation = (tabIndex: number) => {
  const slideAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(1);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // On initial mount, ensure content is visible and in position
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Ensure initial state is correct
      slideAnim.value = 0;
      opacityAnim.value = 1;
      console.log(`[Tab ${tabIndex}] Initial mount, setting position to center`);
      return;
    }
  }, [tabIndex]);

  // Use useFocusEffect to detect when this tab comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Skip animation on initial mount
      if (isInitialMount.current) {
        return;
      }

      console.log(`[Tab ${tabIndex}] Tab focused, animating in`);
      
      // Determine animation direction based on tab index
      // This is a simple heuristic - we'll animate based on the tab's position
      const shouldSlideFromRight = tabIndex > 1; // Settings tab (index 3) and Receive (index 2) slide from right
      
      if (shouldSlideFromRight) {
        // Slide in from RIGHT
        console.log(`[Tab ${tabIndex}] Animating in from RIGHT`);
        slideAnim.value = 100;
        opacityAnim.value = 0;
        
        slideAnim.value = withTiming(0, { duration: 300 });
        opacityAnim.value = withTiming(1, { duration: 300 });
      } else {
        // Slide in from LEFT
        console.log(`[Tab ${tabIndex}] Animating in from LEFT`);
        slideAnim.value = -100;
        opacityAnim.value = 0;
        
        slideAnim.value = withTiming(0, { duration: 300 });
        opacityAnim.value = withTiming(1, { duration: 300 });
      }
    }, [tabIndex])
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slideAnim.value }],
      opacity: opacityAnim.value,
    };
  });

  return { animatedStyle };
};
