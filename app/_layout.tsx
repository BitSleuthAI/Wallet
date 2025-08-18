// Crypto must be initialized before any ECC libs
import { initializeCrypto } from '../services/crypto-polyfill';
initializeCrypto();

import { WalletProvider } from '@/hooks/wallet-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Initialize crypto functions here
console.log('🚀 Initializing crypto in RootLayout...');
initializeCrypto();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <WalletProvider>
      <Stack screenOptions={{ headerBackTitle: 'Back' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="wallet-setup" options={{ headerShown: false }} />
      </Stack>
    </WalletProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'space-mono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}