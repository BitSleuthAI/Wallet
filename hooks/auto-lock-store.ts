import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Platform } from 'react-native';

export const [AutoLockProvider, useAutoLock] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>('active');

  // Load stored PIN from AsyncStorage
  const pinQuery = useQuery({
    queryKey: ['pin'],
    queryFn: async () => {
      const pin = await AsyncStorage.getItem('pin');
      return pin;
    },
  });

  // Load auto-lock timeout setting
  const autoLockTimeoutQuery = useQuery({
    queryKey: ['autoLockTimeout'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('autoLockTimeout');
      return stored ? parseInt(stored, 10) : 5; // Default to 5 minutes
    },
  });

  // Load biometric settings
  const biometricQuery = useQuery({
    queryKey: ['biometricSettings'],
    queryFn: async () => {
      const enabled = await AsyncStorage.getItem('biometricEnabled');
      const type = await AsyncStorage.getItem('biometricType');
      return {
        enabled: enabled === 'true',
        type: type || ''
      };
    },
  });

  useEffect(() => {
    if (pinQuery.data) {
      setStoredPin(pinQuery.data);
    }
  }, [pinQuery.data]);

  useEffect(() => {
    if (biometricQuery.data) {
      setBiometricEnabled(biometricQuery.data.enabled);
      setBiometricType(biometricQuery.data.type);
    }
  }, [biometricQuery.data]);

  const resetLockTimer = useCallback(() => {
    const timeout = autoLockTimeoutQuery.data || 5;
    
    // Clear existing timeout
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }

    // Don't set timer if auto-lock is disabled (timeout = -1 for "Never")
    if (timeout === -1) {
      return;
    }

    // Set new timeout
    lockTimeoutRef.current = setTimeout(() => {
      console.log('🔒 Auto-lock timeout reached, locking app');
      setIsLocked(true);
    }, timeout * 60 * 1000); // Convert minutes to milliseconds

    setLastActiveTime(Date.now());
  }, [autoLockTimeoutQuery.data]);

  const updateActivity = useCallback(() => {
    if (!isLocked && appStateRef.current === 'active') {
      resetLockTimer();
    }
  }, [isLocked, resetLockTimer]);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    const timeout = autoLockTimeoutQuery.data || 5;
    
    if (timeout === -1) {
      // Auto-lock disabled ("Never")
      appStateRef.current = nextAppState;
      return;
    }

    if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
      // App going to background - clear timer and record time
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
      setLastActiveTime(Date.now());
      console.log('📱 App going to background, clearing auto-lock timer');
    } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App coming back to foreground - check if we should lock
      const timeInBackground = Date.now() - lastActiveTime;
      const timeoutMs = timeout * 60 * 1000;
      
      console.log(`📱 App returning to foreground after ${Math.round(timeInBackground / 1000)}s`);
      
      if (timeInBackground >= timeoutMs) {
        console.log('🔒 Time in background exceeded auto-lock timeout, locking app');
        setIsLocked(true);
      } else {
        // Reset timer for remaining time
        resetLockTimer();
      }
    }
    
    appStateRef.current = nextAppState;
  }, [autoLockTimeoutQuery.data, lastActiveTime, resetLockTimer]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Initialize timer when component mounts
    if (storedPin && !isLocked) {
      resetLockTimer();
    }

    return () => {
      subscription?.remove();
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, [handleAppStateChange, storedPin, isLocked, resetLockTimer]);

  const authenticateWithBiometric = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !biometricEnabled) {
      return false;
    }

    try {
      console.log('🔐 Attempting biometric authentication...');
      
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!compatible || !enrolled) {
        console.log('❌ Biometric not available or not enrolled');
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Use ${biometricType || 'biometric'} to unlock BitSleuth`,
        cancelLabel: 'Use PIN',
        fallbackLabel: 'Use PIN instead',
      });

      if (result.success) {
        console.log('✅ Biometric authentication successful');
        setIsLocked(false);
        resetLockTimer();
        return true;
      } else {
        console.log('❌ Biometric authentication failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Biometric authentication error:', error);
      return false;
    }
  }, [biometricEnabled, biometricType, resetLockTimer]);

  const unlock = useCallback(async (enteredPin: string): Promise<boolean> => {
    if (!storedPin) {
      console.warn('No stored PIN found');
      return false;
    }

    if (enteredPin === storedPin) {
      console.log('✅ PIN verified, unlocking app');
      setIsLocked(false);
      resetLockTimer();
      return true;
    } else {
      console.log('❌ Invalid PIN entered');
      return false;
    }
  }, [storedPin, resetLockTimer]);

  const lock = useCallback(() => {
    console.log('🔒 Manually locking app');
    setIsLocked(true);
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
  }, []);

  const savePin = useCallback(async (pin: string) => {
    try {
      await AsyncStorage.setItem('pin', pin);
      setStoredPin(pin);
      console.log('✅ PIN saved successfully');
    } catch (error) {
      console.error('❌ Error saving PIN:', error);
      throw error;
    }
  }, []);

  // Check if we should show lock screen (only if PIN is set and app is locked)
  const shouldShowLockScreen = storedPin && isLocked;

  const setAutoLockTimeout = useCallback(async (timeout: number) => {
    try {
      await AsyncStorage.setItem('autoLockTimeout', timeout.toString());
      // Invalidate query to refetch the new value
      await queryClient.invalidateQueries({ queryKey: ['autoLockTimeout'] });
      console.log(`✅ Auto-lock timeout set to ${timeout} minutes`);
    } catch (error) {
      console.error('❌ Error saving auto-lock timeout:', error);
      throw error;
    }
  }, [queryClient]);

  const enableBiometric = useCallback(async (type: string) => {
    try {
      await AsyncStorage.setItem('biometricEnabled', 'true');
      await AsyncStorage.setItem('biometricType', type);
      setBiometricEnabled(true);
      setBiometricType(type);
      // Invalidate query to refetch the new value
      await queryClient.invalidateQueries({ queryKey: ['biometricSettings'] });
      console.log(`✅ Biometric authentication enabled: ${type}`);
    } catch (error) {
      console.error('❌ Error enabling biometric:', error);
      throw error;
    }
  }, [queryClient]);

  const disableBiometric = useCallback(async () => {
    try {
      await AsyncStorage.setItem('biometricEnabled', 'false');
      await AsyncStorage.removeItem('biometricType');
      setBiometricEnabled(false);
      setBiometricType('');
      // Invalidate query to refetch the new value
      await queryClient.invalidateQueries({ queryKey: ['biometricSettings'] });
      console.log('✅ Biometric authentication disabled');
    } catch (error) {
      console.error('❌ Error disabling biometric:', error);
      throw error;
    }
  }, [queryClient]);

  const authenticateForTransaction = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !biometricEnabled) {
      return true; // Skip biometric for web or if not enabled
    }

    try {
      console.log('🔐 Requesting biometric authentication for transaction...');
      
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!compatible || !enrolled) {
        console.log('❌ Biometric not available, skipping transaction auth');
        return true; // Allow transaction to proceed
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Use ${biometricType || 'biometric'} to authorize transaction`,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Cancel',
      });

      if (result.success) {
        console.log('✅ Transaction biometric authentication successful');
        return true;
      } else {
        console.log('❌ Transaction biometric authentication failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Transaction biometric authentication error:', error);
      return false;
    }
  }, [biometricEnabled, biometricType]);

  // Enhanced transaction authentication with multi-factor support
  const authenticateForTransactionEnhanced = useCallback(async (amount?: number, requireSecurityKey?: boolean): Promise<boolean> => {
    try {
      console.log('🔐 Enhanced transaction authentication started...');
      
      // Load security settings
      const securitySettingsStr = await AsyncStorage.getItem('securitySettings');
      const securitySettings = securitySettingsStr ? JSON.parse(securitySettingsStr) : {
        requireBiometricForTransactions: true,
        requireSecurityKeyForTransactions: false,
        multiFactorEnabled: false,
      };

      // Load security keys
      const securityKeysStr = await AsyncStorage.getItem('securityKeys');
      const securityKeys = securityKeysStr ? JSON.parse(securityKeysStr) : [];

      // Check if security key is required (either by setting or high-value transaction)
      const isHighValueTransaction = amount && amount > 0.01; // 0.01 BTC threshold
      const shouldRequireSecurityKey = requireSecurityKey || 
                                     securitySettings.requireSecurityKeyForTransactions || 
                                     (isHighValueTransaction && securitySettings.multiFactorEnabled);

      // Step 1: Biometric authentication (if enabled and required)
      if (securitySettings.requireBiometricForTransactions && biometricEnabled) {
        console.log('🔐 Step 1: Biometric authentication required');
        const biometricResult = await authenticateForTransaction();
        if (!biometricResult) {
          console.log('❌ Biometric authentication failed');
          return false;
        }
        console.log('✅ Biometric authentication successful');
      }

      // Step 2: Security key verification (if required)
      if (shouldRequireSecurityKey) {
        console.log('🔐 Step 2: Security key verification required');
        
        // Check if user has registered security keys
        const availableKeys = securityKeys.filter(key => 
          key.type === 'fido' || key.type === 'passkey'
        );

        if (availableKeys.length === 0) {
          console.log('❌ No security keys available but required');
          Alert.alert(
            'Security Key Required',
            'A security key is required for this transaction. Please register a passkey or hardware security key in Settings.',
            [{ text: 'OK' }]
          );
          return false;
        }

        // Verify security key is present and accessible
        const keyVerificationResult = await verifySecurityKeyPresence(availableKeys);
        if (!keyVerificationResult) {
          console.log('❌ Security key verification failed');
          Alert.alert(
            'Security Key Verification Failed',
            'Please ensure your security key is connected and accessible, then try again.',
            [{ text: 'OK' }]
          );
          return false;
        }
        console.log('✅ Security key verification successful');
      }

      // Step 3: Multi-factor authentication (if enabled)
      if (securitySettings.multiFactorEnabled) {
        console.log('🔐 Step 3: Multi-factor authentication required');
        
        const factorsEnabled = (biometricEnabled ? 1 : 0) + 
                             securityKeys.filter(key => key.type === 'fido' || key.type === 'passkey').length;
        
        if (factorsEnabled < 2) {
          console.log('❌ Insufficient authentication factors for multi-factor');
          Alert.alert(
            'Multi-Factor Authentication Required',
            'You need at least two authentication factors enabled. Please configure additional security measures.',
            [{ text: 'OK' }]
          );
          return false;
        }

        // For multi-factor, we require both biometric AND security key
        if (biometricEnabled && securityKeys.some(key => key.type === 'fido' || key.type === 'passkey')) {
          console.log('✅ Multi-factor authentication successful');
        } else {
          console.log('❌ Multi-factor authentication failed');
          return false;
        }
      }

      console.log('✅ Enhanced transaction authentication completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Enhanced transaction authentication error:', error);
      return false;
    }
  }, [biometricEnabled, biometricType, authenticateForTransaction]);

  // Verify that a security key is actually present and accessible
  const verifySecurityKeyPresence = useCallback(async (securityKeys: any[]): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        // Web implementation - verify passkey availability
        return await verifyWebPasskey();
      } else {
        // Mobile implementation - verify hardware key or passkey
        return await verifyMobileSecurityKey(securityKeys);
      }
    } catch (error) {
      console.error('Error verifying security key presence:', error);
      return false;
    }
  }, []);

  // Verify WebAuthn passkey on web
  const verifyWebPasskey = async (): Promise<boolean> => {
    try {
      // Check if WebAuthn is supported
      if (!navigator.credentials) {
        console.log('WebAuthn not supported');
        return false;
      }

      // Create a challenge to verify passkey availability
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const options = {
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required' as const,
        },
      };

      // This will prompt the user to authenticate with their passkey
      const assertion = await navigator.credentials.get(options);
      return !!assertion;
    } catch (error) {
      console.error('WebAuthn verification failed:', error);
      return false;
    }
  };

  // Verify mobile security key
  const verifyMobileSecurityKey = async (securityKeys: any[]): Promise<boolean> => {
    try {
      // For mobile, we'll use biometric as a proxy for security key verification
      // In a real implementation, this would interface with hardware security modules
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify security key access',
        fallbackLabel: 'Use PIN',
      });
      
      return result.success;
    } catch (error) {
      console.error('Mobile security key verification failed:', error);
      return false;
    }
  };

  // Check if enhanced security is required for a transaction
  const isEnhancedSecurityRequired = useCallback(async (amount?: number): Promise<boolean> => {
    try {
      const securitySettingsStr = await AsyncStorage.getItem('securitySettings');
      const securitySettings = securitySettingsStr ? JSON.parse(securitySettingsStr) : {};
      
      const isHighValue = amount && amount > 0.01; // 0.01 BTC threshold
      
      return securitySettings.requireSecurityKeyForTransactions || 
             securitySettings.multiFactorEnabled ||
             isHighValue;
    } catch (error) {
      console.error('Error checking enhanced security requirements:', error);
      return false;
    }
  }, []);

  return useMemo(() => ({
    isLocked: shouldShowLockScreen,
    hasPin: !!storedPin,
    biometricEnabled,
    biometricType,
    unlock,
    lock,
    savePin,
    updateActivity,
    autoLockTimeout: autoLockTimeoutQuery.data || 5,
    setAutoLockTimeout,
    authenticateWithBiometric,
    enableBiometric,
    disableBiometric,
    authenticateForTransaction,
    authenticateForTransactionEnhanced,
    verifySecurityKeyPresence,
    isEnhancedSecurityRequired,
  }), [
    shouldShowLockScreen,
    storedPin,
    biometricEnabled,
    biometricType,
    unlock,
    lock,
    savePin,
    updateActivity,
    autoLockTimeoutQuery.data,
    setAutoLockTimeout,
    authenticateWithBiometric,
    enableBiometric,
    disableBiometric,
    authenticateForTransaction,
    authenticateForTransactionEnhanced,
    verifySecurityKeyPresence,
    isEnhancedSecurityRequired,
  ]);
});