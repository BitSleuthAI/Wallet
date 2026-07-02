import { GradientBackground } from '@/components/GradientBackground';
import { useAutoLock } from '@/hooks/auto-lock-store';
import { useTheme } from '@/hooks/theme-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Check, Fingerprint, Shield } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function BiometricSetupScreen() {
  const { theme } = useTheme();
  const { biometricEnabled, enableBiometric } = useAutoLock();
  const [isSupported, setIsSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSetupBiometric, setHasSetupBiometric] = useState(false);

  // If biometric is already enabled, skip this screen
  useEffect(() => {
    if (biometricEnabled) {
      console.log('Biometric already enabled, navigating to tabs...');
      router.replace('/(tabs)');
    }
  }, [biometricEnabled]);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      console.log('Checking biometric support...');
      
      const compatible = await LocalAuthentication.hasHardwareAsync();
      console.log('Hardware compatible:', compatible);
      
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('Biometric enrolled:', enrolled);
      
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('Supported authentication types:', supportedTypes);
      
      // On mobile, we should support biometric if hardware is available
      // Even if not enrolled, we can still show the option
      const shouldSupport = compatible;
      console.log('Should support biometric:', shouldSupport);
      
      setIsSupported(shouldSupport);
      
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Touch ID');
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('Iris');
      } else {
        setBiometricType('Biometric');
      }
      
      console.log('Final biometric type:', supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? 'Face ID' : supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT) ? 'Touch ID' : 'Biometric');
    } catch (error) {
      console.error('Error checking biometric support:', error);
      setIsSupported(false);
    }
  };

  const handleEnableBiometric = async () => {
    if (!isSupported) {
      Alert.alert(
        'Biometric Not Available',
        'Biometric authentication is not available on this device or not set up in device settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Attempting biometric authentication...');
      
      // Check if biometric is enrolled before attempting authentication
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('Biometric enrolled check:', enrolled);
      
      if (!enrolled) {
        const setupMessage = Platform.OS === 'android'
          ? 'Please set up biometric authentication in your device settings first, then try again.'
          : `Please set up ${biometricType} in your device settings first, then try again.`;
        
        Alert.alert(
          'Biometric Not Set Up',
          setupMessage,
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }
      
      const promptMessage = Platform.OS === 'android'
        ? 'Enable biometric authentication for wallet access'
        : `Enable ${biometricType} for wallet access`;
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN instead',
      });

      console.log('Authentication result:', result);

      if (result.success) {
        // Save biometric settings
        await enableBiometric(biometricType);
        setHasSetupBiometric(true);
        const successMessage = Platform.OS === 'android' 
          ? 'Biometric authentication has been enabled for your wallet.'
          : `${biometricType} has been enabled for your wallet.`;
        
        Alert.alert(
          'Success!',
          successMessage,
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/(tabs)')
            }
          ]
        );
      } else {
        console.log('Authentication failed:', result.error);
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication was not successful. You can still use your PIN to access your wallet.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert(
        'Error',
        'There was an error setting up biometric authentication. You can still use your PIN to access your wallet.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    console.log('User tapped Skip for now');
    
    // On iOS, sometimes Alert doesn't show properly, so we'll make it more reliable
    if (Platform.OS === 'ios') {
      // Direct navigation for iOS to ensure it works
      console.log('iOS detected, navigating directly to tabs...');
      router.replace('/(tabs)');
    } else {
      // Show confirmation dialog on other platforms
      Alert.alert(
        'Skip Biometric Setup?',
        'You can always enable biometric authentication later in settings. You will use your PIN to access your wallet.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Skip', 
            onPress: () => {
              console.log('User confirmed skip, navigating to tabs...');
              router.replace('/(tabs)');
            }
          }
        ]
      );
    }
  };

  const getBiometricIcon = () => {
    if (biometricType === 'Face ID') {
      return <Shield color={theme.colors.primary} size={64} />;
    }
    return <Fingerprint color={theme.colors.primary} size={64} />;
  };

  const getBiometricDescription = () => {
    if (Platform.OS === 'android') {
      return 'Use biometric authentication to quickly and securely access your wallet without entering your PIN every time.';
    } else if (biometricType === 'Face ID') {
      return 'Use Face ID to quickly and securely access your wallet without entering your PIN every time.';
    } else if (biometricType === 'Touch ID') {
      return 'Use Touch ID to quickly and securely access your wallet without entering your PIN every time.';
    }
    return 'Use biometric authentication to quickly and securely access your wallet without entering your PIN every time.';
  };

  const getBiometricTitle = () => {
    if (Platform.OS === 'android') {
      return 'Enable Biometric';
    } else if (biometricType === 'Face ID') {
      return 'Enable Face ID';
    } else if (biometricType === 'Touch ID') {
      return 'Enable Touch ID';
    }
    return 'Enable Biometric';
  };

  const getBiometricButtonText = () => {
    if (Platform.OS === 'android') {
      return 'Enable Biometric';
    } else if (biometricType === 'Face ID') {
      return 'Enable Face ID';
    } else if (biometricType === 'Touch ID') {
      return 'Enable Touch ID';
    }
    return 'Enable Biometric';
  };

  if (hasSetupBiometric) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />
          
          <View style={styles.content}>
            <View style={styles.successContainer}>
              <View style={[styles.successIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Check color={theme.colors.primary} size={48} />
              </View>
              
              <Text style={[styles.title, { color: theme.colors.text }]}>
                All Set!
            </Text>
            
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Your wallet is now secured with {Platform.OS === 'android' ? 'biometric authentication' : biometricType} and PIN protection.
            </Text>
            
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}
            >
              <Text style={styles.continueButtonText}>Continue to Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

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
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
            {getBiometricIcon()}
          </View>
          
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {getBiometricTitle()}
          </Text>
          
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {getBiometricDescription()}
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Shield color={theme.colors.primary} size={24} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                Enhanced Security
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                Your biometric data never leaves your device
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Fingerprint color={theme.colors.primary} size={24} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                Quick Access
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                Access your wallet instantly without typing your PIN
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {isSupported ? (
            <TouchableOpacity
              style={[styles.enableButton, { 
                backgroundColor: theme.colors.primary,
                opacity: isLoading ? 0.6 : 1
              }]}
              onPress={handleEnableBiometric}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.enableButtonText}>
                {isLoading ? 'Setting up...' : getBiometricButtonText()}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.notAvailableContainer, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }]}>
              <Text style={[styles.notAvailableText, { color: theme.colors.textSecondary }]}>
                {Platform.OS === 'web' 
                  ? 'Biometric authentication is not available on web. You can use your PIN to access your wallet.'
                  : 'Biometric authentication is not available on this device. Please check that biometric authentication is set up in your device settings, then restart the app.'
                }
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
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
  features: {
    gap: 24,
    marginVertical: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    paddingBottom: 40,
    gap: 16,
  },
  enableButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  enableButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  notAvailableContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  notAvailableText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  continueButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 40,
    minWidth: 200,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});