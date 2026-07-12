import { createButtonStyle } from '@/constants/themes';
import { useTheme } from '@/hooks/theme-store';
import { HapticService } from '@/services/haptic-service';
import React, { ReactNode, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Optional icon rendered to the left of the title */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * AppButton - The shared button primitive: themed variants built on
 * createButtonStyle, spring press feedback, haptics, and loading/disabled
 * states. Prefer this over ad-hoc TouchableOpacity buttons for CTAs.
 */
export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  testID,
}: AppButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const baseStyle = useMemo(() => {
    if (variant === 'destructive') {
      return { ...createButtonStyle(theme, 'primary'), backgroundColor: theme.colors.error };
    }
    return createButtonStyle(theme, variant);
  }, [theme, variant]);

  const textColor =
    variant === 'secondary' ? theme.colors.text
    : variant === 'outline' ? theme.colors.primary
    : '#FFFFFF';

  const handlePressIn = useCallback(() => {
    if (isDisabled) return;
    HapticService.light();
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [isDisabled, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={[baseStyle, isDisabled && styles.disabled, animatedStyle, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon ?? null}
          <Text style={[styles.text, { color: textColor }, textStyle]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default AppButton;
