import { HapticService } from '@/services/haptic-service';
import React, { useCallback } from 'react';
import { AccessibilityRole, Insets, StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type HapticType = 'light' | 'medium' | 'heavy' | 'none';

/**
 * Props for the AnimatedPressable component
 */
interface AnimatedPressableProps {
  /** Content to render inside the pressable */
  children: React.ReactNode;
  /** Callback fired when the component is pressed */
  onPress?: () => void;
  /** Callback fired when the component is long-pressed (min 500ms) */
  onLongPress?: () => void;
  /** Custom styles to apply to the container */
  style?: StyleProp<ViewStyle>;
  /** Scale factor when pressed (default: 0.97) */
  scaleDown?: number;
  /** Haptic feedback type (default: 'light') */
  haptic?: HapticType;
  /** Whether the component is disabled (default: false) */
  disabled?: boolean;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility role (e.g., 'button', 'link') */
  accessibilityRole?: AccessibilityRole;
  /** Accessibility hint to describe the action */
  accessibilityHint?: string;
  /** Test identifier for testing frameworks */
  testID?: string;
  /** Expand the touchable area beyond the visible bounds */
  hitSlop?: Insets | number;
}

const SPRING_CONFIG = { damping: 15, stiffness: 400 };

/**
 * AnimatedPressable - A universal pressable component with spring animations and haptics.
 * Provides consistent interaction feedback across the entire app.
 * Uses Gesture Handler for smoother gesture recognition.
 * 
 * @example
 * ```tsx
 * <AnimatedPressable
 *   onPress={() => console.log('Pressed')}
 *   accessibilityLabel="Submit form"
 *   accessibilityRole="button"
 *   haptic="medium"
 * >
 *   <Text>Press Me</Text>
 * </AnimatedPressable>
 * ```
 */
const AnimatedPressable = React.memo<AnimatedPressableProps>(({
  children,
  onPress,
  onLongPress,
  style,
  scaleDown = 0.97,
  haptic = 'light',
  disabled = false,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityHint,
  testID,
  hitSlop,
}: AnimatedPressableProps) => {
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
      <Animated.View 
        style={[style, animatedStyle]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        testID={testID}
        // @ts-expect-error hitSlop is supported on View but not in types
        hitSlop={hitSlop}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
});

AnimatedPressable.displayName = 'AnimatedPressable';

export default AnimatedPressable;
