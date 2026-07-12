import { darkTheme, lightTheme } from '@/constants/themes';
import { Theme } from '@/types/wallet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'theme';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  // Legacy installs persisted 'light'/'dark' under the same key; those values
  // stay valid so an explicit user choice survives the upgrade to system mode.
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(stored => {
        if (!cancelled && isThemeMode(stored)) {
          setThemeModeState(stored);
        }
      })
      .catch(err => console.warn('Failed to load theme:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(err =>
      console.warn('Failed to save theme:', err)
    );
  }, []);

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  const toggleTheme = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: isDark ? darkTheme : lightTheme,
      isDark,
      themeMode,
      toggleTheme,
      setThemeMode,
    }),
    [isDark, themeMode, toggleTheme, setThemeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
