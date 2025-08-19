// CRITICAL: Crypto must be initialized before any ECC libs
import { initializeCrypto } from '../services/crypto-polyfill';

import { WalletProvider } from '@/hooks/wallet-store';
import { AutoLockProvider, useAutoLock } from '@/hooks/auto-lock-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ActivityTracker from '@/components/ActivityTracker';
import PinUnlockScreen from '@/components/PinUnlockScreen';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppContent() {
  const { isLocked } = useAutoLock();

  if (isLocked) {
    return <PinUnlockScreen />;
  }

  return (
    <ActivityTracker>
      <Stack screenOptions={{ headerBackTitle: 'Back' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="wallet-setup" options={{ headerShown: false }} />
        <Stack.Screen name="pin-setup" options={{ headerShown: false }} />
        <Stack.Screen name="biometric-setup" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ headerShown: true }} />
      </Stack>
    </ActivityTracker>
  );
}

function RootLayoutNav() {
  return (
    <WalletProvider>
      <AutoLockProvider>
        <AppContent />
      </AutoLockProvider>
    </WalletProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize crypto synchronously on app start
    const ensureCrypto = async () => {
      console.log('🚀 Initializing crypto in RootLayout...');
      
      try {
        const success = await initializeCrypto();
        if (success) {
          console.log('✅ Crypto initialized successfully');
        } else {
          console.warn('⚠️ Crypto initialization failed, but continuing');
        }
      } catch (error) {
        console.warn('⚠️ Crypto initialization error:', error);
      }
      
      // Always hide splash screen after attempting initialization
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