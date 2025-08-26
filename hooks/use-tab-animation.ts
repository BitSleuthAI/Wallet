<<<<<<< HEAD
import { useFocusEffect } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
=======
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
>>>>>>> parent of af68dc7 (Refactor tab animation logic to utilize useFocusEffect for improved transitions)

// Global animation context for coordinated tab transitions
interface TabAnimationContext {
  currentTab: number;
  isAnimating: boolean;
  direction: 'forward' | 'backward';
  animations: Map<number, Animated.Value>;
}

const animationContext: TabAnimationContext = {
  currentTab: 0,
  isAnimating: false,
  direction: 'forward',
  animations: new Map(),
};

export const useTabAnimation = (tabIndex: number) => {
  const slideAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(1);
  const isInitialMount = useRef(true);

  // Register this tab's animation values
  useEffect(() => {
    animationContext.animations.set(tabIndex, slideAnim);
    
    return () => {
      animationContext.animations.delete(tabIndex);
    };
  }, [tabIndex, slideAnim]);

  useEffect(() => {
    // On initial mount, ensure content is visible and in position
    if (isInitialMount.current) {
      isInitialMount.current = false;
      animationContext.currentTab = tabIndex;
      // Ensure initial state is correct
<<<<<<< HEAD
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
=======
      slideAnim.setValue(0);
      opacityAnim.setValue(1);
      return;
    }

    // Only animate if we're actually changing tabs and not already animating
    if (tabIndex !== animationContext.currentTab && !animationContext.isAnimating) {
      const fromIndex = animationContext.currentTab;
      const toIndex = tabIndex;
      
      // Determine navigation direction
      const isForward = toIndex > fromIndex;
      const direction = isForward ? 'forward' : 'backward';
      
      // Update animation context
      animationContext.isAnimating = true;
      animationContext.direction = direction;
      
      // Get the current tab's animation value
      const currentTabAnim = animationContext.animations.get(fromIndex);
      
      if (currentTabAnim) {
        // Animate the current tab OUT
        const slideOut = Animated.timing(currentTabAnim, {
          toValue: isForward ? -100 : 100, // Left for forward, right for backward
          duration: 300,
          useNativeDriver: true,
        });
        
        // Animate the new tab IN
        const slideIn = Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        });
        
        // Animate both simultaneously
        const parallelAnimation = Animated.parallel([
          slideOut,
          slideIn,
        ]);
        
        // Start the coordinated animation
        parallelAnimation.start(() => {
          // Animation completed, update context
          animationContext.isAnimating = false;
          animationContext.currentTab = toIndex;
          
          // Reset the old tab's position
          currentTabAnim.setValue(0);
        });
        
        // Set initial position for new tab
        if (isForward) {
          slideAnim.setValue(100); // Start from right
        } else {
          slideAnim.setValue(-100); // Start from left
        }
        
        // Reset opacity for smooth transition
        opacityAnim.setValue(0);
        
        // Fade in the new tab
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        return () => {
          // Cleanup animations
          parallelAnimation.stop();
        };
      }
    }
  }, [tabIndex, slideAnim, opacityAnim]);

  const animatedStyle = {
    transform: [{ translateX: slideAnim }],
    opacity: opacityAnim,
  };
>>>>>>> parent of af68dc7 (Refactor tab animation logic to utilize useFocusEffect for improved transitions)

  return { animatedStyle };
};
