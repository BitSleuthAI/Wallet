import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export const useTabAnimation = () => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in from right with fade in
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

    // Start with slide out position
    slideAnim.setValue(100);
    opacityAnim.setValue(0);

    // Animate in
    slideIn.start();

    return () => {
      // Cleanup animations
      slideIn.stop();
    };
  }, [slideAnim, opacityAnim]);

  const animatedStyle = {
    transform: [{ translateX: slideAnim }],
    opacity: opacityAnim,
  };

  return { animatedStyle };
};
