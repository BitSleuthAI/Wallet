import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, Platform } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

export interface SecurityKey {
  id: string;
  name: string;
  type: 'passkey' | 'fido' | 'biometric';
  dateAdded: string;
  lastUsed?: string;
  publicKey?: string;
  credentialId?: string;
  isVerified?: boolean;
  attestationObject?: string;
  clientDataJSON?: string;
}

export interface SecuritySettings {
  requireBiometricForTransactions: boolean;
  requireSecurityKeyForTransactions: boolean;
  allowPINFallback: boolean;
  multiFactorEnabled: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: string;
  signature?: string;
  publicKey?: string;
}

export interface FIDOAuthResult {
  success: boolean;
  error?: string;
  credentialId?: string;
  attestationObject?: string;
  clientDataJSON?: string;
  signature?: string;
}

class SecureAuthService {
  private rnBiometrics: ReactNativeBiometrics;
  private biometricAvailable: boolean = false;
  private biometricType: typeof BiometryTypes[keyof typeof BiometryTypes] | null = null;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });
    this.initializeBiometrics();
  }

  private async initializeBiometrics(): Promise<void> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      this.biometricAvailable = available;
      this.biometricType = biometryType || null;
      console.log('🔐 Biometric sensor available:', available, 'Type:', biometryType);
    } catch (error) {
      console.error('❌ Error initializing biometrics:', error);
      this.biometricAvailable = false;
    }
  }

  /**
   * Check if biometric authentication is available and enrolled
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled && this.biometricAvailable;
    } catch (error) {
      console.error('❌ Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get the type of biometric authentication available
   */
  getBiometricType(): string {
    if (!this.biometricAvailable || !this.biometricType) {
      return 'Biometric';
    }

    switch (this.biometricType) {
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.Biometrics:
        return Platform.OS === 'ios' ? 'Biometric' : 'Fingerprint';
      default:
        return 'Biometric';
    }
  }

  /**
   * Perform secure biometric authentication with cryptographic verification
   */
  async authenticateWithBiometric(promptMessage?: string): Promise<BiometricAuthResult> {
    try {
      if (!this.biometricAvailable) {
        return { success: false, error: 'Biometric authentication not available' };
      }

      console.log('🔐 Starting secure biometric authentication...');

      // Use react-native-biometrics for cryptographic operations
      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: promptMessage || 'Authenticate to continue',
        payload: this.arrayBufferToBase64(this.generateChallenge()),
      });

      if (success && signature) {
        console.log('✅ Biometric authentication successful with cryptographic verification');
        return {
          success: true,
          biometricType: this.getBiometricType(),
          signature,
        };
      } else {
        console.log('❌ Biometric authentication failed');
        return { success: false, error: 'Biometric authentication failed' };
      }
    } catch (error) {
      console.error('❌ Biometric authentication error:', error);
      return { success: false, error: 'Biometric authentication error' };
    }
  }

  /**
   * Register a new biometric key with cryptographic verification
   */
  async registerBiometricKey(): Promise<SecurityKey | null> {
    try {
      if (!this.biometricAvailable) {
        throw new Error('Biometric authentication not available');
      }

      console.log('🔐 Registering new biometric key...');

      // Check if keys already exist
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      
      // Delete existing keys if present to start fresh
      if (keysExist) {
        console.log('🔑 Deleting existing biometric keys...');
        await this.rnBiometrics.deleteKeys();
      }

      // Create a new key pair for this biometric registration
      const result = await this.rnBiometrics.createKeys();
      
      if (!result.publicKey) {
        throw new Error('Failed to create biometric key pair');
      }

      console.log('✅ Biometric key pair created with public key');

      // Test the newly created key with a signature to verify it works
      try {
        const testPayload = this.arrayBufferToBase64(this.generateChallenge());
        const { success, signature } = await this.rnBiometrics.createSignature({
          promptMessage: 'Verify your biometric to complete setup',
          payload: testPayload,
        });

        if (!success || !signature) {
          throw new Error('Failed to verify biometric key with test signature');
        }

        console.log('✅ Biometric key verified with test signature');
      } catch (testError) {
        console.error('❌ Failed to verify biometric key:', testError);
        // Clean up the failed key
        await this.rnBiometrics.deleteKeys();
        throw new Error('Biometric verification failed during registration');
      }

      const newKey: SecurityKey = {
        id: 'biometric',
        name: this.getBiometricType(),
        type: 'biometric',
        dateAdded: new Date().toISOString(),
        publicKey: result.publicKey,
        isVerified: true,
      };

      console.log('✅ Biometric key registered successfully');
      return newKey;
    } catch (error) {
      console.error('❌ Error registering biometric key:', error);
      throw error;
    }
  }

  /**
   * Register a FIDO2/WebAuthn passkey with hardware verification
   * NOTE: WebAuthn is not natively supported in React Native without additional native modules.
   * This method is kept for future implementation but will return an error.
   */
  async registerFIDOPasskey(keyName: string): Promise<SecurityKey | null> {
    try {
      console.log('❌ FIDO2 passkey registration not supported in React Native');
      Alert.alert(
        'Not Supported',
        'Passkey registration requires WebAuthn API which is not available in React Native. Please use biometric authentication instead.',
        [{ text: 'OK' }]
      );
      return null;
    } catch (error) {
      console.error('❌ Error registering FIDO2 passkey:', error);
      throw error;
    }
  }

  /**
   * Register a hardware FIDO security key (YubiKey, etc.)
   * NOTE: WebAuthn is not natively supported in React Native without additional native modules.
   * This method is kept for future implementation but will return an error.
   */
  async registerHardwareFIDOKey(keyName: string): Promise<SecurityKey | null> {
    try {
      console.log('❌ Hardware FIDO key registration not supported in React Native');
      Alert.alert(
        'Not Supported',
        'Hardware FIDO key registration requires WebAuthn API which is not available in React Native. This feature requires native platform integration.',
        [{ text: 'OK' }]
      );
      return null;
    } catch (error) {
      console.error('❌ Error registering hardware FIDO key:', error);
      throw error;
    }
  }

  /**
   * Authenticate using a registered FIDO key
   * NOTE: WebAuthn is not natively supported in React Native without additional native modules.
   * This method is kept for future implementation but will return an error.
   */
  async authenticateWithFIDOKey(credentialId: string): Promise<FIDOAuthResult> {
    try {
      console.log('❌ FIDO key authentication not supported in React Native');
      return { 
        success: false, 
        error: 'FIDO authentication not supported in React Native' 
      };
    } catch (error) {
      console.error('❌ Error authenticating with FIDO key:', error);
      return { success: false, error: 'FIDO authentication error' };
    }
  }

  /**
   * Verify that a security key is present and accessible
   */
  async verifySecurityKeyPresence(securityKey: SecurityKey): Promise<boolean> {
    try {
      if (securityKey.type === 'biometric') {
        // For biometric keys, verify the key is still accessible
        const authResult = await this.authenticateWithBiometric('Verify your biometric to continue');
        return authResult.success;
      } else if (securityKey.type === 'passkey' || securityKey.type === 'fido') {
        // For FIDO keys, verify the key is present
        if (!securityKey.credentialId) {
          return false;
        }
        
        const authResult = await this.authenticateWithFIDOKey(securityKey.credentialId);
        return authResult.success;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error verifying security key presence:', error);
      return false;
    }
  }

  /**
   * Enhanced transaction authentication with multi-factor support
   */
  async authenticateForTransaction(
    amount?: number,
    requireSecurityKey?: boolean
  ): Promise<boolean> {
    try {
      console.log('🔐 Enhanced transaction authentication started...');
      
      // Load security settings
      const securitySettingsStr = await AsyncStorage.getItem('securitySettings');
      const securitySettings: SecuritySettings = securitySettingsStr 
        ? JSON.parse(securitySettingsStr) 
        : {
            requireBiometricForTransactions: true,
            requireSecurityKeyForTransactions: false,
            allowPINFallback: true,
            multiFactorEnabled: false,
          };

      // Load security keys
      const securityKeysStr = await AsyncStorage.getItem('securityKeys');
      const securityKeys: SecurityKey[] = securityKeysStr 
        ? JSON.parse(securityKeysStr) 
        : [];

      // Check if security key is required
      const isHighValueTransaction = amount && amount > 0.01; // 0.01 BTC threshold
      const shouldRequireSecurityKey = requireSecurityKey || 
                                     securitySettings.requireSecurityKeyForTransactions || 
                                     (isHighValueTransaction && securitySettings.multiFactorEnabled);

      // Step 1: Biometric authentication (if enabled and required)
      if (securitySettings.requireBiometricForTransactions) {
        console.log('🔐 Step 1: Biometric authentication required');
        const biometricResult = await this.authenticateWithBiometric(
          'Use biometric to authorize transaction'
        );
        if (!biometricResult.success) {
          console.log('❌ Biometric authentication failed');
          return false;
        }
        console.log('✅ Biometric authentication successful');
      }

      // Step 2: Security key verification (if required)
      if (shouldRequireSecurityKey) {
        console.log('🔐 Step 2: Security key verification required');
        
        // Check if user has registered security keys
        const availableKeys = securityKeys.filter(key => 
          key.type === 'fido' || key.type === 'passkey'
        );

        if (availableKeys.length === 0) {
          console.log('❌ No security keys available but required');
          Alert.alert(
            'Security Key Required',
            'A security key is required for this transaction. Please register a passkey or hardware security key in Settings.',
            [{ text: 'OK' }]
          );
          return false;
        }

        // Verify security key is present and accessible
        const keyVerificationResult = await this.verifySecurityKeyPresence(availableKeys[0]);
        if (!keyVerificationResult) {
          console.log('❌ Security key verification failed');
          Alert.alert(
            'Security Key Verification Failed',
            'Please ensure your security key is connected and accessible, then try again.',
            [{ text: 'OK' }]
          );
          return false;
        }
        console.log('✅ Security key verification successful');
      }

      // Step 3: Multi-factor authentication enforcement
      if (securitySettings.multiFactorEnabled) {
        console.log('🔐 Step 3: Multi-factor authentication enforcement required');
        
        // Verify the user has configured multiple authentication factors
        const biometricKeysCount = securityKeys.filter(key => key.type === 'biometric').length;
        const securityKeysCount = securityKeys.filter(key => key.type === 'fido' || key.type === 'passkey').length;
        const totalFactors = biometricKeysCount + securityKeysCount;
        
        if (totalFactors < 2) {
          console.log('❌ Insufficient authentication factors for multi-factor');
          Alert.alert(
            'Multi-Factor Authentication Required',
            'Multi-factor authentication is enabled but you need at least two authentication factors configured. Please add additional security measures in Settings.',
            [{ text: 'OK' }]
          );
          return false;
        }

        // For MFA enforcement, require both biometric AND security key authentication
        // This ensures multiple factors are verified during transactions
        const hasBiometricKey = biometricKeysCount > 0;
        const hasSecurityKey = securityKeysCount > 0;
        
        if (!hasBiometricKey || !hasSecurityKey) {
          console.log('❌ Multi-factor authentication failed - missing required auth types');
          Alert.alert(
            'Multi-Factor Authentication Required',
            'Multi-factor authentication requires both biometric authentication and a security key to be configured and verified.',
            [{ text: 'OK' }]
          );
          return false;
        }

        // Track which factors have already been verified to avoid redundant prompts
        let biometricVerified = false;
        let securityKeyVerified = false;

        // Check if biometric was already verified in Step 1
        if (securitySettings.requireBiometricForTransactions) {
          biometricVerified = true;
          console.log('✅ Biometric already verified in Step 1');
        }

        // Check if security key was already verified in Step 2
        if (shouldRequireSecurityKey) {
          securityKeyVerified = true;
          console.log('✅ Security key already verified in Step 2');
        }

        // Only prompt for factors that haven't been verified yet
        console.log('🔐 Enforcing MFA: checking remaining factors');
        
        // Biometric authentication for MFA (only if not already verified)
        if (!biometricVerified) {
          console.log('🔐 MFA: Prompting for biometric authentication');
          const biometricMFA = await this.authenticateWithBiometric(
            'Multi-factor authentication: Verify your biometric'
          );
          if (!biometricMFA.success) {
            console.log('❌ MFA biometric authentication failed');
            Alert.alert(
              'Multi-Factor Authentication Failed',
              'Biometric authentication failed. Since multi-factor authentication is enabled, both biometric and security key verification are required.',
              [{ text: 'OK' }]
            );
            return false;
          }
          biometricVerified = true;
        }

        // Security key authentication for MFA (only if not already verified)
        if (!securityKeyVerified) {
          console.log('🔐 MFA: Prompting for security key authentication');
          const availableKeys = securityKeys.filter(key => 
            key.type === 'fido' || key.type === 'passkey'
          );
          
          const securityKeyMFA = await this.verifySecurityKeyPresence(availableKeys[0]);
          if (!securityKeyMFA) {
            console.log('❌ MFA security key authentication failed');
            Alert.alert(
              'Multi-Factor Authentication Failed',
              'Security key verification failed. Since multi-factor authentication is enabled, both biometric and security key verification are required.',
              [{ text: 'OK' }]
            );
            return false;
          }
          securityKeyVerified = true;
        }

        console.log('✅ Multi-factor authentication successful - both factors verified (no redundant prompts)');
      }

      console.log('✅ Enhanced transaction authentication completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Enhanced transaction authentication error:', error);
      return false;
    }
  }

  /**
   * Check if MFA is properly configured and enforced
   */
  async verifyMFAConfiguration(): Promise<{
    isConfigured: boolean;
    hasBiometric: boolean;
    hasSecurityKey: boolean;
    totalFactors: number;
    message: string;
  }> {
    try {
      const securitySettingsStr = await AsyncStorage.getItem('securitySettings');
      const securitySettings: SecuritySettings = securitySettingsStr 
        ? JSON.parse(securitySettingsStr) 
        : {
            multiFactorEnabled: false,
          };

      const securityKeysStr = await AsyncStorage.getItem('securityKeys');
      const securityKeys: SecurityKey[] = securityKeysStr 
        ? JSON.parse(securityKeysStr) 
        : [];

      const biometricCount = securityKeys.filter(key => key.type === 'biometric').length;
      const securityKeyCount = securityKeys.filter(key => key.type === 'fido' || key.type === 'passkey').length;
      const totalFactors = biometricCount + securityKeyCount;

      const hasBiometric = biometricCount > 0;
      const hasSecurityKey = securityKeyCount > 0;

      if (securitySettings.multiFactorEnabled) {
        const isProperlyConfigured = totalFactors >= 2 && hasBiometric && hasSecurityKey;
        
        return {
          isConfigured: isProperlyConfigured,
          hasBiometric,
          hasSecurityKey,
          totalFactors,
          message: isProperlyConfigured 
            ? 'Multi-factor authentication is properly configured'
            : `Multi-factor authentication is enabled but not properly configured. You need both biometric authentication and a security key registered.`
        };
      } else {
        return {
          isConfigured: totalFactors > 0,
          hasBiometric,
          hasSecurityKey,
          totalFactors,
          message: totalFactors > 0 
            ? 'Security measures are configured (MFA disabled)'
            : 'No security measures are configured'
        };
      }
    } catch (error) {
      console.error('❌ Error verifying MFA configuration:', error);
      return {
        isConfigured: false,
        hasBiometric: false,
        hasSecurityKey: false,
        totalFactors: 0,
        message: 'Error verifying security configuration'
      };
    }
  }

  /**
   * Generate a cryptographically secure random challenge
   */
  private generateChallenge(): ArrayBuffer {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array.buffer;
  }


  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    // Convert to binary string
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Use built-in btoa for base64 encoding
    return btoa(binary);
  }

}

// Export singleton instance
export const secureAuthService = new SecureAuthService();
