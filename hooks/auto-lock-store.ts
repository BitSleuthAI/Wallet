import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export const [AutoLockProvider, useAutoLock] = createContextHook(() => {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
  const [storedPin, setStoredPin] = useState<string | null>(null);
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
      return stored ? parseInt(stored, 10) : 15;
    },
  });

  useEffect(() => {
    if (pinQuery.data) {
      setStoredPin(pinQuery.data);
    }
  }, [pinQuery.data]);

  const resetLockTimer = useCallback(() => {
    const timeout = autoLockTimeoutQuery.data || 15;
    
    // Clear existing timeout
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }

    // Don't set timer if auto-lock is disabled (timeout = 0)
    if (timeout === 0) {
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
    const timeout = autoLockTimeoutQuery.data || 15;
    
    if (timeout === 0) {
      // Auto-lock disabled
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

  return useMemo(() => ({
    isLocked: shouldShowLockScreen,
    hasPin: !!storedPin,
    unlock,
    lock,
    savePin,
    updateActivity,
    autoLockTimeout: autoLockTimeoutQuery.data || 15,
  }), [
    shouldShowLockScreen,
    storedPin,
    unlock,
    lock,
    savePin,
    updateActivity,
    autoLockTimeoutQuery.data,
  ]);
});