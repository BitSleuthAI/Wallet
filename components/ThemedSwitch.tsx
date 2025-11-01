import { platformStyles } from '@/constants/themes';
import type { Theme } from '@/types/wallet';
import React from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

interface ThemedSwitchProps {
  /**
   * Current switch value
   */
  value: boolean;
  
  /**
   * Callback when value changes
   */
  onValueChange: (value: boolean) => void;
  
  /**
   * Theme object for consistent styling
   */
  theme: Theme;
  
  /**
   * Test ID for testing
   */
  testID?: string;
  
  /**
   * Whether the switch is disabled
   */
  disabled?: boolean;
}

/**
 * ThemedSwitch component
 * 
 * A consistent toggle switch across the app with theme-aware colors:
 * 
 * Light Mode:
 * - Track OFF: Light grey (#E5E7EB)
 * - Track ON: Orange (theme.colors.primary)
 * - Thumb: White (#FFFFFF)
 * 
 * Dark Mode:
 * - Track OFF: Darker grey (#374151)
 * - Track ON: Bright teal/cyan (theme.colors.primary)
 * - Thumb: White (#FFFFFF)
 * 
 * Consistent behavior across iOS, Android, and Web platforms.
 */
export function ThemedSwitch({
  value,
  onValueChange,
  theme,
  testID,
  disabled = false,
}: ThemedSwitchProps) {
  // Consistent colors across all toggles
  const trackColorOff = theme.isDark ? '#374151' : '#E5E7EB'; // Slightly darker grey for dark mode, light grey for light mode
  const trackColorOn = theme.colors.primary; // Orange in light mode, cyan in dark mode
  const thumbColor = '#FFFFFF'; // Always white for maximum contrast
  
  if (Platform.OS === 'web') {
    // Custom web switch for consistent styling
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        onPress={() => !disabled && onValueChange(!value)}
        style={[
          styles.webSwitch,
          {
            backgroundColor: value ? trackColorOn : trackColorOff,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        testID={testID}
        disabled={disabled}
      >
        <View
          style={[
            styles.webSwitchThumb,
            {
              transform: [{ translateX: value ? 24 : 2 }],
              backgroundColor: thumbColor,
            },
          ]}
        />
      </Pressable>
    );
  }
  
  // Native switch for iOS and Android
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{
        false: trackColorOff,
        true: trackColorOn,
      }}
      thumbColor={thumbColor}
      ios_backgroundColor={trackColorOff}
      testID={testID}
      disabled={disabled}
      // On Android, the thumb color is always white
      // On iOS, we rely on the default system behavior with white thumb
    />
  );
}

const styles = StyleSheet.create({
  webSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center' as const,
    position: 'relative' as const,
  },
  webSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute' as const,
    ...platformStyles.shadow,
  },
});
