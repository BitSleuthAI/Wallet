import React from 'react';
import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';

/**
 * ScreenLoading - Shared fallback for screens that render before the wallet
 * context is available. Intentionally context-free: it reads the system color
 * scheme directly so it never depends on providers that may not exist yet.
 * Colors mirror lightTheme/darkTheme backgrounds in constants/themes.ts.
 */
export function ScreenLoading() {
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#09090B' : '#F2F2F7' }]}>
      <ActivityIndicator size="small" color="#F7931A" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ScreenLoading;
