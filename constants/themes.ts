import { Theme } from '@/types/wallet';
import { Platform } from 'react-native';

// Platform-specific constants for consistent styling
export const platformStyles = {
  // Shadow styles that work consistently across platforms
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 3,
    },
    web: {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
  }),
  
  // Card shadow for elevated components
  cardShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
    web: {
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    },
  }),
  
  // Button shadow for interactive elements
  buttonShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
    },
  }),
  
  // Border radius values for consistency
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xl: 20,
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
  },
  
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
    background: '#FEFEFE',
    surface: '#FFFFFF',
    primary: '#FF8A65', // Coral orange inspired by gradient
    secondary: '#FF6B6B', // Warm red-orange
    accent: '#FFB74D', // Golden orange
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    border: '#F0F0F0',
    // Gradient colors - inspired by the orange/coral gradient image
    gradientStart: '#FF8A65', // Coral orange
    gradientEnd: '#FF6B6B', // Warm red-orange
    gradientAccent: '#FFB74D', // Golden accent
    // Glow effects for light theme (subtle)
    glowPrimary: 'rgba(255, 138, 101, 0.15)',
    glowSecondary: 'rgba(255, 107, 107, 0.15)',
    glowAccent: 'rgba(255, 183, 77, 0.15)',
    // Additional colors
    purple: '#FF8A65',
    blue: '#3B82F6',
    green: '#22C55E',
    orange: '#FF8A65',
    pink: '#FF6B6B',
    yellow: '#FFB74D',
    // Surface variants
    surfaceLight: '#FAFAFA',
    surfaceDark: '#F5F5F5',
    // Card backgrounds with subtle gradient feel
    cardBackground: '#FFFFFF',
    cardBorder: '#FFE5DB',
  },
};

export const darkTheme: Theme = {
  isDark: true,
  colors: {
    // Deep dark background with purple undertones
    background: '#0A0A0F',
    surface: '#1A1A2E',
    primary: '#B794F4', // Vibrant purple
    secondary: '#F687B3', // Pink glow
    accent: '#9F7AEA', // Deep purple accent
    success: '#48BB78',
    warning: '#ED8936',
    error: '#FC8181',
    text: '#F7FAFC',
    textSecondary: '#A0AEC0',
    border: '#2D3748',
    // Gradient colors - inspired by the purple glow image
    gradientStart: '#B794F4', // Vibrant purple
    gradientEnd: '#9F7AEA', // Deep purple
    gradientAccent: '#F687B3', // Pink accent
    // Glow effects for dark theme (prominent)
    glowPrimary: 'rgba(183, 148, 244, 0.4)',
    glowSecondary: 'rgba(246, 135, 179, 0.4)',
    glowAccent: 'rgba(159, 122, 234, 0.4)',
    // Additional colors with glow variants
    purple: '#B794F4',
    blue: '#63B3ED',
    green: '#48BB78',
    orange: '#ED8936',
    pink: '#F687B3',
    yellow: '#F6E05E',
    // Surface variants with subtle glow
    surfaceLight: '#252538',
    surfaceDark: '#16162A',
    // Card backgrounds with glow effect
    cardBackground: '#1F1F33',
    cardBorder: '#3A3A5C',
  },
};

// Enhanced button styles with gradients and fun effects
export const createButtonStyle = (theme: Theme, variant: 'primary' | 'secondary' | 'outline' | 'gradient' | 'fun' = 'primary') => {
  const baseStyle = {
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.medium,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 48,
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
        borderWidth: 1,
        borderColor: theme.colors.border,
      };
    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1,
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
        borderRadius: platformStyles.borderRadius.large,
      };
    default:
      return baseStyle;
  }
};

// Enhanced input styles with better visual feedback
export const createInputStyle = (theme: Theme, variant: 'default' | 'fun' = 'default') => {
  const baseStyle = {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: platformStyles.borderRadius.medium,
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.lg,
    fontSize: platformStyles.typography.bodyLarge.fontSize,
    lineHeight: platformStyles.typography.bodyLarge.lineHeight,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    minHeight: 48,
  };
  
  if (variant === 'fun') {
    return {
      ...baseStyle,
      borderColor: theme.colors.accent,
      borderWidth: 2,
      borderRadius: platformStyles.borderRadius.large,
    };
  }
  
  return baseStyle;
};

// Enhanced card styles with better shadows and fun variants
export const createCardStyle = (theme: Theme, variant: 'default' | 'elevated' | 'fun' = 'default') => {
  const baseStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: platformStyles.borderRadius.large,
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
        borderRadius: platformStyles.borderRadius.xl,
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