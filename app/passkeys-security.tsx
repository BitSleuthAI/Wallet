import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { useAutoLock } from '@/hooks/auto-lock-store';
import { useWallet } from '@/hooks/wallet-store';
import { secureAuthService, SecuritySettings } from '@/services/secure-auth-service';
import { securityGuard } from '@/services/security-guard-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { router, Stack } from 'expo-router';
import {
    ArrowLeft,
    Fingerprint,
    Shield
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PasskeysSecurityScreen() {
  const { theme } = useWallet();
  const { biometricEnabled, enableBiometric, disableBiometric } = useAutoLock();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    requireBiometricForTransactions: true,
    requireSecurityKeyForTransactions: false,
    allowPINFallback: true,
    multiFactorEnabled: false,
  });

  useEffect(() => {
    loadSecuritySettings();
    checkBiometricAvailability();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('securitySettings');
      if (stored) {
        setSecuritySettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSecuritySettings = async (settings: SecuritySettings) => {
    try {
      await AsyncStorage.setItem('securitySettings', JSON.stringify(settings));
      setSecuritySettings(settings);
    } catch (error) {
      console.error('Error saving security settings:', error);
      Alert.alert('Error', 'Failed to save security settings');
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const available = await secureAuthService.isBiometricAvailable();
      setBiometricAvailable(available);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const handleToggleBiometric = async () => {
    if (!biometricAvailable) {
      Alert.alert(
        'Biometric Not Available',
        'Biometric authentication is not available on this device or not set up.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (biometricEnabled) {
      // Disable biometric
      Alert.alert(
        'Disable Biometric Authentication',
        'Are you sure you want to disable biometric authentication? This will require PIN entry for all wallet operations.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              // SECURITY HARDENING: Require authentication to disable biometric
              const authSuccess = await securityGuard.requireAuthenticationForBiometricOperation(
                'disable biometric authentication'
              );
              
              if (!authSuccess) {
                return; // Authentication failed, security guard handles user notification
              }
              
              try {
                await disableBiometric();
                Alert.alert('Success', 'Biometric authentication disabled successfully!');
              } catch (error) {
                console.error('❌ Error disabling biometric:', error);
                Alert.alert('Error', 'Failed to disable biometric authentication');
              }
            }
          }
        ]
      );
    } else {
      // Enable biometric with secure registration
      try {
        // Register a new biometric key with cryptographic verification
        const newKey = await secureAuthService.registerBiometricKey();
        
        if (newKey) {
          const biometricTypeName = secureAuthService.getBiometricType();
          await enableBiometric(biometricTypeName);
          Alert.alert('Success', `${biometricTypeName} enabled for wallet unlock and transactions!`);
        } else {
          Alert.alert('Error', 'Failed to register biometric key');
        }
      } catch (error) {
        console.error('Error enabling biometric:', error);
        Alert.alert('Error', 'Failed to enable biometric authentication');
      }
    }
  };

  const handleSecuritySettingChange = async (setting: keyof SecuritySettings, value: boolean) => {
    // Only handle requireBiometricForTransactions
    if (setting !== 'requireBiometricForTransactions') {
      return;
    }

    // SECURITY HARDENING: Require authentication before any security configuration changes
    const authSuccess = await securityGuard.requireAuthenticationForSecurityOperation(
      'modify security settings'
    );
    
    if (!authSuccess) {
      return; // Authentication failed, security guard handles user notification
    }
    
    const newSettings = { ...securitySettings, [setting]: value };
    await saveSecuritySettings(newSettings);
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <AndroidSafeContainer style={styles.container}>
          <Stack.Screen 
            options={{ 
              headerShown: false,
            }} 
          />
          
          {/* Custom Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              testID="back-button"
            >
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Biometric Authentication
          </Text>
          <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading security settings...
            </Text>
          </View>
        </AndroidSafeContainer>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <AndroidSafeContainer style={styles.container} enableBottomPadding={false}>
        <Stack.Screen 
          options={{ 
            headerShown: false,
          }} 
        />
        
        {/* Custom Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            testID="back-button"
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Biometric Authentication
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Biometric Authentication Section */}
        {!biometricAvailable && (
          <View style={styles.biometricSection}>
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
              <Fingerprint color={theme.colors.textSecondary} size={32} />
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                Biometric Authentication Not Available
              </Text>
              <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                Biometric authentication is not available on this device or has not been set up. Please enable {Platform.OS === 'android' ? 'fingerprint or face unlock' : 'Face ID or Touch ID'} in your device settings.
              </Text>
            </View>
          </View>
        )}

        {biometricAvailable && (
          <View style={styles.biometricSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Authentication Settings
            </Text>
            
            <TouchableOpacity
              style={[styles.biometricItem, { backgroundColor: theme.colors.surface }]}
              onPress={handleToggleBiometric}
            >
              <View style={[styles.keyIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Fingerprint color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.keyContent}>
                <Text style={[styles.keyName, { color: theme.colors.text }]}>
                  Enable Biometric Authentication
                </Text>
                <Text style={[styles.keyDate, { color: theme.colors.textSecondary }]}>
                  {biometricEnabled ? 'Enabled for wallet unlock' : 'Tap to enable'}
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { backgroundColor: biometricEnabled ? theme.colors.primary : theme.colors.textSecondary + '40' }
              ]}>
                <View style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: biometricEnabled ? 20 : 2 }] }
                ]} />
              </View>
            </TouchableOpacity>

            <View style={[styles.settingItem, { backgroundColor: theme.colors.surface, marginTop: 12 }]}>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  Require Biometric for Transactions
                </Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {Platform.OS === 'android' ? 'Biometric' : 'Face ID/Touch ID'} required before sending funds
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, { backgroundColor: securitySettings.requireBiometricForTransactions ? theme.colors.primary : theme.colors.textSecondary + '40' }]}
                onPress={() => handleSecuritySettingChange('requireBiometricForTransactions', !securitySettings.requireBiometricForTransactions)}
              >
                <View style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: securitySettings.requireBiometricForTransactions ? 20 : 2 }] }
                ]} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Security Recommendations */}
        <View style={[styles.recommendationsCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.recommendationsHeader}>
            <Shield color={theme.colors.primary} size={20} />
            <Text style={[styles.recommendationsTitle, { color: theme.colors.text }]}>
              Security Best Practices
            </Text>
          </View>
          
          <View style={styles.recommendationsList}>
            <Text style={[styles.recommendationItem, { color: theme.colors.textSecondary }]}>
              • Enable biometric authentication for quick and secure wallet access
            </Text>
            <Text style={[styles.recommendationItem, { color: theme.colors.textSecondary }]}>
              • Require biometric verification before sending transactions
            </Text>
            <Text style={[styles.recommendationItem, { color: theme.colors.textSecondary }]}>
              • Set a strong PIN as a backup authentication method
            </Text>
            <Text style={[styles.recommendationItem, { color: theme.colors.textSecondary }]}>
              • Keep your device physically secure at all times
            </Text>
            <Text style={[styles.recommendationItem, { color: theme.colors.textSecondary }]}>
              • Regularly review your security settings and transaction history
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
        </ScrollView>
      </AndroidSafeContainer>
    </GradientBackground>
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
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  headerSpacer: {
    width: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  headerCard: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 24,
    textAlign: 'center',
  },
  addKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  addKeyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  keysSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  keysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  biometricSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  biometricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  keyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  keyContent: {
    flex: 1,
  },
  keyName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  keyDate: {
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  noteSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 40,
  },
  statusCard: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginLeft: 8,
  },
  statusItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  statusIndicator: {
    width: 60,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  settingsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingContent: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  verifiedText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationsCard: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  recommendationsList: {
    marginTop: 10,
  },
  recommendationItem: {
    fontSize: 14,
    marginBottom: 8,
  },
  testCard: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  testTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  testDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  testButtons: {
    gap: 8,
  },
});