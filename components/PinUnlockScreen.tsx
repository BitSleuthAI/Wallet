import { GradientBackground } from '@/components/GradientBackground';
import { useAutoLock } from '@/hooks/auto-lock-store';
import { useWallet } from '@/hooks/wallet-store';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Delete, Fingerprint, Lock, Shield } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

export default function PinUnlockScreen() {
  const { theme, logoutAndEraseWallet } = useWallet();
  const { unlock, biometricEnabled, biometricType, authenticateWithBiometric } = useAutoLock();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [showBiometricButton, setShowBiometricButton] = useState(false);

  const maxPinLength = 4;
  const maxAttempts = 5;

  // Try biometric authentication on mount if enabled
  useEffect(() => {
    const tryBiometric = async () => {
      if (biometricEnabled && Platform.OS !== 'web') {
        console.log('🔐 Attempting automatic biometric authentication...');
        const success = await authenticateWithBiometric();
        if (!success) {
          // Show biometric button if automatic auth failed
          setShowBiometricButton(true);
        }
      } else {
        setShowBiometricButton(biometricEnabled && Platform.OS !== 'web');
      }
    };
    
    tryBiometric();
  }, [biometricEnabled, authenticateWithBiometric]);

  // Memoized haptic feedback to prevent recreation on every render
  const triggerHaptic = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch {
        // Haptics not available, continue silently
      }
    }
  }, []);

  const handleNumberPress = useCallback(async (number: string) => {
    if (pin.length < maxPinLength) {
      // Trigger haptic feedback asynchronously to avoid blocking UI
      triggerHaptic();
      setPin(prev => prev + number);
    }
  }, [maxPinLength, triggerHaptic]);

  const handleDelete = useCallback(async () => {
    if (pin.length > 0) {
      // Trigger haptic feedback asynchronously to avoid blocking UI
      triggerHaptic();
      setPin(prev => prev.slice(0, -1));
    }
  }, [triggerHaptic]);

  const handleForgotPin = useCallback(() => {
    Alert.alert(
      'Restore Wallet',
      'Are you sure you want to erase the current wallet and restore a new one? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Erase and Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutAndEraseWallet();
              // Navigate to the wallet setup screen after erasing
              router.replace('/wallet-setup'); 
            } catch (error) {
              console.error('Error erasing wallet:', error);
              Alert.alert('Error', 'Failed to erase the wallet. Please try again.');
            }
          },
        },
      ]
    );
  }, [logoutAndEraseWallet]);

  const handleBiometricAuth = useCallback(async () => {
    const success = await authenticateWithBiometric();
    if (!success) {
      // Biometric failed, user can continue with PIN
      console.log('Biometric authentication failed, user can use PIN');
    }
  }, [authenticateWithBiometric]);

  const getBiometricIcon = useCallback(() => {
    if (biometricType === 'Face ID') {
      return <Shield color={theme.colors.primary} size={24} />;
    }
    return <Fingerprint color={theme.colors.primary} size={24} />;
  }, [biometricType, theme.colors.primary]);

  const getBiometricText = useCallback(() => {
    if (Platform.OS === 'android') {
      return 'Biometric';
    }
    return biometricType || 'Biometric';
  }, [biometricType]);

  useEffect(() => {
    if (pin.length === maxPinLength) {
      // Auto-verify PIN when 4 digits are entered - reduced delay for better responsiveness
      const timeoutId = setTimeout(async () => {
        const isValid = await unlock(pin);
        
        if (!isValid) {
          // Invalid PIN
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          
          // Trigger haptic feedback asynchronously
          if (Platform.OS !== 'web') {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } catch {
              // Haptics not available, use vibration fallback
              Vibration.vibrate(500);
            }
          }
          
          if (newAttempts >= maxAttempts) {
            Alert.alert(
              'Too Many Attempts',
              'You have entered an incorrect PIN too many times. Please restart the app and try again.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Incorrect PIN',
              `Please try again. ${maxAttempts - newAttempts} attempts remaining.`,
              [{ text: 'OK' }]
            );
          }
          
          setPin('');
        }
        // If valid, the unlock function will handle unlocking the app
      }, 150); // Reduced from 300ms to 150ms for better responsiveness
      
      return () => clearTimeout(timeoutId);
    }
  }, [pin, unlock, attempts]);

  const renderPinDots = useMemo(() => {
    return (
      <View style={styles.pinDotsContainer}>
        {Array.from({ length: maxPinLength }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              {
                backgroundColor: index < pin.length 
                  ? theme.colors.primary 
                  : 'transparent',
                borderColor: theme.colors.primary,
              }
            ]}
          />
        ))}
      </View>
    );
  }, [pin.length, theme.colors.primary]);

  const renderNumberPad = useMemo(() => {
    const numberRows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'delete']
    ];
    
    return (
      <View style={styles.numberPad}>
        {numberRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((item, itemIndex) => {
              if (item === '') {
                return <View key={itemIndex} style={styles.emptyButton} />;
              }
              
              if (item === 'delete') {
                return (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[
                      styles.numberButton, 
                      styles.deleteButton,
                      { backgroundColor: theme.colors.primary }
                    ]}
                    onPress={handleDelete}
                    activeOpacity={0.6}
                  >
                    <Delete color="white" size={24} />
                  </TouchableOpacity>
                );
              }
              
              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.numberButton,
                    { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={() => handleNumberPress(item)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numberButtonText}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  }, [theme.colors.primary, handleDelete, handleNumberPress]);

  const renderContent = () => (
    <View style={styles.content}>
      <View style={styles.header}>
          <View style={[styles.lockIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
            <Lock color={theme.colors.primary} size={32} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Enter PIN
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {showBiometricButton 
              ? `Use ${getBiometricText()} to unlock BitSleuth`
              : 'Enter your 4-digit PIN to unlock BitSleuth'
            }
          </Text>
          {attempts > 0 && (
            <Text style={[styles.attemptsText, { color: theme.colors.error }]}>
              {maxAttempts - attempts} attempts remaining
            </Text>
          )}
          
          {showBiometricButton && (
            <TouchableOpacity
              style={[styles.biometricButton, { 
                backgroundColor: theme.colors.primary + '20',
                borderColor: theme.colors.primary
              }]}
              onPress={handleBiometricAuth}
              activeOpacity={0.7}
            >
              {getBiometricIcon()}
              <Text style={[styles.biometricButtonText, { color: theme.colors.primary }]}>
                Use {getBiometricText()}
              </Text>
            </TouchableOpacity>
          )}
        </View>

      {renderPinDots}
      {renderNumberPad}
      
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleForgotPin} activeOpacity={0.7}>
          <Text style={[styles.footerText, { color: theme.colors.primary }]}>
            Forgot PIN? Restore Wallet
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <GradientBackground theme={theme} variant="primary">
        {renderContent()}
      </GradientBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 10 : 64,
    marginBottom: Platform.OS === 'android' ? 10 : 40,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  attemptsText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: Platform.OS === 'android' ? 20 : 60,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  numberPad: {
    alignItems: 'center',
    marginVertical: Platform.OS === 'android' ? 10 : 20,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  numberButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  emptyButton: {
    width: 72,
    height: 72,
  },
  deleteButton: {
    // backgroundColor will be set dynamically to theme.colors.primary
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: Platform.OS === 'android' ? 10 : 20,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? 80 : 20,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
  },
});