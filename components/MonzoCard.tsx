import { createCardShadow, createCardStyle } from '@/constants/themes';
import HapticService from '@/services/haptic-service';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    StyleSheet,
    TouchableOpacity,
    ViewStyle
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

interface MonzoCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'fun' | 'gradient';
  color?: 'purple' | 'yellow' | 'pink' | 'orange' | 'lime';
  onPress?: () => void;
  style?: ViewStyle;
  animated?: boolean;
  hapticFeedback?: boolean;
  shadowElevation?: 'small' | 'medium' | 'large';
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function MonzoCard({
  children,
  variant = 'default',
  color = 'purple',
  onPress,
  style,
  animated = true,
  hapticFeedback = true,
  shadowElevation = 'medium',
}: MonzoCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  
  // Animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.15);

  // Color mapping for fun variants
  const funColors = {
    purple: ['#9B59B6', '#8E44AD'],
    yellow: ['#F1C40F', '#F39C12'],
    pink: ['#E91E63', '#C2185B'],
    orange: ['#E67E22', '#D35400'],
    lime: ['#CDDC39', '#C0CA33'],
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
      shadowOpacity: shadowOpacity.value,
    };
  });

  // Press animations
  const handlePressIn = () => {
    if (!animated) return;
    
    setIsPressed(true);
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    translateY.value = withSpring(2, { damping: 15, stiffness: 300 });
    shadowOpacity.value = withTiming(0.05, { duration: 150 });
    
    if (hapticFeedback) {
      HapticService.light();
    }
  };

  const handlePressOut = () => {
    if (!animated) return;
    
    setIsPressed(false);
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
    shadowOpacity.value = withTiming(0.15, { duration: 150 });
  };

  // Card style
  const cardStyle = [
    createCardStyle({ colors: {}, shadows: {} }, variant),
    createCardShadow({ shadows: {} }, shadowElevation),
    style,
    animatedStyle,
  ];

  // Render card content
  const renderCardContent = () => {
    if (variant === 'gradient') {
      return (
        <LinearGradient
          colors={['#26F5FE', '#00BCD4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          {children}
        </LinearGradient>
      );
    }

    if (variant === 'fun') {
      return (
        <LinearGradient
          colors={funColors[color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          {children}
        </LinearGradient>
      );
    }

    return children;
  };

  // If card is pressable
  if (onPress) {
    return (
      <AnimatedTouchableOpacity
        style={[cardStyle, { overflow: 'hidden' }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {renderCardContent()}
      </AnimatedTouchableOpacity>
    );
  }

  // Static card
  return (
    <Animated.View style={[cardStyle, { overflow: 'hidden' }]}>
      {renderCardContent()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Additional styles can be added here if needed
});
