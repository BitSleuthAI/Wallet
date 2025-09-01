import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '@/types/wallet';

interface GradientBackgroundProps {
  theme: Theme;
  style?: ViewStyle;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'subtle' | 'glow';
  direction?: 'vertical' | 'horizontal' | 'diagonal';
  intensity?: 'light' | 'medium' | 'strong';
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  theme,
  style,
  children,
  variant = 'primary',
  direction = 'vertical',
  intensity = 'medium',
}) => {
  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (theme.isDark) {
      switch (variant) {
        case 'primary':
          return [theme.colors.background, theme.colors.surface, theme.colors.surfaceDark];
        case 'secondary':
          return [theme.colors.surfaceDark, theme.colors.surface, theme.colors.background];
        case 'accent':
          return [
            `${theme.colors.glowPrimary}`,
            theme.colors.background,
            `${theme.colors.glowAccent}`,
          ];
        case 'subtle':
          return [theme.colors.background, theme.colors.surface];
        case 'glow':
          return [
            theme.colors.background,
            `${theme.colors.glowPrimary}`,
            `${theme.colors.glowSecondary}`,
            theme.colors.background,
          ];
        default:
          return [theme.colors.background, theme.colors.surface];
      }
    } else {
      switch (variant) {
        case 'primary':
          return [
            theme.colors.background,
            `${theme.colors.glowPrimary}`,
            theme.colors.background,
          ];
        case 'secondary':
          return [
            theme.colors.surfaceLight,
            theme.colors.background,
            theme.colors.surfaceLight,
          ];
        case 'accent':
          return [
            `${theme.colors.glowAccent}`,
            theme.colors.background,
            `${theme.colors.glowPrimary}`,
          ];
        case 'subtle':
          return [theme.colors.background, theme.colors.surfaceLight];
        case 'glow':
          return [
            theme.colors.background,
            `${theme.colors.glowPrimary}`,
            `${theme.colors.glowSecondary}`,
            theme.colors.background,
          ];
        default:
          return [theme.colors.background, theme.colors.surface];
      }
    }
  };

  const getGradientLocations = (): readonly [number, number, ...number[]] | undefined => {
    switch (intensity) {
      case 'light':
        return [0, 0.5, 1] as const;
      case 'strong':
        return [0, 0.3, 0.7, 1] as const;
      case 'medium':
      default:
        return undefined;
    }
  };

  const getGradientAngle = () => {
    switch (direction) {
      case 'horizontal':
        return { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
      case 'diagonal':
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
      case 'vertical':
      default:
        return { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
    }
  };

  if (Platform.OS === 'web') {
    // Fallback for web with CSS gradients
    const colors = getGradientColors();
    const gradientDirection = direction === 'horizontal' ? 'to right' : 
                             direction === 'diagonal' ? 'to bottom right' : 
                             'to bottom';
    
    return (
      <View
        style={[
          styles.container,
          {
            background: `linear-gradient(${gradientDirection}, ${colors.join(', ')})`,
          } as any,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={getGradientColors()}
      locations={getGradientLocations()}
      {...getGradientAngle()}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
};

interface GradientCardProps {
  theme: Theme;
  style?: ViewStyle;
  children?: React.ReactNode;
  variant?: 'primary' | 'accent' | 'glow';
}

export const GradientCard: React.FC<GradientCardProps> = ({
  theme,
  style,
  children,
  variant = 'primary',
}) => {
  const getCardColors = (): readonly [string, string, ...string[]] => {
    if (theme.isDark) {
      switch (variant) {
        case 'accent':
          return [theme.colors.cardBackground, theme.colors.surface];
        case 'glow':
          return [
            theme.colors.cardBackground,
            `${theme.colors.glowPrimary}`,
            theme.colors.cardBackground,
          ];
        case 'primary':
        default:
          return [theme.colors.surface, theme.colors.cardBackground];
      }
    } else {
      switch (variant) {
        case 'accent':
          return [theme.colors.cardBackground, `${theme.colors.glowAccent}`];
        case 'glow':
          return [
            theme.colors.cardBackground,
            `${theme.colors.glowPrimary}`,
            theme.colors.cardBackground,
          ];
        case 'primary':
        default:
          return [theme.colors.cardBackground, theme.colors.surfaceLight];
      }
    }
  };

  if (Platform.OS === 'web') {
    const colors = getCardColors();
    return (
      <View
        style={[
          styles.card,
          {
            background: `linear-gradient(135deg, ${colors.join(', ')})`,
            borderColor: theme.colors.cardBorder,
          } as any,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={getCardColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        { borderColor: theme.colors.cardBorder },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
});