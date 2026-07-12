import { Theme } from '@/types/wallet';
import { Platform } from 'react-native';

// Platform-specific constants for consistent styling
export const platformStyles = {
  // Shadow styles that work consistently across platforms - Enhanced for better depth
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1, // Increased from 0.08 for better visibility
      shadowRadius: 10, // Increased from 8 for softer shadows
    },
    android: {
      elevation: 3, // Increased from 2
    },
    web: {
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    },
  }),
  
  // Card shadow for elevated components - Enhanced depth
  cardShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15, // Increased from 0.12
      shadowRadius: 20, // Increased from 16
    },
    android: {
      elevation: 10, // Increased from 8
    },
    web: {
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
    },
  }),
  
  // Button shadow for interactive elements - Enhanced
  buttonShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12, // Increased from 0.1
      shadowRadius: 10, // Increased from 8
    },
    android: {
      elevation: 5, // Increased from 4
    },
    web: {
      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
    },
  }),
  
  // New - Subtle shadow for minimal elevation
  subtleShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    android: {
      elevation: 1,
    },
    web: {
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
    },
  }),
  
  // Border radius values for consistency - Enhanced for modern aesthetics
  borderRadius: {
    xs: 8, // New - for small elements
    small: 12,
    medium: 16,
    large: 20,
    xl: 24,
    xxl: 28,
    xxxl: 32, // New - for extra large cards
    round: 999,
  },
  
  // Spacing values - Enhanced for better breathing room
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
    massive: 48, // New spacing for extra breathing room
    colossal: 64, // New spacing for major sections
  },
  
  // Tab bar spacing for iOS Liquid Glass tabs
  // Ensures content doesn't scroll under translucent tab bar
  // Calculation: tab bar height (~49pt) + safe area (~34pt) + buffer (~17pt) = ~100pt
  tabBarBottomPadding: 100,
  
  // Typography scale - Enhanced for better readability and hierarchy
  typography: {
    caption: {
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.2,
      fontWeight: '500' as const,
    },
    body: {
      fontSize: 16, // Premium standard body size
      lineHeight: 24,
      letterSpacing: 0.1,
      fontWeight: '400' as const,
    },
    bodyLarge: {
      fontSize: 18,
      lineHeight: 28,
      letterSpacing: 0.1,
      fontWeight: '500' as const,
    },
    subtitle: {
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: 0.15,
      fontWeight: '600' as const,
    },
    title: {
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.2, // Tighter for headers
      fontWeight: '700' as const,
    },
    heading: {
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.4,
      fontWeight: '700' as const,
    },
    display: {
      fontSize: 48, // Hero size
      lineHeight: 56,
      letterSpacing: -1,
      fontWeight: '800' as const,
    },
  },
};

export const lightTheme: Theme = {
  isDark: false,
  colors: {
    // Premium Light Theme - Inspired by High-End Finance Apps
    background: '#F2F2F7', // iOS System Gray 6 - softer than pure white
    surface: '#FFFFFF', // Pure white cards for contrast
    primary: '#F7931A', // Bitcoin Orange
    secondary: '#FFAB40', // Warmer Secondary
    accent: '#18181B', // Dark accent for high contrast elements
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    text: '#18181B', // Almost black for sharpness
    textSecondary: '#8E8E93', // iOS System Gray
    border: '#E5E5EA', // Apple-style border
    // Gradient colors
    gradientStart: '#F7931A',
    gradientEnd: '#FFAB40',
    gradientAccent: '#FFD700',
    // Glow effects (Subtle shadows in light mode)
    glowPrimary: 'rgba(247, 147, 26, 0.15)',
    glowSecondary: 'rgba(255, 171, 64, 0.15)',
    glowAccent: 'rgba(0, 0, 0, 0.05)',
    // Additional colors
    purple: '#F7931A',
    blue: '#007AFF', // iOS Blue
    green: '#34C759', // iOS Green
    orange: '#FF9500', // iOS Orange
    pink: '#FF2D55', // iOS Pink
    yellow: '#FFCC00', // iOS Yellow
    // Surface variants
    surfaceLight: '#FFFFFF',
    surfaceDark: '#F2F2F7',
    // Card backgrounds
    cardBackground: '#FFFFFF',
    cardBorder: 'rgba(0, 0, 0, 0.05)',
  },
};

export const darkTheme: Theme = {
  isDark: true,
  colors: {
    // Deep premium dark background
    background: '#09090B', // Slightly warmer/richer black than pure #000
    surface: '#18181B', // Zinc-900 style surface
    primary: '#F7931A', // Bitcoin Orange
    secondary: '#FFAB40', // Lighter Amber
    accent: '#FFD700', // Gold
    success: '#10B981', // Emerald 500
    warning: '#F59E0B',
    error: '#EF4444',
    text: '#FAFAFA', // Zinc-50
    textSecondary: '#A1A1AA', // Zinc-400
    border: '#27272A', // Zinc-800
    // Gradient colors - Bitcoin Theme
    gradientStart: '#F7931A', // Bitcoin Orange
    gradientEnd: '#FFAB40', // Warmer Amber
    gradientAccent: '#FFD700', // Gold
    // Glow effects for dark theme (Warm/Orange glow)
    glowPrimary: 'rgba(247, 147, 26, 0.2)',
    glowSecondary: 'rgba(255, 171, 64, 0.2)',
    glowAccent: 'rgba(255, 215, 0, 0.2)',
    // Additional colors
    purple: '#F7931A', // Remap for consistency
    blue: '#3B82F6',
    green: '#10B981',
    orange: '#F7931A',
    pink: '#EC4899',
    yellow: '#EAB308',
    // Surface variants
    surfaceLight: '#27272A',
    surfaceDark: '#09090B',
    // Card backgrounds
    cardBackground: '#18181B',
    cardBorder: '#F7931A', // Subtle orange border hint
  },
};

