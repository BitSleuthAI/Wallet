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
      fontSize: 12,
      lineHeight: 18, // Increased from 16 for better readability
      letterSpacing: 0.3,
      fontWeight: '500' as const,
    },
    body: {
      fontSize: 15, // Increased from 14 for better readability
      lineHeight: 22, // Increased from 20
      letterSpacing: 0.2,
      fontWeight: '400' as const,
    },
    bodyLarge: {
      fontSize: 17, // Increased from 16
      lineHeight: 26, // Increased from 24
      letterSpacing: 0.1,
      fontWeight: '400' as const,
    },
    subtitle: {
      fontSize: 19, // Increased from 18
      lineHeight: 26, // Increased from 24
      letterSpacing: 0.15,
      fontWeight: '600' as const,
    },
    title: {
      fontSize: 22, // Increased from 20
      lineHeight: 30, // Increased from 28
      letterSpacing: 0.1,
      fontWeight: 'bold' as const,
    },
    heading: {
      fontSize: 28, // Increased from 24
      lineHeight: 36, // Increased from 32
      letterSpacing: -0.2, // Negative for large text
      fontWeight: '700' as const,
    },
    display: {
      fontSize: 36, // Increased from 32
      lineHeight: 44, // Increased from 40
      letterSpacing: -0.5, // Negative for large text
      fontWeight: '800' as const,
    },
  },
};

export const lightTheme: Theme = {
  isDark: false,
  colors: {
    // Base colors with gradient-inspired tones - Enhanced for better contrast
    background: '#FFFFFF',
    surface: '#F9FAFB', // Slightly warmer from #FAFAFA
    primary: '#FF8A65', // Coral orange inspired by gradient
    secondary: '#FF6B6B', // Warm red-orange
    accent: '#FFB74D', // Golden orange
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    text: '#111827', // Darker from #1F2937 for better contrast
    textSecondary: '#6B7280',
    border: '#E5E7EB', // Slightly darker from #F3F4F6 for better visibility
    // Gradient colors - inspired by the orange/coral gradient image
    gradientStart: '#FF8A65', // Coral orange
    gradientEnd: '#FF6B6B', // Warm red-orange
    gradientAccent: '#FFB74D', // Golden accent
    // Glow effects for light theme (subtle)
    glowPrimary: 'rgba(255, 138, 101, 0.12)',
    glowSecondary: 'rgba(255, 107, 107, 0.12)',
    glowAccent: 'rgba(255, 183, 77, 0.12)',
    // Additional colors
    purple: '#FF8A65',
    blue: '#3B82F6',
    green: '#22C55E',
    orange: '#FF8A65',
    pink: '#FF6B6B',
    yellow: '#FFB74D',
    // Surface variants
    surfaceLight: '#FFFFFF',
    surfaceDark: '#F5F5F5',
    // Card backgrounds with subtle gradient feel
    cardBackground: '#FFFFFF',
    cardBorder: '#FFE5DB',
  },
};

export const darkTheme: Theme = {
  isDark: true,
  colors: {
    // Deep dark background with cool undertones - Enhanced contrast
    background: '#0A0E1A', // Darker from #0F172A for deeper blacks
    surface: '#1A2332', // Adjusted from #1E293B for better hierarchy
    primary: '#26F5FE', // Bright cyan - perfect complement to coral orange
    secondary: '#00BCD4', // Teal - creates beautiful gradient with cyan
    accent: '#40E0D0', // Turquoise accent - bridges cyan and teal
    success: '#00E676', // Bright emerald - complements the cool theme
    warning: '#FFB74D', // Keep warm amber for contrast
    error: '#FF5252', // Bright red - maintains energy
    text: '#F8FAFC', // Brighter from #F1F5F9 for better readability
    textSecondary: '#9CA3AF', // Adjusted from #94A3B8 for better contrast
    border: '#2D3748', // Adjusted from #334155 for better visibility
    // Gradient colors - cool cyan theme (opposite energy to warm coral)
    gradientStart: '#26F5FE', // Bright cyan
    gradientEnd: '#00BCD4', // Teal
    gradientAccent: '#40E0D0', // Turquoise accent
    // Glow effects for dark theme (cool cyan glow)
    glowPrimary: 'rgba(38, 245, 254, 0.25)', // Cyan glow
    glowSecondary: 'rgba(0, 188, 212, 0.25)', // Teal glow
    glowAccent: 'rgba(64, 224, 208, 0.25)', // Turquoise glow
    // Additional colors with cool variants
    purple: '#26F5FE', // Replace purple with cyan
    blue: '#26F5FE', // Cyan blue
    green: '#00E676', // Bright emerald
    orange: '#FFB74D', // Keep warm amber for contrast
    pink: '#FF4081', // Bright pink for energy
    yellow: '#FFEB3B', // Bright yellow for warmth
    // Surface variants with cool undertones
    surfaceLight: '#293548',
    surfaceDark: '#1A2332',
    // Card backgrounds with cyan glow effect
    cardBackground: '#1E293B',
    cardBorder: '#26F5FE', // Cyan border for accent
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
        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
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

// Platform-specific haptic feedback
export const triggerHapticFeedback = async (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
  if (Platform.OS === 'web') return;
  
  try {
    const Haptics = await import('expo-haptics');
    
    switch (type) {
      case 'light':
        await Haptics.selectionAsync();
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    console.log('Haptics not available:', error);
  }
};

// New fun design helpers
export const createGradientStyle = (theme: Theme, direction: 'horizontal' | 'vertical' = 'horizontal') => ({
  // This is a placeholder - actual gradients need LinearGradient component
  backgroundColor: theme.colors.gradientStart,
});

export const createFunCardStyle = (theme: Theme) => ({
  backgroundColor: theme.colors.surface,
  borderRadius: platformStyles.borderRadius.xl,
  padding: platformStyles.spacing.lg,
  borderWidth: 2,
  borderColor: theme.colors.accent,
  ...platformStyles.cardShadow,
});

export const createAccentButtonStyle = (theme: Theme) => ({
  paddingVertical: platformStyles.spacing.md,
  paddingHorizontal: platformStyles.spacing.xl,
  borderRadius: platformStyles.borderRadius.large,
  backgroundColor: theme.colors.accent,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  minHeight: 48,
  ...platformStyles.buttonShadow,
});