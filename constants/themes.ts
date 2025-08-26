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
    background: '#FFFFFF',
    surface: '#F8F9FA',
    primary: '#6366F1', // Enhanced indigo
    secondary: '#EC4899', // Vibrant pink
    accent: '#06B6D4', // Bright cyan
    success: '#10B981', // Emerald green
    warning: '#F59E0B', // Amber
    error: '#EF4444', // Red
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    // New fun colors
    purple: '#8B5CF6',
    blue: '#3B82F6',
    green: '#22C55E',
    orange: '#F97316',
    pink: '#F472B6',
    yellow: '#EAB308',
    // Gradient colors
    gradientStart: '#6366F1',
    gradientEnd: '#8B5CF6',
    gradientAccent: '#EC4899',
  },
};

export const darkTheme: Theme = {
  isDark: true,
  colors: {
    background: '#0F172A', // Darker blue-tinted background
    surface: '#1E293B', // Enhanced surface color
    primary: '#818CF8', // Brighter indigo for dark mode
    secondary: '#F472B6', // Brighter pink for dark mode
    accent: '#22D3EE', // Brighter cyan for dark mode
    success: '#34D399', // Brighter green for dark mode
    warning: '#FBBF24', // Brighter amber for dark mode
    error: '#F87171', // Brighter red for dark mode
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    border: '#334155',
    // New fun colors for dark mode
    purple: '#A78BFA',
    blue: '#60A5FA',
    green: '#4ADE80',
    orange: '#FB923C',
    pink: '#F9A8D4',
    yellow: '#FCD34D',
    // Gradient colors for dark mode
    gradientStart: '#818CF8',
    gradientEnd: '#A78BFA',
    gradientAccent: '#F472B6',
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