import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import { ArrowLeft, Delete } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWallet } from '@/hooks/wallet-store';
import * as Haptics from 'expo-haptics';

interface PinVerificationScreenProps {
  title: string;
  subtitle: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function PinVerificationScreen({
  title,
  subtitle,
  onSuccess,
  onBack,
}: PinVerificationScreenProps) {
  const { theme } = useWallet();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleNumberPress = (number: string) => {
    if (pin.length < 4) {
      const newPin = pin + number;
      setPin(newPin);
      setError('');
      
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError('');
      
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  };

  const verifyPin = async (enteredPin: string) => {
    setIsLoading(true);
    try {
      const storedPin = await AsyncStorage.getItem('pin');
      
      if (storedPin === enteredPin) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onSuccess();
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Vibration.vibrate(500);
        }
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setError('Error verifying PIN. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {[...Array(4)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              {
                backgroundColor: index < pin.length ? theme.colors.primary : 'transparent',
                borderColor: index < pin.length ? theme.colors.primary : theme.colors.border,
              },
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
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handleDelete}
                    disabled={isLoading}
                    activeOpacity={0.6}
                  >
                    <Delete size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                );
              }
              
              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.numberButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => handleNumberPress(item)}
                  disabled={isLoading}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numberText}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          testID="back-button"
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Enter your PIN
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>

        {renderPinDots()}

        {error ? (
          <Text style={[styles.errorText, { color: '#EF4444' }]}>
            {error}
          </Text>
        ) : null}

        {renderNumberPad()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
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

  numberText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});