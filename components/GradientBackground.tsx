import { platformStyles } from '@/constants/themes';
import { Theme } from '@/types/wallet';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

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
  const getGradientColors = useMemo((): readonly [string, string, ...string[]] => {
    if (theme.isDark) {
      switch (variant) {
        case 'primary':
          // Gradient fades to solid background at bottom for tab bar consistency
          return [theme.colors.background, theme.colors.surface, theme.colors.background];
        case 'secondary':
          return [theme.colors.surfaceDark, theme.colors.surface, theme.colors.background];
        case 'accent':
          return [
            `${theme.colors.glowPrimary}`,
            theme.colors.background,
            theme.colors.background, // End with solid background for tab bar
          ];
        case 'subtle':
          return [theme.colors.background, theme.colors.surface, theme.colors.background];
        case 'glow':
          return [
            theme.colors.background,
            `${theme.colors.glowPrimary}`,
            `${theme.colors.glowSecondary}`,
            theme.colors.background, // End with solid background for tab bar
          ];
        default:
          return [theme.colors.background, theme.colors.surface, theme.colors.background];
      }
    } else {
      // Light mode mirrors the dark branch: soft system-grey background with a
      // subtle warm glow, ending in solid surface white for tab bar consistency
      switch (variant) {
        case 'primary':
          return [theme.colors.background, theme.colors.surface, theme.colors.surface];
        case 'secondary':
          return [theme.colors.surfaceDark, theme.colors.surface, theme.colors.surface];
        case 'accent':
          return [
            `${theme.colors.glowPrimary}`,
            theme.colors.background,
            theme.colors.surface, // End with solid surface for tab bar
          ];
        case 'subtle':
          return [theme.colors.background, theme.colors.surface, theme.colors.surface];
        case 'glow':
          return [
            theme.colors.background,
            `${theme.colors.glowPrimary}`,
            `${theme.colors.glowSecondary}`,
            theme.colors.surface, // End with solid surface for tab bar
          ];
        default:
          return [theme.colors.background, theme.colors.surface, theme.colors.surface];
      }
    }
  }, [theme.isDark, theme.colors.background, theme.colors.surface, theme.colors.surfaceDark, theme.colors.glowPrimary, theme.colors.glowSecondary, variant]);

  const getGradientLocations = useMemo((): readonly [number, number, ...number[]] | undefined => {
    switch (intensity) {
      case 'light':
        return [0, 0.5, 1] as const;
      case 'strong':
        return [0, 0.3, 0.7, 1] as const;
      case 'medium':
      default:
        return undefined;
    }
  }, [intensity]);

  const getGradientAngle = useMemo(() => {
    switch (direction) {
      case 'horizontal':
        return { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
      case 'diagonal':
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
      case 'vertical':
      default:
        return { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
    }
  }, [direction]);

  if (Platform.OS === 'web') {
    // Fallback for web with CSS gradients
    const gradientDirection = direction === 'horizontal' ? 'to right' : 
                             direction === 'diagonal' ? 'to bottom right' : 
                             'to bottom';
    
    return (
      <View
        style={[
          styles.container,
          {
            background: `linear-gradient(${gradientDirection}, ${getGradientColors.join(', ')})`,
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
      colors={getGradientColors}
      locations={getGradientLocations}
      {...getGradientAngle}
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
    borderRadius: platformStyles.borderRadius.xl,
    padding: platformStyles.spacing.lg,
    borderWidth: 1,
  },
});