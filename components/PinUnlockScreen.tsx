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
import { Delete, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useWallet } from '@/hooks/wallet-store';
import { useAutoLock } from '@/hooks/auto-lock-store';

export default function PinUnlockScreen() {
  const { theme } = useWallet();
  const { unlock } = useAutoLock();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);

  const maxPinLength = 4;
  const maxAttempts = 5;

  const handleNumberPress = async (number: string) => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch {
        // Haptics not available, continue silently
      }
    }

    if (pin.length < maxPinLength) {
      setPin(prev => prev + number);
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

    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === maxPinLength) {
      // Auto-verify PIN when 4 digits are entered
      setTimeout(async () => {
        const isValid = await unlock(pin);
        
        if (!isValid) {
          // Invalid PIN
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          
          if (Platform.OS !== 'web') {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      }, 300);
    }
  }, [pin, unlock, attempts]);

  const renderPinDots = () => {
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
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.lockIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
            <Lock color={theme.colors.primary} size={32} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Enter PIN
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Enter your 4-digit PIN to unlock the app
          </Text>
          {attempts > 0 && (
            <Text style={[styles.attemptsText, { color: theme.colors.error }]}>
              {maxAttempts - attempts} attempts remaining
            </Text>
          )}
        </View>

        {renderPinDots()}
        {renderNumberPad()}
      </View>
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
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
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
  attemptsText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 80,
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
    paddingBottom: 60,
    marginTop: 'auto',
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