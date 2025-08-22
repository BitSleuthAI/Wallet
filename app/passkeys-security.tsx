import { useAutoLock } from '@/hooks/auto-lock-store';
import { useWallet } from '@/hooks/wallet-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from 'expo-router';
import {
  Fingerprint,
  Key,
  Plus,
  Shield,
  Smartphone,
  Trash2,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface SecurityKey {
  id: string;
  name: string;
  type: 'passkey' | 'fido' | 'biometric';
  dateAdded: string;
  lastUsed?: string;
}

export default function PasskeysSecurityScreen() {
  const { theme } = useWallet();
  const { biometricEnabled, biometricType, enableBiometric, disableBiometric } = useAutoLock();
  const [securityKeys, setSecurityKeys] = useState<SecurityKey[]>([]);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityKeys();
    checkBiometricAvailability();
  }, []);

  const loadSecurityKeys = async () => {
    try {
      const stored = await AsyncStorage.getItem('securityKeys');
      const keys = stored ? JSON.parse(stored) : [];
      setSecurityKeys(keys);
    } catch (error) {
      console.error('Error loading security keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const saveSecurityKeys = async (keys: SecurityKey[]) => {
    try {
      await AsyncStorage.setItem('securityKeys', JSON.stringify(keys));
      setSecurityKeys(keys);
    } catch (error) {
      console.error('Error saving security keys:', error);
      Alert.alert('Error', 'Failed to save security keys');
    }
  };

  const handleAddPasskey = () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Passkeys Not Supported',
        'Passkey registration is not available on web. Please use the mobile app to register passkeys.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Add Passkey',
      'This will register a new passkey with your device. You\'ll be prompted to authenticate.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: registerPasskey }
      ]
    );
  };

  const registerPasskey = async () => {
    try {
      // Simulate passkey registration (in a real app, this would use WebAuthn)
      const newKey: SecurityKey = {
        id: Date.now().toString(),
        name: `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} Passkey`,
        type: 'passkey',
        dateAdded: new Date().toISOString(),
      };

      const updatedKeys = [...securityKeys, newKey];
      await saveSecurityKeys(updatedKeys);
      
      Alert.alert('Success', 'Passkey registered successfully!');
    } catch (error) {
      console.error('Error registering passkey:', error);
      Alert.alert('Error', 'Failed to register passkey');
    }
  };

  const handleAddFIDOKey = () => {
    Alert.alert(
      'Add FIDO Security Key',
      'Connect your FIDO security key (like YubiKey) and follow the prompts.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: registerFIDOKey }
      ]
    );
  };

  const registerFIDOKey = async () => {
    try {
      // Simulate FIDO key registration
      const keyName = await new Promise<string>((resolve) => {
        Alert.prompt(
          'Name Your Security Key',
          'Give your security key a name for easy identification:',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve('') },
            { text: 'Add', onPress: (text) => resolve(text || 'Security Key') }
          ],
          'plain-text',
          'YubiKey'
        );
      });

      if (!keyName) return;

      const newKey: SecurityKey = {
        id: Date.now().toString(),
        name: keyName,
        type: 'fido',
        dateAdded: new Date().toISOString(),
      };

      const updatedKeys = [...securityKeys, newKey];
      await saveSecurityKeys(updatedKeys);
      
      Alert.alert('Success', 'FIDO security key registered successfully!');
    } catch (error) {
      console.error('Error registering FIDO key:', error);
      Alert.alert('Error', 'Failed to register FIDO security key');
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
        'Are you sure you want to disable biometric authentication for wallet unlock and transactions?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                await disableBiometric();
                
                // Remove biometric entry from security keys
                const updatedKeys = securityKeys.filter(key => key.type !== 'biometric');
                await saveSecurityKeys(updatedKeys);
                
                Alert.alert('Success', 'Biometric authentication disabled!');
              } catch (error) {
                console.error('Error disabling biometric:', error);
                Alert.alert('Error', 'Failed to disable biometric authentication');
              }
            }
          }
        ]
      );
    } else {
      // Enable biometric
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to enable biometric security for wallet unlock and transactions',
          fallbackLabel: 'Use PIN',
        });

        if (result.success) {
          const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
          const isFaceID = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
          const biometricTypeName = Platform.OS === 'ios' ? (isFaceID ? 'Face ID' : 'Touch ID') : 'Biometric';
          
          await enableBiometric(biometricTypeName);
          
          // Add biometric entry to security keys
          const newKey: SecurityKey = {
            id: 'biometric',
            name: biometricTypeName,
            type: 'biometric',
            dateAdded: new Date().toISOString(),
          };

          const updatedKeys = [...securityKeys.filter(key => key.type !== 'biometric'), newKey];
          await saveSecurityKeys(updatedKeys);
          
          Alert.alert('Success', `${biometricTypeName} enabled for wallet unlock and transactions!`);
        }
      } catch (error) {
        console.error('Error enabling biometric:', error);
        Alert.alert('Error', 'Failed to enable biometric authentication');
      }
    }
  };

  const handleRemoveKey = (keyId: string, keyName: string) => {
    Alert.alert(
      'Remove Security Key',
      `Are you sure you want to remove "${keyName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (keyId === 'biometric') {
                await disableBiometric();
              }
              
              const updatedKeys = securityKeys.filter(key => key.id !== keyId);
              await saveSecurityKeys(updatedKeys);
              
              Alert.alert('Success', `"${keyName}" has been removed successfully.`);
            } catch (error) {
              console.error('Error removing security key:', error);
              Alert.alert('Error', 'Failed to remove security key');
            }
          }
        }
      ]
    );
  };

  const getKeyIcon = (type: SecurityKey['type']) => {
    switch (type) {
      case 'biometric':
        return Fingerprint;
      case 'fido':
        return Shield;
      case 'passkey':
        return Smartphone;
      default:
        return Key;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const SecurityKeyItem = ({ securityKey }: { securityKey: SecurityKey }) => {
    const IconComponent = getKeyIcon(securityKey.type);
    
    return (
      <View style={[styles.keyItem, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.keyIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
          <IconComponent color={theme.colors.primary} size={20} />
        </View>
        <View style={styles.keyContent}>
          <Text style={[styles.keyName, { color: theme.colors.text }]}>
            {securityKey.name}
          </Text>
          <Text style={[styles.keyDate, { color: theme.colors.textSecondary }]}>
            Added {formatDate(securityKey.dateAdded)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveKey(securityKey.id, securityKey.name)}
        >
          <Trash2 color={theme.colors.error} size={18} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen 
          options={{ 
            title: 'Passkeys & Security Keys',
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
          }} 
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading security settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Passkeys & Security Keys',
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
        }} 
      />
      
      <ScrollView style={styles.scrollView}>
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.headerTitle}>Manage Your Keys</Text>
          <Text style={styles.headerSubtitle}>
            Add a hardware security key (like a YubiKey) or a device passkey (like Face ID) to add an extra layer of security to your wallet.
          </Text>
          
          {/* Empty State */}
          {securityKeys.length === 0 && (
            <View style={styles.emptyState}>
              <Key color="rgba(255, 255, 255, 0.7)" size={48} />
              <Text style={styles.emptyStateTitle}>No keys registered</Text>
              <Text style={styles.emptyStateSubtitle}>Add a key to get started.</Text>
            </View>
          )}
          
          {/* Add New Key Button */}
          <TouchableOpacity 
            style={styles.addKeyButton}
            onPress={() => {
              Alert.alert(
                'Add Security Key',
                'Choose the type of security key you want to add:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Passkey', onPress: handleAddPasskey },
                  { text: 'FIDO Key', onPress: handleAddFIDOKey },
                ]
              );
            }}
          >
            <Plus color={theme.colors.primary} size={20} />
            <Text style={[styles.addKeyText, { color: theme.colors.primary }]}>
              Add a New Key
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security Keys List */}
        {securityKeys.length > 0 && (
          <View style={styles.keysSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Registered Keys
            </Text>
            {securityKeys.map((key) => (
              <SecurityKeyItem key={key.id} securityKey={key} />
            ))}
          </View>
        )}

        {/* Biometric Authentication Section */}
        {biometricAvailable && (
          <View style={styles.biometricSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Biometric Authentication
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
                  {biometricEnabled && biometricType ? biometricType : (Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Biometric Authentication')}
                </Text>
                <Text style={[styles.keyDate, { color: theme.colors.textSecondary }]}>
                  {biometricEnabled ? 'Enabled for wallet unlock and transactions' : 'Tap to enable'}
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
          </View>
        )}

        {/* Note */}
        <View style={styles.noteSection}>
          <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
            Note: Passkeys are stored on this device only. They do not sync automatically. You will need to register keys on each device you use.
          </Text>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
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
});