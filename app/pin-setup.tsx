import { GradientBackground } from '@/components/GradientBackground';
import { useAutoLock } from '@/hooks/auto-lock-store';
import { useWallet } from '@/hooks/wallet-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Delete } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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

export default function PinSetupScreen() {
  const { theme, wallets } = useWallet();
  const { savePin } = useAutoLock();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState<'setup' | 'confirm'>('setup');

  const maxPinLength = 4;

  const handleNumberPress = async (number: string) => {
    if (true) {
      try {
        await Haptics.selectionAsync();
      } catch {
        // Haptics not available, continue silently
      }
    }

    if (mode === 'setup') {
      if (pin.length < maxPinLength) {
        setPin(prev => prev + number);
      }
    } else {
      if (confirmPin.length < maxPinLength) {
        setConfirmPin(prev => prev + number);
      }
    }
  };

  const handleDelete = async () => {
    if (true) {
      try {
        await Haptics.selectionAsync();
      } catch {
        // Haptics not available, continue silently
      }
    }

    if (mode === 'setup') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  useEffect(() => {
    if (mode === 'setup' && pin.length === maxPinLength) {
      // Auto-advance to confirm mode
      setTimeout(() => {
        setMode('confirm');
      }, 300);
    }
  }, [pin, mode]);

  useEffect(() => {
    if (mode === 'confirm' && confirmPin.length === maxPinLength) {
      // Check if PINs match
      if (pin === confirmPin) {
        // PINs match, save PIN and proceed to biometric setup
        const savePinAndProceed = async () => {
          try {
            await savePin(pin);
            setTimeout(async () => {
              // Check if biometric was previously enabled
              const biometricWasEverEnabled = await AsyncStorage.getItem('biometricEnabled');
              if (biometricWasEverEnabled === 'true') {
                // Biometric was previously enabled, skip setup and go to main app
                router.replace('/(tabs)');
              } else {
                // Biometric was never enabled, go to setup
                router.push('/biometric-setup');
              }
            }, 300);
          } catch (error) {
            console.error('Error saving PIN:', error);
            Alert.alert(
              'Error',
              'Failed to save PIN. Please try again.',
              [{ text: 'OK' }]
            );
          }
        };
        savePinAndProceed();
      } else {
        // PINs don't match, show error and reset
        if (true) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch {
            // Haptics not available, use vibration fallback
            Vibration.vibrate(500);
          }
        }
        
        Alert.alert(
          'PIN Mismatch',
          'The PINs you entered do not match. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                setPin('');
                setConfirmPin('');
                setMode('setup');
              }
            }
          ]
        );
      }
    }
  }, [confirmPin, pin, mode, savePin]);

  const renderPinDots = (currentPin: string) => {
    return (
      <View style={styles.pinDotsContainer}>
        {Array.from({ length: maxPinLength }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              {
                backgroundColor: index < currentPin.length 
                  ? theme.colors.primary 
                  : 'transparent',
                borderColor: theme.colors.primary,
              }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumberPad = () => {
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
  };

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {mode === 'setup' ? 'Set a PIN' : 'Confirm PIN'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {mode === 'setup' 
                ? wallets.length === 0 
                  ? 'This 4-digit PIN will be used to secure all your wallets on this device.'
                  : 'This 4-digit PIN will be used to unlock your wallet on this device.'
                : 'Please enter your PIN again to confirm.'
              }
            </Text>
          </View>

          {renderPinDots(mode === 'setup' ? pin : confirmPin)}
          {renderNumberPad()}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    marginTop: 20,
    marginLeft: 20,
    marginBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 60,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  numberPad: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 40,
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
    ...platformStyles.shadow,
  },
  emptyButton: {
    width: 72,
    height: 72,
  },

  numberButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
});