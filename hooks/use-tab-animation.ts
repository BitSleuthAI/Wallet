import { useFocusEffect } from 'expo-router';
import { useRef } from 'react';
import { Animated } from 'react-native';

export const useTabAnimation = (tabIndex: number) => {
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const isInitialMount = useRef(true);

  // Use useFocusEffect to detect when this tab comes into focus
  useFocusEffect(
    () => {
      // Skip animation on initial mount for instant first load
      if (isInitialMount.current) {
        isInitialMount.current = false;
        opacityAnim.setValue(1);
        return;
      }

      // Lightweight fade animation only - no slide for better performance
      opacityAnim.setValue(0.85);
      
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150, // Reduced from 300ms for snappier feel
        useNativeDriver: true,
      }).start();
    }
  );

  const animatedStyle = {
    opacity: opacityAnim,
  };

  return { animatedStyle };
};
