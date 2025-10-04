import HapticService from '@/services/haptic-service';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface PremiumButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function PremiumButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: PremiumButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    HapticService.light();
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  }, [disabled, loading, scale]);

  const handlePressOut = useCallback(() => {
    if (disabled || loading) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [disabled, loading, scale]);

  const handlePress = useCallback(async () => {
    if (disabled || loading) return;

    try {
      await onPress();
      
      // Success animation - only triggered after successful completion
      scale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 400 })
      );
      HapticService.success();
    } catch (error) {
      // Error feedback animation
      opacity.value = withSequence(
        withTiming(0.6, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      HapticService.error();
    }
  }, [disabled, loading, onPress, scale, opacity]);

  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return ['#26F5FE', '#00BCD4'];
      case 'secondary':
        return ['#FF8A65', '#FF6B6B'];
      case 'success':
        return ['#00E676', '#00C853'];
      case 'danger':
        return ['#FF5252', '#E91E63'];
      default:
        return ['#26F5FE', '#00BCD4'];
    }
  };

  const buttonContent = (
    <>
      {loading && <ActivityIndicator size="small" color="white" style={styles.loader} />}
      {!loading && icon && <>{icon}</>}
      <Text style={[styles.text, textStyle, icon && styles.textWithIcon]}>
        {loading ? 'Loading...' : title}
      </Text>
    </>
  );

  return (
    <AnimatedTouchable
      style={[styles.button, animatedStyle, disabled && styles.disabled, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.gradient]}
      />
      {buttonContent}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    minHeight: 56,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    borderRadius: 16,
  },
  text: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textWithIcon: {
    marginLeft: 8,
  },
  loader: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});

