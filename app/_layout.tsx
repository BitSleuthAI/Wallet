// CRITICAL: Crypto must be initialized before any ECC libs
import { initializeCrypto } from '../services/crypto-polyfill';

import ActivityTracker from '@/components/ActivityTracker';
import PinUnlockScreen from '@/components/PinUnlockScreen';
import SplashScreen from '@/components/SplashScreen';
import { AutoLockProvider, useAutoLock } from '@/hooks/auto-lock-store';
import { useSplashScreen } from '@/hooks/use-splash-screen';
import { WalletProvider, useWallet } from '@/hooks/wallet-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Stack, router } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import React, { Component, ReactNode, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ArrowLeft } from 'lucide-react-native';

// Import Crashlytics service
import crashlyticsService from '@/services/crashlytics-service';

ExpoSplashScreen.preventAutoHideAsync();

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
    // Report to Crashlytics if available
    crashlyticsService.recordError(error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
    // Report to Crashlytics with additional context if available
    crashlyticsService.recordError(error, {
      errorBoundary: 'true',
      componentStack: errorInfo.componentStack || 'unknown',
      timestamp: new Date().toISOString(),
    });
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

const rootStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackButton: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
});

function AppContent() {
  const { theme } = useWallet();
  
  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: '',
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTransparent: true,
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
          fontWeight: '600',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: 'transparent',
        },
        gestureEnabled: true,
        animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade_from_bottom',
        headerLeft: () => (
          <TouchableOpacity
            style={rootStyles.headerBackButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="wallet-setup" options={{ headerShown: false }} />
      <Stack.Screen name="pin-setup" options={{ headerShown: false }} />
      <Stack.Screen name="pin-verification" options={{ headerShown: false }} />
      <Stack.Screen name="biometric-setup" options={{ headerShown: false }} />
      <Stack.Screen name="about" options={{ headerShown: true }} />
      <Stack.Screen name="view-recovery-phrase" options={{ headerShown: true }} />
      <Stack.Screen name="transaction-history" options={{ headerShown: true }} />
      <Stack.Screen name="wallet-addresses" options={{ headerShown: true }} />
      <Stack.Screen name="generate-xpub" options={{ headerShown: true }} />
      <Stack.Screen name="wallet-settings" options={{ headerShown: true }} />
      <Stack.Screen name="coin-control" options={{ headerShown: true }} />
      <Stack.Screen name="fee-settings" options={{ headerShown: true }} />
      <Stack.Screen name="transaction-details" options={{ headerShown: true }} />
      <Stack.Screen name="fee-bump" options={{ headerShown: true }} />
      <Stack.Screen name="manage-wallets" options={{ headerShown: true }} />
      <Stack.Screen name="passkeys-security" options={{ headerShown: true }} />
      <Stack.Screen name="terms-of-service" options={{ headerShown: true }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: true }} />
      <Stack.Screen name="legal-disclaimer" options={{ headerShown: true }} />
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

function AppWithSplash() {
  const { isVisible, hideSplash, isReady } = useSplashScreen();

  // Show splash screen while app is initializing
  if (isVisible) {
    return <SplashScreen onAnimationComplete={hideSplash} />;
  }

  // Show main app content when ready
  if (isReady) {
    return <AppWithLock />;
  }

  // Fallback loading state
  return <SplashScreen onAnimationComplete={hideSplash} />;
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
          <AppWithSplash />
        </AutoLockProvider>
      </WalletProvider>
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize crypto and Firebase Crashlytics on app start
    const initializeApp = async () => {
      console.log('🚀 Initializing app in RootLayout...');
      
      try {
        // Initialize crypto
        const success = await initializeCrypto();
        if (success) {
          console.log('✅ Crypto initialized successfully');
        } else {
          console.warn('⚠️ Crypto initialization failed, but continuing');
        }

        // Crashlytics is now initialized in the service
        console.log('✅ App initialization complete');
        
      } catch (error) {
        console.warn('⚠️ App initialization error:', error);
        // Report initialization errors to Crashlytics if available
        crashlyticsService.recordError(error as Error, {
          context: 'app_initialization',
          timestamp: new Date().toISOString(),
        });
      }
      
      // Hide Expo splash screen after initialization
      ExpoSplashScreen.hideAsync();
    };
    
    initializeApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={rootStyles.container}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}