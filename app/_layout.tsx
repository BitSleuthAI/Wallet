// CRITICAL: Crypto must be initialized before any ECC libs
import { initializeCrypto } from '../services/crypto-polyfill';

import { WalletProvider } from '@/hooks/wallet-store';
import { AutoLockProvider, useAutoLock } from '@/hooks/auto-lock-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ActivityTracker from '@/components/ActivityTracker';
import PinUnlockScreen from '@/components/PinUnlockScreen';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, Component, ReactNode, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Error Boundary to catch hook ordering issues
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            The app encountered an error. Please restart the app.
          </Text>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={() => {
              this.setState({ hasError: false, error: undefined });
              // Force a complete re-render
              queryClient.clear();
            }}
          >
            <Text style={errorStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

function AppContent() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="wallet-setup" options={{ headerShown: false }} />
      <Stack.Screen name="pin-setup" options={{ headerShown: false }} />
      <Stack.Screen name="biometric-setup" options={{ headerShown: false }} />
      <Stack.Screen name="about" options={{ headerShown: true }} />
      <Stack.Screen name="view-recovery-phrase" options={{ headerShown: true }} />
      <Stack.Screen name="transaction-history" options={{ headerShown: true }} />
      <Stack.Screen name="wallet-addresses" options={{ headerShown: true }} />
      <Stack.Screen name="generate-xpub" options={{ headerShown: true }} />
      <Stack.Screen name="wallet-settings" options={{ headerShown: true }} />
      <Stack.Screen name="coin-control" options={{ headerShown: true }} />
      <Stack.Screen name="fee-settings" options={{ headerShown: true }} />
    </Stack>
  );
}

function AppWithLock() {
  const { isLocked } = useAutoLock();

  if (isLocked) {
    return <PinUnlockScreen />;
  }

  return (
    <ActivityTracker>
      <AppContent />
    </ActivityTracker>
  );
}

function RootLayoutNav() {
  const [key, setKey] = useState(0);
  
  // Listen for app reset events
  useEffect(() => {
    const handleReset = () => {
      console.log('🔄 Forcing app re-mount due to reset');
      setKey(prev => prev + 1);
    };
    
    // Add a global event listener for app resets
    if (typeof global !== 'undefined') {
      (global as any).__forceAppReset = handleReset;
    }
    
    return () => {
      if (typeof global !== 'undefined') {
        delete (global as any).__forceAppReset;
      }
    };
  }, []);
  
  return (
    <ErrorBoundary key={key}>
      <WalletProvider>
        <AutoLockProvider>
          <AppWithLock />
        </AutoLockProvider>
      </WalletProvider>
    </ErrorBoundary>
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