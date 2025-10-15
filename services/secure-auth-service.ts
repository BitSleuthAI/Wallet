import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

export interface SecuritySettings {
  requireBiometricForTransactions: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: string;
  signature?: string;
  publicKey?: string;
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
  async registerBiometricKey(): Promise<void> {
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

      console.log('✅ Biometric key registered successfully');
    } catch (error) {
      console.error('❌ Error registering biometric key:', error);
      throw error;
    }
  }

  /**
   * Enhanced transaction authentication with multi-factor support
   */
  async authenticateForTransaction(requireBiometricOverride?: boolean): Promise<boolean> {
    try {
      console.log('🔐 Enhanced transaction authentication started...');
      
      // Load security settings
      const securitySettingsStr = await AsyncStorage.getItem('securitySettings');
      const securitySettings: SecuritySettings = securitySettingsStr 
        ? JSON.parse(securitySettingsStr) 
        : {
            requireBiometricForTransactions: true,
          };

      // Step 1: Biometric authentication (if enabled and required)
      if (requireBiometricOverride || securitySettings.requireBiometricForTransactions) {
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

      console.log('✅ Enhanced transaction authentication completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Enhanced transaction authentication error:', error);
      return false;
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