// Enhanced button styles with gradients and fun effects - Improved for 2025
export const createButtonStyle = (theme: Theme, variant: 'primary' | 'secondary' | 'outline' | 'gradient' | 'fun' = 'primary') => {
  const baseStyle = {
    paddingVertical: platformStyles.spacing.lg + 2, // Slightly increased from 16 to 18
    paddingHorizontal: platformStyles.spacing.xl + 4, // Increased from 20 to 24
    borderRadius: platformStyles.borderRadius.xl, // Increased from large to xl
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 56, // Increased from 52 for better touch targets
    ...platformStyles.buttonShadow,
  };
  
  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.primary,
        // Add a subtle scale on press for better feedback
      };
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.surface,
        borderWidth: 2, // Increased from 1.5 for better visibility
        borderColor: theme.colors.border,
        ...platformStyles.shadow, // Lighter shadow for secondary
      };
    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        ...platformStyles.subtleShadow, // Even lighter shadow
      };
    case 'gradient':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.gradientStart,
        // Note: For actual gradients, you'd need to use LinearGradient component
      };
    case 'fun':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.accent,
        borderRadius: platformStyles.borderRadius.xxl, // More rounded
      };
    default:
      return baseStyle;
  }
};

// Enhanced input styles with better visual feedback - Improved for 2025
export const createInputStyle = (theme: Theme, variant: 'default' | 'fun' = 'default') => {
  const baseStyle = {
    borderWidth: 2, // Increased from 1.5 for better visibility
    borderColor: theme.colors.border,
    borderRadius: platformStyles.borderRadius.xl, // Increased from large
    paddingVertical: platformStyles.spacing.lg + 2, // Increased from 16 to 18
    paddingHorizontal: platformStyles.spacing.lg + 4, // Increased from 16 to 20
    fontSize: platformStyles.typography.bodyLarge.fontSize,
    lineHeight: platformStyles.typography.bodyLarge.lineHeight,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    minHeight: 56, // Increased from 52 for better touch targets
    ...platformStyles.subtleShadow, // Add subtle shadow for depth
  };
  
  if (variant === 'fun') {
    return {
      ...baseStyle,
      borderColor: theme.colors.accent,
      borderWidth: 2,
      borderRadius: platformStyles.borderRadius.xxl,
    };
  }
  
  return baseStyle;
};

// Enhanced card styles with better shadows and fun variants - Improved for 2025
export const createCardStyle = (theme: Theme, variant: 'default' | 'elevated' | 'fun' = 'default') => {
  const baseStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: platformStyles.borderRadius.xxl, // Increased from xl
    padding: platformStyles.spacing.xl, // Increased from lg
  };
  
  // Define card border colors in theme context
  const elevatedBorderColor = theme.isDark 
    ? theme.colors.border + '66' // 40% opacity
    : theme.colors.border + '33'; // 20% opacity
  
  switch (variant) {
    case 'default':
      return {
        ...baseStyle,
        ...platformStyles.shadow,
      };
    case 'elevated':
      return {
        ...baseStyle,
        ...platformStyles.cardShadow,
        // Add subtle border for better definition
        borderWidth: 1,
        borderColor: elevatedBorderColor,
      };
    case 'fun':
      return {
        ...baseStyle,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        borderRadius: platformStyles.borderRadius.xxxl, // Use new xxxl radius
        ...platformStyles.cardShadow,
      };
    default:
      return baseStyle;
  }
};

// Enhanced text styles with fun variants
export const createTextStyle = (variant: keyof typeof platformStyles.typography, theme: Theme, color?: keyof Theme['colors']) => ({
  ...platformStyles.typography[variant],
  color: color ? theme.colors[color] : theme.colors.text,
});

// Enhanced icon container styles with fun variants
export const createIconContainerStyle = (size: number, backgroundColor: string, variant: 'default' | 'fun' = 'default') => {
  const baseStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...platformStyles.shadow,
  };
  
  if (variant === 'fun') {
    return {
      ...baseStyle,
      borderRadius: platformStyles.borderRadius.medium,
      borderWidth: 2,
      borderColor: backgroundColor,
    };
  }
  
  return baseStyle;
};

// Platform-specific safe area handling
export const getSafeAreaStyle = () => {
  if (Platform.OS === 'web') {
    return {};
  }
  return {
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
  };
};

// Consistent spacing helper
export const getSpacing = (multiplier: number = 1) => platformStyles.spacing.md * multiplier;

// Consistent border radius helper
export const getBorderRadius = (size: 'small' | 'medium' | 'large' | 'xl' = 'medium') => platformStyles.borderRadius[size];

