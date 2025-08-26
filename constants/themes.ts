import { Platform } from 'react-native';

// Monzo-inspired color palette
export const colors = {
  // Primary brand colors (Monzo coral-inspired)
  primary: '#FF6B6B', // Vibrant coral red
  primaryLight: '#FF8E8E',
  primaryDark: '#E55555',
  
  // Secondary colors
  secondary: '#4ECDC4', // Teal
  secondaryLight: '#6ED7D0',
  secondaryDark: '#3DB8B0',
  
  // Accent colors
  accent: '#45B7D1', // Blue
  accentLight: '#6BC5D8',
  accentDark: '#3A9BB8',
  
  // Success/Error colors
  success: '#2ECC71', // Green
  successLight: '#5CDB95',
  warning: '#F39C12', // Orange
  error: '#E74C3C', // Red
  
  // Neutral colors
  neutral: '#95A5A6',
  neutralLight: '#BDC3C7',
  neutralDark: '#7F8C8D',
  
  // Fun colors for emojis and highlights
  fun: {
    yellow: '#F1C40F',
    pink: '#E91E63',
    purple: '#9B59B6',
    orange: '#E67E22',
    lime: '#CDDC39',
  }
};

// Enhanced theme definitions
export const lightTheme = {
  colors: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceElevated: '#FFFFFF',
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    text: '#2C3E50',
    textSecondary: '#7F8C8D',
    textTertiary: '#BDC3C7',
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    border: '#E9ECEF',
    borderLight: '#F1F3F4',
    shadow: 'rgba(0, 0, 0, 0.1)',
    // Monzo-inspired gradients
    gradientStart: colors.primary,
    gradientEnd: colors.secondary,
    gradientAccent: colors.accent,
  },
  typography,
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6.27,
      elevation: 6,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 10.32,
      elevation: 12,
    },
  },
};

export const darkTheme = {
  colors: {
    background: '#1A1A1A',
    surface: '#2D2D2D',
    surfaceElevated: '#3A3A3A',
    primary: colors.primaryLight,
    secondary: colors.secondaryLight,
    accent: colors.accentLight,
    text: '#FFFFFF',
    textSecondary: '#BDC3C7',
    textTertiary: '#7F8C8D',
    success: colors.successLight,
    warning: colors.warning,
    error: colors.error,
    border: '#404040',
    borderLight: '#2D2D2D',
    shadow: 'rgba(0, 0, 0, 0.3)',
    // Dark mode gradients
    gradientStart: colors.primaryDark,
    gradientEnd: colors.secondaryDark,
    gradientAccent: colors.accentDark,
  },
  typography,
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3.84,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 6.27,
      elevation: 6,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 10.32,
      elevation: 12,
    },
  },
};

// Typography styles
export const typography = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 28 },
  '2xl': { fontSize: 24, lineHeight: 32 },
  '3xl': { fontSize: 30, lineHeight: 36 },
  '4xl': { fontSize: 36, lineHeight: 40 },
  // Text styles
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  subtitle: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  title: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  titleLarge: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  headline: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
};

// Enhanced button styles with Monzo-inspired design
export const createButtonStyle = (theme: any, variant: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'ghost' | 'fun' = 'primary') => {
  const baseStyle = {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    minHeight: 52,
    ...theme.shadows.small,
  };

  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.primary,
        borderWidth: 0,
      };
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.primary,
      };
    case 'accent':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.accent,
        borderWidth: 0,
      };
    case 'success':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.success,
        borderWidth: 0,
      };
    case 'warning':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.warning,
        borderWidth: 0,
      };
    case 'error':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.error,
        borderWidth: 0,
      };
    case 'ghost':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 0,
        ...theme.shadows.small,
      };
    case 'fun':
      return {
        ...baseStyle,
        backgroundColor: colors.fun.purple,
        borderWidth: 0,
        borderRadius: 25, // More rounded for fun variant
      };
    default:
      return baseStyle;
  }
};

// Enhanced input styles
export const createInputStyle = (theme: any, variant: 'default' | 'fun' | 'success' | 'error' = 'default') => {
  const baseStyle = {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.small,
  };

  switch (variant) {
    case 'fun':
      return {
        ...baseStyle,
        borderColor: colors.fun.purple,
        backgroundColor: theme.colors.surfaceElevated,
      };
    case 'success':
      return {
        ...baseStyle,
        borderColor: theme.colors.success,
        backgroundColor: theme.colors.surfaceElevated,
      };
    case 'error':
      return {
        ...baseStyle,
        borderColor: theme.colors.error,
        backgroundColor: theme.colors.surfaceElevated,
      };
    default:
      return {
        ...baseStyle,
        borderColor: theme.colors.border,
      };
  }
};

// Enhanced card styles
export const createCardStyle = (theme: any, variant: 'default' | 'elevated' | 'fun' | 'gradient' = 'default') => {
  const baseStyle = {
    padding: 20,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.small,
  };

  switch (variant) {
    case 'elevated':
      return {
        ...baseStyle,
        ...theme.shadows.medium,
        backgroundColor: theme.colors.surfaceElevated,
      };
    case 'fun':
      return {
        ...baseStyle,
        backgroundColor: colors.fun.purple,
        borderRadius: 25,
        ...theme.shadows.medium,
      };
    case 'gradient':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        ...theme.shadows.medium,
      };
    default:
      return baseStyle;
  }
};

// Enhanced icon container styles
export const createIconContainerStyle = (theme: any, variant: 'default' | 'fun' | 'accent' = 'default') => {
  const baseStyle = {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...theme.shadows.small,
  };

  switch (variant) {
    case 'fun':
      return {
        ...baseStyle,
        backgroundColor: colors.fun.yellow,
        borderRadius: 16,
      };
    case 'accent':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.accent,
      };
    default:
      return {
        ...baseStyle,
        backgroundColor: theme.colors.primary,
      };
  }
};

// Monzo-inspired design helpers
export const createGradientStyle = (theme: any, direction: 'horizontal' | 'vertical' = 'horizontal') => ({
  start: { x: direction === 'horizontal' ? 0 : 0, y: direction === 'horizontal' ? 0 : 0 },
  end: { x: direction === 'horizontal' ? 1 : 0, y: direction === 'horizontal' ? 0 : 1 },
  colors: [theme.colors.gradientStart, theme.colors.gradientEnd],
});

export const createFunCardStyle = (theme: any, color: keyof typeof colors.fun = 'purple') => ({
  ...createCardStyle(theme, 'fun'),
  backgroundColor: colors.fun[color],
  transform: [{ scale: 1.02 }],
});

export const createAccentButtonStyle = (theme: any) => ({
  ...createButtonStyle(theme, 'accent'),
  borderRadius: 25,
  paddingHorizontal: 24,
  paddingVertical: 16,
});

// Platform-specific styles
export const platformStyles = {
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  android: {
    elevation: 3,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6.27,
    elevation: 6,
  },
  buttonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
};

// Enhanced card shadow
export const createCardShadow = (theme: any, elevation: 'small' | 'medium' | 'large' = 'small') => {
  if (Platform.OS === 'ios') {
    return theme.shadows[elevation];
  } else {
    return {
      elevation: theme.shadows[elevation].elevation,
    };
  }
};