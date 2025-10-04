import HapticService from '@/services/haptic-service';
import { Check } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface SuccessAnimationProps {
  size?: number;
  color?: string;
  onComplete?: () => void;
}

export default function SuccessAnimation({ 
  size = 80, 
  color = '#00E676',
  onComplete,
}: SuccessAnimationProps) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(-180);
  const checkScale = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(1);

  useEffect(() => {
    // Trigger haptic feedback
    const hapticTimeout = setTimeout(() => HapticService.success(), 100);

    // Main circle animation
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    rotation.value = withSpring(0, { damping: 12, stiffness: 150 });

    // Check mark animation (delayed)
    checkScale.value = withDelay(
      200,
      withSpring(1, { damping: 10, stiffness: 300 })
    );

    // Ring expansion animation
    ringScale.value = withDelay(
      300,
      withSequence(
        withTiming(1.4, { duration: 600 }),
        withTiming(1.4, { duration: 100 })
      )
    );

    ringOpacity.value = withDelay(
      300,
      withSequence(
        withTiming(0.6, { duration: 300 }),
        withTiming(0, { duration: 400 })
      )
    );

    // Call onComplete after animation
    let completeTimeout: NodeJS.Timeout | undefined;
    if (onComplete) {
      completeTimeout = setTimeout(onComplete, 1000);
    }

    // Cleanup function to clear timeouts
    return () => {
      clearTimeout(hapticTimeout);
      if (completeTimeout) {
        clearTimeout(completeTimeout);
      }
    };
  }, []); // Empty dependency array - animation should only run once on mount

  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Expanding ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
          },
          ringStyle,
        ]}
      />
      
      {/* Main circle */}
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          circleStyle,
        ]}
      >
        <Animated.View style={checkStyle}>
          <Check color="white" size={size * 0.5} strokeWidth={3} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
  },
});

