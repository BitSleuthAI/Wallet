import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Vibration,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useWallet } from '@/hooks/wallet-store';

export default function PinSetupScreen() {
  const { theme } = useWallet();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState<'setup' | 'confirm'>('setup');

  const maxPinLength = 4;

  const handleNumberPress = async (number: string) => {
    if (Platform.OS !== 'web') {
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
    if (Platform.OS !== 'web') {
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
        // PINs match, proceed to biometric setup
        setTimeout(() => {
          router.push('/biometric-setup');
        }, 300);
      } else {
        // PINs don't match, show error and reset
        if (Platform.OS !== 'web') {
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
  }, [confirmPin, pin, mode]);

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
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];
    
    return (
      <View style={styles.numberPad}>
        {numbers.map((item, index) => {
          if (item === '') {
            return <View key={index} style={styles.numberButton} />;
          }
          
          if (item === 'delete') {
            return (
              <TouchableOpacity
                key={index}
                style={[styles.numberButton, styles.deleteButton]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Delete color={theme.colors.text} size={24} />
              </TouchableOpacity>
            );
          }
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.numberButton,
                { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => handleNumberPress(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.numberButtonText}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
              ? 'This 4-digit PIN will be used to unlock your wallet on this device.'
              : 'Please enter your PIN again to confirm.'
            }
          </Text>
        </View>

        {renderPinDots(mode === 'setup' ? pin : confirmPin)}
        {renderNumberPad()}
      </View>
    </SafeAreaView>
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
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
    gap: 20,
    marginVertical: 60,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 40,
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: 'transparent',
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
});