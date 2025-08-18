// Crypto must be initialized before any ECC libs
import { initializeCrypto } from '../services/crypto-polyfill';
initializeCrypto();

import { useFonts } from 'expo-font';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { WalletProvider } from "@/hooks/wallet-store";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <WalletProvider>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="wallet-setup" options={{ headerShown: false }} />
      </Stack>
    </WalletProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}