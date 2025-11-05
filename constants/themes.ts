import { Theme } from '@/types/wallet';
import { Platform } from 'react-native';

// Platform-specific constants for consistent styling
export const platformStyles = {
  // Shadow styles that work consistently across platforms
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
  }),
  
  // Card shadow for elevated components
  cardShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12)',
    },
  }),
  
  // Button shadow for interactive elements
  buttonShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    },
  }),
  
  // Border radius values for consistency
  borderRadius: {
    small: 12,
    medium: 16,
    large: 20,
    xl: 24,
    xxl: 28,
    round: 999,
  },
  
  // Spacing values
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
  },
  
  // Tab bar spacing for iOS Liquid Glass tabs
  // Ensures content doesn't scroll under translucent tab bar
  // Calculation: tab bar height (~49pt) + safe area (~34pt) + buffer (~17pt) = ~100pt
  tabBarBottomPadding: 100,
  
  // Typography scale
  typography: {
    caption: {
      fontSize: 12,
      lineHeight: 16,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
    },
    bodyLarge: {
      fontSize: 16,
      lineHeight: 24,
    },
    subtitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600' as const,
    },
    title: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: 'bold' as const,
    },
    heading: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: 'bold' as const,
    },
    display: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: 'bold' as const,
    },
  },
};

export const lightTheme: Theme = {
  isDark: false,
  colors: {
    // Base colors with gradient-inspired tones
    background: '#FFFFFF',
    surface: '#FAFAFA',
    primary: '#FF8A65', // Coral orange inspired by gradient
    secondary: '#FF6B6B', // Warm red-orange
    accent: '#FFB74D', // Golden orange
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#F3F4F6',
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
    // Deep dark background with cool undertones - complementary to warm coral
    background: '#0F172A',
    surface: '#1E293B',
    primary: '#26F5FE', // Bright cyan - perfect complement to coral orange
    secondary: '#00BCD4', // Teal - creates beautiful gradient with cyan
    accent: '#40E0D0', // Turquoise accent - bridges cyan and teal
    success: '#00E676', // Bright emerald - complements the cool theme
    warning: '#FFB74D', // Keep warm amber for contrast
    error: '#FF5252', // Bright red - maintains energy
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
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

// Enhanced button styles with gradients and fun effects
export const createButtonStyle = (theme: Theme, variant: 'primary' | 'secondary' | 'outline' | 'gradient' | 'fun' = 'primary') => {
  const baseStyle = {
    paddingVertical: platformStyles.spacing.lg,
    paddingHorizontal: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.large,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 52,
    ...platformStyles.buttonShadow,
  };
  
  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.primary,
      };
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
      };
    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
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
        borderRadius: platformStyles.borderRadius.xl,
      };
    default:
      return baseStyle;
  }
};

// Enhanced input styles with better visual feedback
export const createInputStyle = (theme: Theme, variant: 'default' | 'fun' = 'default') => {
  const baseStyle = {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: platformStyles.borderRadius.large,
    paddingVertical: platformStyles.spacing.lg,
    paddingHorizontal: platformStyles.spacing.lg,
    fontSize: platformStyles.typography.bodyLarge.fontSize,
    lineHeight: platformStyles.typography.bodyLarge.lineHeight,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    minHeight: 52,
  };
  
  if (variant === 'fun') {
    return {
      ...baseStyle,
      borderColor: theme.colors.accent,
      borderWidth: 2,
      borderRadius: platformStyles.borderRadius.xl,
    };
  }
  
  return baseStyle;
};

// Enhanced card styles with better shadows and fun variants
export const createCardStyle = (theme: Theme, variant: 'default' | 'elevated' | 'fun' = 'default') => {
  const baseStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: platformStyles.borderRadius.xl,
    padding: platformStyles.spacing.lg,
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
      };
    case 'fun':
      return {
        ...baseStyle,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        borderRadius: platformStyles.borderRadius.xxl,
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