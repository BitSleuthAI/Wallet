import { useFocusEffect } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export const useTabAnimation = (tabIndex: number) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const isInitialMount = useRef(true);

  useEffect(() => {
    // On initial mount, ensure content is visible and in position
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Ensure initial state is correct
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
      console.log(`[Tab ${tabIndex}] Initial mount, setting position to center`);
      return;
    }
  }, [tabIndex, slideAnim, opacityAnim]);

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
        slideAnim.setValue(100);
        opacityAnim.setValue(0);
        
        Animated.parallel([
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
        ]).start();
      } else {
        // Slide in from LEFT
        console.log(`[Tab ${tabIndex}] Animating in from LEFT`);
        slideAnim.setValue(-100);
        opacityAnim.setValue(0);
        
        Animated.parallel([
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
        ]).start();
      }
    }, [tabIndex, slideAnim, opacityAnim])
  );

  const animatedStyle = {
    transform: [{ translateX: slideAnim }],
    opacity: opacityAnim,
  };

  return { animatedStyle };
};
