import { useTheme } from '@/hooks/theme-store';
import { WalletsContext } from '@/hooks/wallet-contexts';
import { getLiquidGlassTint, getThinMaterialTint, getUltraThinMaterialTint, isIOS } from '@/utils/platform';
import { BlurView } from 'expo-blur';
import React, { useContext } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export type LiquidGlassVariant = 'chrome' | 'thin' | 'ultraThin';

interface LiquidGlassViewProps {
  /**
   * The variant of the liquid glass effect
   * - 'chrome': For prominent UI elements like tab bars
   * - 'thin': For cards and medium-emphasis surfaces
   * - 'ultraThin': For subtle overlays and backgrounds
   */
  variant?: LiquidGlassVariant;
  
  /**
   * Blur intensity (1-100)
   * @default 80
   */
  intensity?: number;
  
  /**
   * Additional styles to apply to the container
   */
  style?: StyleProp<ViewStyle>;
  
  /**
   * Child components
   */
  children?: React.ReactNode;
}

/**
 * LiquidGlassView component
 * 
 * Renders a blur effect with iOS 26+ liquid glass materials when available.
 * Falls back to standard blur on older iOS versions and renders a semi-transparent
 * view on Android.
 * 
 * @example
 * ```tsx
 * <LiquidGlassView variant="chrome" intensity={80}>
 *   <Text>Content here</Text>
 * </LiquidGlassView>
 * ```
 */
export function LiquidGlassView({
  variant = 'chrome',
  intensity = 80,
  style,
  children,
}: LiquidGlassViewProps) {
  const walletData = useContext(WalletsContext);
  const { theme } = useTheme();

  // Safety check: if context is not available yet, return null
  if (!walletData) {
    return null;
  }

  // Get the appropriate tint based on variant and theme
  const getTint = () => {
    switch (variant) {
      case 'ultraThin':
        return getUltraThinMaterialTint(theme.isDark);
      case 'thin':
        return getThinMaterialTint(theme.isDark);
      case 'chrome':
      default:
        return getLiquidGlassTint(theme.isDark);
    }
  };
  
  // On iOS, use BlurView for the liquid glass effect
  if (isIOS()) {
    return (
      <BlurView
        intensity={intensity}
        tint={getTint() as any}
        style={[styles.container, style]}
      >
        {children}
      </BlurView>
    );
  }
  
  // On Android, render a simple transparent container
  // The blur effect doesn't translate well to Android, so we keep it minimal
  // and let the content and gradient background do the visual work
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: 'transparent',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
