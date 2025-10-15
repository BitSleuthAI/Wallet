import { secureAuthService } from '@/services/secure-auth-service';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

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
    
    return () => {
      subscription?.remove();
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, [handleAppStateChange]);

  // Separate effect for initializing timer to avoid circular dependency
  useEffect(() => {
    if (storedPin && !isLocked && autoLockTimeoutQuery.data !== undefined) {
      resetLockTimer();
    }
  }, [storedPin, isLocked, autoLockTimeoutQuery.data, resetLockTimer]);

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
        promptMessage: `Use ${Platform.OS === 'android' ? 'biometric' : (biometricType || 'biometric')} to unlock BitSleuth`,
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
        promptMessage: `Use ${Platform.OS === 'android' ? 'biometric' : (biometricType || 'biometric')} to authorize transaction`,
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

  // Enhanced transaction authentication with multi-factor support using secure auth service
  const authenticateForTransactionEnhanced = useCallback(async (forceBiometric?: boolean): Promise<boolean> => {
    try {
      console.log('🔐 Enhanced transaction authentication started...');
      
      // Use the secure authentication service for enhanced transaction authentication
      const result = await secureAuthService.authenticateForTransaction(forceBiometric);
      
      if (result) {
        console.log('✅ Enhanced transaction authentication completed successfully');
      } else {
        console.log('❌ Enhanced transaction authentication failed');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Enhanced transaction authentication error:', error);
      return false;
    }
  }, []);

  // Check if enhanced security is required for a transaction
  const isEnhancedSecurityRequired = useCallback(async (amount?: number): Promise<boolean> => {
    try {
      const securitySettingsStr = await AsyncStorage.getItem('securitySettings');
      const securitySettings = securitySettingsStr ? JSON.parse(securitySettingsStr) : {};

      return securitySettings.requireBiometricForTransactions === true;
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
    isEnhancedSecurityRequired,
  ]);
});