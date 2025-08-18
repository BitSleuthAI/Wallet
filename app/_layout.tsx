// CRITICAL: Crypto must be initialized before any ECC libs
import { initializeCrypto } from '../services/crypto-polyfill';

// Initialize crypto immediately on module load
console.log('🚀 Initializing crypto in RootLayout...');
(async () => {
  const success = await initializeCrypto();
  if (!success) {
    console.error('❌ Failed to initialize crypto in RootLayout');
  }
})();

import { WalletProvider } from '@/hooks/wallet-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Double-check crypto initialization
if (!(global as any).__cryptoInitialized) {
  console.log('⚠️ Crypto not initialized, attempting again...');
  (async () => {
    await initializeCrypto();
  })();
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <WalletProvider>
      <Stack screenOptions={{ headerBackTitle: 'Back' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="wallet-setup" options={{ headerShown: false }} />
        <Stack.Screen name="pin-setup" options={{ headerShown: false }} />
        <Stack.Screen name="biometric-setup" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ headerShown: true }} />
      </Stack>
    </WalletProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Ensure crypto is initialized before hiding splash
    const ensureCrypto = async () => {
      let attempts = 0;
      while (attempts < 5 && !(global as any).__cryptoInitialized) {
        console.log(`Attempt ${attempts + 1}: Waiting for crypto initialization...`);
        const success = await initializeCrypto();
        if (success) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      if ((global as any).__cryptoInitialized) {
        console.log('✅ Crypto initialized successfully');
      } else {
        console.warn('⚠️ Crypto initialization timeout, proceeding anyway');
      }
      
      SplashScreen.hideAsync();
    };
    
    ensureCrypto();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}