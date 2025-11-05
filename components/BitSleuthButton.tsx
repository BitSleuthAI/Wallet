import { createButtonStyle } from '@/constants/themes';
import { HapticService } from '@/services/haptic-service';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

interface BitSleuthButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'ghost' | 'fun';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  emoji?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';
  animated?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function BitSleuthButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  emoji,
  style,
  textStyle,
  hapticType = 'light',
  animated = true,
}: BitSleuthButtonProps) {
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [isPressed, setIsPressed] = React.useState(false);

  // Size configurations
  const sizeConfig = {
    small: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, minHeight: 40 },
    medium: { paddingVertical: 14, paddingHorizontal: 20, fontSize: 16, minHeight: 52 },
    large: { paddingVertical: 18, paddingHorizontal: 24, fontSize: 18, minHeight: 60 },
  };

  const currentSize = sizeConfig[size];

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  // Press animations
  const handlePressIn = () => {
    if (!animated || disabled || loading) return;
    
    setIsPressed(true);
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    
    // Trigger haptic feedback
    HapticService[hapticType]();
  };

  const handlePressOut = () => {
    if (!animated || disabled || loading) return;
    
    setIsPressed(false);
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  // Success animation
  const triggerSuccessAnimation = () => {
    if (!animated) return;
    
    // Scale up then down
    scale.value = withSequence(
      withSpring(1.1, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
    
    // Slight rotation for delight
    rotation.value = withSequence(
      withTiming(-2, { duration: 100 }),
      withTiming(2, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
  };

  // Enhanced press handler
  const handlePress = async () => {
    if (disabled || loading) return;
    
    triggerSuccessAnimation();
    
    try {
      await onPress();
    } catch (err) {
      console.error('Button press error:', err);
      // Error animation
      if (animated) {
        opacity.value = withSequence(
          withTiming(0.7, { duration: 100 }),
          withTiming(1, { duration: 100 })
        );
      }
    }
  };

  // Button style
  const buttonStyle = [
    createButtonStyle({ colors: {}, shadows: {} }, variant),
    currentSize,
    style,
    animatedStyle,
  ];

  // Text style
  const textStyleConfig = [
    styles.text,
    { fontSize: currentSize.fontSize, color: variant === 'ghost' ? '#FF6B6B' : 'white' },
    textStyle,
  ];

  // Render content
  const renderContent = () => {
    if (loading) {
      return (
        <>
          <ActivityIndicator size="small" color="white" />
          <Text style={[textStyleConfig, styles.loadingText]}>Loading...</Text>
        </>
      );
    }

    return (
      <>
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <Text style={textStyleConfig}>{title}</Text>
      </>
    );
  };

  // Special handling for gradient variants
  if (variant === 'primary' && animated) {
    return (
      <AnimatedTouchableOpacity
        style={[buttonStyle, { overflow: 'hidden' }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#26F5FE', '#00BCD4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {renderContent()}
      </AnimatedTouchableOpacity>
    );
  }

  return (
    <AnimatedTouchableOpacity
      style={buttonStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {renderContent()}
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '600',
    textAlign: 'center',
    marginLeft: 4,
  },
  loadingText: {
    marginLeft: 8,
  },
  emoji: {
    fontSize: 18,
    marginRight: 6,
  },
});
