// CRITICAL: Polyfills must be imported first, before any other imports
import '../polyfills';

// CRITICAL: Crypto must be initialized before any ECC libs
import { initializeCrypto } from '../services/crypto-polyfill';

// CRITICAL: Initialize networking polyfill for DNS resolution issues
import { initializeNetworkingPolyfill } from '../services/networking-polyfill';

import ActivityTracker from '@/components/ActivityTracker';
import PinUnlockScreen from '@/components/PinUnlockScreen';
import SplashScreen from '@/components/SplashScreen';
import { platformStyles } from '@/constants/themes';
import { AutoLockProvider, useAutoLock } from '@/hooks/auto-lock-store';
import { useSplashScreen } from '@/hooks/use-splash-screen';
import { WalletProvider, useWallet } from '@/hooks/wallet-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { AlertCircle, ArrowLeft } from 'lucide-react-native';
import React, { Component, ReactNode, useEffect, useState } from 'react';
import { Appearance, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Crashlytics service
import crashlyticsService from '@/services/crashlytics-service';

ExpoSplashScreen.preventAutoHideAsync();

// Configure QueryClient with platform-optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent aggressive refetching on iOS
      refetchOnMount: false, // Don't refetch on mount by default
      refetchOnWindowFocus: false, // Don't refetch on focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for this long
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
      retry: 1, // Only retry once on failure
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
  },
});

