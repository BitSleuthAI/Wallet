import { Theme } from '@/types/wallet';

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