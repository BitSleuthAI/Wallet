import { useFocusEffect } from 'expo-router';
import { useRef } from 'react';
import { Animated } from 'react-native';

export const useTabAnimation = (tabIndex: number) => {
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const isInitialMount = useRef(true);

  useFocusEffect(
    () => {
      // Skip animation on initial mount for instant first load
      if (isInitialMount.current) {
        isInitialMount.current = false;
        opacityAnim.setValue(1);
        translateY.setValue(0);
        return;
      }

      // Combined fade + subtle slide animation for premium feel
      opacityAnim.setValue(0);
      translateY.setValue(8);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 300,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  );

  const animatedStyle = {
    opacity: opacityAnim,
    transform: [{ translateY }],
  };

  return { animatedStyle };
};