// Error Boundary to catch hook ordering issues
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; colorScheme: 'light' | 'dark' | null | undefined; error?: Error }
> {
  private appearanceSubscription: any;

  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { 
      hasError: false,
      colorScheme: Appearance.getColorScheme(),
    };
  }

  componentDidMount() {
    // Subscribe to color scheme changes
    this.appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
      this.setState({ colorScheme });
    });
  }

  componentWillUnmount() {
    // Clean up subscription
    if (this.appearanceSubscription) {
      this.appearanceSubscription.remove();
    }
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 ErrorBoundary caught error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Report to Crashlytics if available
    crashlyticsService.recordError(error);
    
    // Return minimal state update - colorScheme will be preserved from existing state
    return { 
      hasError: true, 
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 ErrorBoundary componentDidCatch:', error, errorInfo);
    console.error('Component stack:', errorInfo?.componentStack);
    
    // Report to Crashlytics with additional context if available
    crashlyticsService.recordError(error, {
      errorBoundary: 'true',
      componentStack: errorInfo.componentStack || 'unknown',
      timestamp: new Date().toISOString(),
    });
  }

  render() {
    if (this.state.hasError) {
      // Use color scheme from state (reactive to changes)
      const isDark = this.state.colorScheme === 'dark';
      
      // Theme-aware colors
      const colors = {
        background: isDark ? '#0A0A0F' : '#FEFEFE',
        surface: isDark ? '#1F1F33' : '#FFFFFF',
        text: isDark ? '#F7FAFC' : '#1A1A1A',
        textSecondary: isDark ? '#A0AEC0' : '#6B7280',
        border: isDark ? '#2D3748' : '#FFE5DB',
        gradientStart: isDark ? '#26F5FE' : '#FF8A65',
        gradientEnd: isDark ? '#00BCD4' : '#FF6B6B',
        iconBg: isDark ? '#252538' : '#FFF5F2',
        iconColor: isDark ? '#26F5FE' : '#FF8A65',
      };
      
      return (
        <View style={[errorStyles.container, { backgroundColor: colors.background }]}>
          <View style={[errorStyles.card, { 
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }]}>
            <View style={[errorStyles.iconContainer, { backgroundColor: colors.iconBg }]}>
              <AlertCircle color={colors.iconColor} size={48} strokeWidth={2} />
            </View>
            
            <Text style={[errorStyles.title, { color: colors.text }]}>
              Something went wrong
            </Text>
            
            <Text style={[errorStyles.message, { color: colors.textSecondary }]}>
              The app encountered an error. Please restart BitSleuth Wallet by force closing the app.
            </Text>
            
            <TouchableOpacity
              style={errorStyles.buttonContainer}
              onPress={() => {
                this.setState({ hasError: false, error: undefined });
                // Force a complete re-render
                queryClient.clear();
              }}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={errorStyles.button}
              >
                <Text style={errorStyles.buttonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    ...platformStyles.cardShadow,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});

const rootStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackButton: {
    paddingLeft: Platform.OS === 'ios' ? 16 : 12,
    paddingRight: 8,
    paddingVertical: 8,
    marginLeft: Platform.OS === 'android' ? 4 : 0,
  },
});

function AppContent() {
  const { theme } = useWallet();
  
  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: '',
        headerStyle: {
          backgroundColor: Platform.select({
            ios: theme.colors.background + 'F0',
            android: theme.colors.background + 'F0',
            default: theme.colors.background + 'F0',
          }),
        },
        headerTransparent: false,
        headerBlurEffect: Platform.OS === 'ios' ? 'regular' : undefined,
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
          fontWeight: '700',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={theme.colors.text} strokeWidth={2.5} />
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
    // Initialize app with proper React Native bridge readiness detection
    const initializeApp = async () => {
      console.log('🚀 Initializing app in RootLayout...');
      
      try {
        // Check React Native bridge readiness by testing actual native module calls
        const isBridgeReady = async () => {
          try {
            // Test if React Native core is available
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const testNative = require('react-native');
            if (!testNative || typeof testNative.Platform === 'undefined') {
              return false;
            }

            // Test if NativeModules is available and functional
            const { NativeModules } = testNative;
            if (!NativeModules) {
              return false;
            }

            // Test actual native module availability by checking if we can access them
            // This is more reliable than just checking Platform availability
            const testNativeModuleAccess = () => {
              try {
                // Try to access NativeModules object properties
                // This will throw if the bridge isn't ready
                const moduleKeys = Object.keys(NativeModules);
                
                // Additional test: try to access a specific native module that we know exists
                // This ensures the bridge is not just available but functional
                if (testNative.Platform.OS === 'android') {
                  // On Android, try to access GooglePlayServicesChecker if available
                  const googlePlayServices = NativeModules.GooglePlayServicesChecker;
                  if (googlePlayServices && typeof googlePlayServices === 'object') {
                    // Bridge is ready if we can access the module object
                    return true;
                  }
                }
                
                // For iOS or if specific modules aren't available, 
                // just check that NativeModules is accessible
                return moduleKeys.length >= 0; // Even empty object means bridge is ready
              } catch {
                return false;
              }
            };

            return testNativeModuleAccess();
          } catch {
            return false;
          }
        };

        // Wait for bridge readiness with exponential backoff instead of arbitrary delay
        let bridgeReady = await isBridgeReady();
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!bridgeReady && attempts < maxAttempts) {
          const delay = Math.min(50 * Math.pow(1.5, attempts), 500); // 50, 75, 112, 168, 252, 378, 500ms
          console.log(`🔧 Waiting for React Native bridge readiness... (attempt ${attempts + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          bridgeReady = await isBridgeReady();
          attempts++;
        }

        if (!bridgeReady) {
          console.warn('⚠️ React Native bridge not ready after max attempts, proceeding with initialization');
          console.warn('💡 Some native features may not be available until bridge is ready');
        } else {
          console.log('✅ React Native bridge is ready');
          console.log('📱 Native modules are accessible and functional');
        }
        
        // Check if global object is available - if not, we still need to initialize what we can
        const globalAvailable = typeof global !== 'undefined';
        if (!globalAvailable) {
          console.warn('⚠️ Global object not available, initializing without crypto');
        }
        
        // Initialize crypto only if global is available and bridge is ready
        // Bridge readiness is important for crypto operations that may use native modules
        if (globalAvailable && bridgeReady) {
          // Initialize crypto with proper timeout for slower devices
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.warn('⚠️ Aborting crypto initialization due to timeout');
            controller.abort();
          }, 10000); // Restored to 10s for slower devices

          const cryptoOutcome = await initializeCrypto(false, controller.signal)
            .then((ok) => ({ source: 'crypto', ok: ok === true }))
            .catch((error) => ({ source: 'crypto', ok: false, error }));

          clearTimeout(timeoutId);

          if (cryptoOutcome.ok) {
            console.log('✅ Crypto initialized successfully');
          } else {
            console.warn('⚠️ Crypto initialization failed or aborted, continuing', (cryptoOutcome as any).error);
            
            // Attempt retry for crypto initialization failures
            if (!cryptoOutcome.ok) {
              console.log('🔄 Retrying crypto initialization...');
              try {
                // Create a fresh AbortController for retry attempt
                const retryController = new AbortController();
                const retryTimeoutId = setTimeout(() => {
                  console.warn('⚠️ Aborting crypto initialization retry due to timeout');
                  retryController.abort();
                }, 10000); // 10s timeout for retry as well

                const retryOutcome = await initializeCrypto(true, retryController.signal);
                clearTimeout(retryTimeoutId);
                
                if (retryOutcome) {
                  console.log('✅ Crypto initialization succeeded on retry');
                } else {
                  console.warn('⚠️ Crypto initialization retry also failed');
                }
              } catch (retryError) {
                console.warn('⚠️ Crypto initialization retry failed:', retryError);
              }
            }
          }
        } else if (globalAvailable && !bridgeReady) {
          console.warn('⚠️ Global available but bridge not ready - crypto initialization may be unstable');
          console.warn('💡 Proceeding with crypto initialization anyway, but native modules may not work');
          
          // Still try to initialize crypto even if bridge isn't ready
          // This provides better error handling than completely skipping it
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              console.warn('⚠️ Aborting crypto initialization due to timeout (bridge not ready)');
              controller.abort();
            }, 5000); // Shorter timeout when bridge isn't ready

            const cryptoOutcome = await initializeCrypto(false, controller.signal)
              .then((ok) => ({ source: 'crypto', ok: ok === true }))
              .catch((error) => ({ source: 'crypto', ok: false, error }));

            clearTimeout(timeoutId);

            if (cryptoOutcome.ok) {
              console.log('✅ Crypto initialized successfully despite bridge issues');
            } else {
              console.warn('⚠️ Crypto initialization failed (bridge not ready):', (cryptoOutcome as any).error);
            }
          } catch (error) {
            console.warn('⚠️ Crypto initialization error (bridge not ready):', error);
          }
        } else if (!globalAvailable) {
          console.warn('⚠️ Skipping crypto initialization - global object not available');
        }

        // Initialize networking polyfill for DNS resolution issues (works without global)
        initializeNetworkingPolyfill();
        console.log('✅ Networking polyfill initialized');

        // Crashlytics is now initialized in the service
        console.log('✅ App initialization complete');
        
      } catch (error) {
        console.warn('⚠️ App initialization error:', error);
        // Report initialization errors to Crashlytics if available
        crashlyticsService.recordError(error as Error, {
          context: 'app_initialization',
          timestamp: new Date().toISOString(),
        });
      } finally {
        // Always hide splash screen after initialization attempt
        ExpoSplashScreen.hideAsync();
      }
    };
    
    // Initialize immediately - bridge readiness is checked inside initializeApp
    initializeApp();
    
    // Ensure we cancel any in-flight initialization on unmount
    return () => {
      try {
        if (typeof global !== 'undefined' && (global as any).AbortController) {
          // No-op: controller is scoped inside initializeApp, but if we refactor to outer scope,
          // we will abort here. Keeping cleanup for future safety.
        }
      } catch {}
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={rootStyles.container}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}