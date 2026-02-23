import React, { useEffect } from 'react';
import { StyleProp, TextInput, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedProps,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedNumberProps {
  value: number;
  formatter?: (value: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * AnimatedNumber - Smoothly animates between numeric values with a counting effect.
 * Used for balance displays, price tickers, and any numeric value that changes over time.
 * Creates a premium feel by making value changes feel alive rather than instant.
 */
export default function AnimatedNumber({
  value,
  formatter,
  style,
  duration = 800,
  prefix = '',
  suffix = '',
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration });
  }, [value, duration, animatedValue]);

  // Scale animation on value change for emphasis
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1.02, { damping: 8, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    });
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const format = formatter || ((v: number) => v.toFixed(2));

  const animatedProps = useAnimatedProps(() => {
    const text = `${prefix}${format(animatedValue.value)}${suffix}`;
    return {
      text,
      defaultValue: text,
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <AnimatedTextInput
        editable={false}
        underlineColorAndroid="transparent"
        style={[{ padding: 0, margin: 0 }, style]}
        animatedProps={animatedProps}
      />
    </Animated.View>
  );
}
