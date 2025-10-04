import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface LoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export default function LoadingAnimation({ 
  size = 'medium', 
  color = '#26F5FE' 
}: LoadingAnimationProps) {
  const scale1 = useSharedValue(0.8);
  const scale2 = useSharedValue(0.8);
  const scale3 = useSharedValue(0.8);
  const opacity1 = useSharedValue(0.3);
  const opacity2 = useSharedValue(0.3);
  const opacity3 = useSharedValue(0.3);

  const sizeMap = {
    small: 12,
    medium: 16,
    large: 20,
  };

  const dotSize = sizeMap[size];

  useEffect(() => {
    const animation = (scaleValue: Animated.SharedValue<number>, opacityValue: Animated.SharedValue<number>, delay: number) => {
      scaleValue.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.2, { duration: 600 }),
            withTiming(0.8, { duration: 600 })
          ),
          -1,
          false
        )
      );
      
      opacityValue.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 600 }),
            withTiming(0.3, { duration: 600 })
          ),
          -1,
          false
        )
      );
    };

    animation(scale1, opacity1, 0);
    animation(scale2, opacity2, 200);
    animation(scale3, opacity3, 400);
  }, [scale1, scale2, scale3, opacity1, opacity2, opacity3]);

  const animatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
    opacity: opacity3.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, backgroundColor: color },
          animatedStyle1,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, backgroundColor: color },
          animatedStyle2,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, backgroundColor: color },
          animatedStyle3,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    borderRadius: 999,
  },
});

