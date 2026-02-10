import { HapticService } from '@/services/haptic-service';
import React, { useCallback } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type HapticType = 'light' | 'medium' | 'heavy' | 'none';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
  haptic?: HapticType;
  disabled?: boolean;
}

const SPRING_CONFIG = { damping: 15, stiffness: 400 };

/**
 * AnimatedPressable - A universal pressable component with spring animations and haptics.
 * Provides consistent interaction feedback across the entire app.
 * Uses Gesture Handler for smoother gesture recognition.
 */
export default function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  scaleDown = 0.97,
  haptic = 'light',
  disabled = false,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const triggerHaptic = useCallback((type: HapticType) => {
    if (type === 'none') return;
    switch (type) {
      case 'light':
        HapticService.light();
        break;
      case 'medium':
        HapticService.medium();
        break;
      case 'heavy':
        HapticService.heavy();
        break;
    }
  }, []);

  const handlePress = useCallback(() => {
    if (!disabled && onPress) {
      onPress();
    }
  }, [disabled, onPress]);

  const handleLongPress = useCallback(() => {
    if (!disabled && onLongPress) {
      onLongPress();
    }
  }, [disabled, onLongPress]);

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scale.value = withSpring(scaleDown, SPRING_CONFIG);
      opacity.value = withSpring(0.9, SPRING_CONFIG);
      if (haptic !== 'none') {
        runOnJS(triggerHaptic)(haptic);
      }
    })
    .onEnd(() => {
      runOnJS(handlePress)();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withSpring(1, SPRING_CONFIG);
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(!disabled && !!onLongPress)
    .minDuration(500)
    .onStart(() => {
      runOnJS(triggerHaptic)('medium');
      runOnJS(handleLongPress)();
    });

  const composedGesture = onLongPress
    ? Gesture.Race(tapGesture, longPressGesture)
    : tapGesture;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : opacity.value,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
