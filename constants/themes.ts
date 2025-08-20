import { Platform } from 'react-native';
import { Theme } from '@/types/wallet';

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
    primary: '#8B5CF6',
    secondary: '#EC4899',
    text: '#1F2937',
    textSecondary: '#6B7280',
    success: '#10B981',
    error: '#EF4444',
    border: '#E5E7EB',
  },
};

export const darkTheme: Theme = {
  isDark: true,
  colors: {
    background: '#111827',
    surface: '#1F2937',
    primary: '#8B5CF6',
    secondary: '#EC4899',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    success: '#10B981',
    error: '#EF4444',
    border: '#374151',
  },
};

// Helper function to create consistent button styles
export const createButtonStyle = (theme: Theme, variant: 'primary' | 'secondary' | 'outline' = 'primary') => {
  const baseStyle = {
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.medium,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 48, // Consistent touch target
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
    default:
      return baseStyle;
  }
};

// Helper function to create consistent input styles
export const createInputStyle = (theme: Theme) => ({
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: platformStyles.borderRadius.medium,
  paddingVertical: platformStyles.spacing.md,
  paddingHorizontal: platformStyles.spacing.lg,
  fontSize: platformStyles.typography.bodyLarge.fontSize,
  lineHeight: platformStyles.typography.bodyLarge.lineHeight,
  backgroundColor: theme.colors.surface,
  color: theme.colors.text,
  minHeight: 48, // Consistent touch target
});

// Helper function to create consistent card styles
export const createCardStyle = (theme: Theme) => ({
  backgroundColor: theme.colors.surface,
  borderRadius: platformStyles.borderRadius.large,
  padding: platformStyles.spacing.lg,
  ...platformStyles.cardShadow,
});

// Helper function to create consistent text styles
export const createTextStyle = (variant: keyof typeof platformStyles.typography, theme: Theme, color?: keyof Theme['colors']) => ({
  ...platformStyles.typography[variant],
  color: color ? theme.colors[color] : theme.colors.text,
});

// Helper function to create consistent icon container styles
export const createIconContainerStyle = (size: number, backgroundColor: string) => ({
  width: size,
  height: size,
  borderRadius: size / 2,
  backgroundColor,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  ...platformStyles.shadow,
});

// Platform-specific safe area handling
export const getSafeAreaStyle = () => {
  if (Platform.OS === 'web') {
    return {};
  }
  return {
    paddingTop: Platform.OS === 'ios' ? 44 : 24, // Status bar height
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
    // Haptics not available, fail silently
    console.log('Haptics not available:', error);
  }
};