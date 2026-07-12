import React, { forwardRef } from 'react';
import { Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';

interface PressableOpacityProps extends Omit<PressableProps, 'style'> {
  /** Opacity applied while pressed, mirroring TouchableOpacity's prop. */
  activeOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * PressableOpacity - drop-in replacement for TouchableOpacity built on
 * Pressable (per repo skill react-native-skills §9.3). Renders identically:
 * dims to `activeOpacity` while pressed. Prefer AppButton for real CTAs;
 * use this for rows, icon buttons, and other tap targets.
 */
export const PressableOpacity = forwardRef<View, PressableOpacityProps>(
  function PressableOpacity({ activeOpacity = 0.7, style, disabled, ...props }, ref) {
    return (
      <Pressable
        ref={ref}
        disabled={disabled}
        style={({ pressed }) => [
          style,
          pressed && !disabled ? { opacity: activeOpacity } : null,
        ]}
        {...props}
      />
    );
  }
);

export default PressableOpacity;
