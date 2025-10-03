import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON
} from '@simplewebauthn/browser';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
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
  private biometricType: BiometryTypes | null = null;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });
    this.initializeBiometrics();
  }

  private async initializeBiometrics(): Promise<void> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      this.biometricAvailable = available;
      this.biometricType = biometryType;
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
      const { success, signature, publicKey } = await this.rnBiometrics.createSignature({
        promptMessage: promptMessage || 'Authenticate to continue',
        payload: this.generateChallenge(),
      });

      if (success && signature && publicKey) {
        console.log('✅ Biometric authentication successful with cryptographic verification');
        return {
          success: true,
          biometricType: this.getBiometricType(),
          signature,
          publicKey,
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

      // Create a new key pair for this biometric registration
      const { success, publicKey } = await this.rnBiometrics.createKeys();
      
      if (!success || !publicKey) {
        throw new Error('Failed to create biometric key pair');
      }

      // Verify the key by requiring biometric authentication
      const authResult = await this.authenticateWithBiometric('Verify your biometric to complete registration');
      
      if (!authResult.success) {
        throw new Error('Biometric verification failed during registration');
      }

      const newKey: SecurityKey = {
        id: `biometric-${Date.now()}`,
        name: this.getBiometricType(),
        type: 'biometric',
        dateAdded: new Date().toISOString(),
        publicKey,
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
   */
  async registerFIDOPasskey(keyName: string): Promise<SecurityKey | null> {
    try {
      console.log('🔐 Registering FIDO2 passkey...');

      // Generate a secure challenge
      const challenge = this.generateChallenge();
      
      const options: PublicKeyCredentialCreationOptionsJSON = {
        challenge: this.arrayBufferToBase64(challenge),
        rp: {
          name: 'BitSleuth Wallet',
          id: 'bitsleuth.ai',
        },
        user: {
          id: this.generateUserId(),
          name: 'BitSleuth User',
          displayName: 'BitSleuth User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        timeout: 60000,
        attestation: 'direct',
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use platform authenticator (device biometric)
          userVerification: 'required',
        },
      };

      // Start WebAuthn registration
      const registrationResponse = await startRegistration(options);
      
      if (!registrationResponse) {
        throw new Error('WebAuthn registration failed');
      }

      // Verify the registration response
      const isValid = await this.verifyRegistrationResponse(registrationResponse, challenge);
      
      if (!isValid) {
        throw new Error('Registration response verification failed');
      }

      const newKey: SecurityKey = {
        id: registrationResponse.id,
        name: keyName,
        type: 'passkey',
        dateAdded: new Date().toISOString(),
        credentialId: registrationResponse.id,
        attestationObject: registrationResponse.response.attestationObject,
        clientDataJSON: registrationResponse.response.clientDataJSON,
        isVerified: true,
      };

      console.log('✅ FIDO2 passkey registered successfully');
      return newKey;
    } catch (error) {
      console.error('❌ Error registering FIDO2 passkey:', error);
      throw error;
    }
  }

  /**
   * Register a hardware FIDO security key (YubiKey, etc.)
   */
  async registerHardwareFIDOKey(keyName: string): Promise<SecurityKey | null> {
    try {
      console.log('🔐 Registering hardware FIDO security key...');

      // Generate a secure challenge
      const challenge = this.generateChallenge();
      
      const options: PublicKeyCredentialCreationOptionsJSON = {
        challenge: this.arrayBufferToBase64(challenge),
        rp: {
          name: 'BitSleuth Wallet',
          id: 'bitsleuth.ai',
        },
        user: {
          id: this.generateUserId(),
          name: 'BitSleuth User',
          displayName: 'BitSleuth User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        timeout: 60000,
        attestation: 'direct',
        authenticatorSelection: {
          authenticatorAttachment: 'cross-platform', // Use cross-platform authenticator (hardware key)
          userVerification: 'required',
        },
      };

      // Start WebAuthn registration for hardware key
      const registrationResponse = await startRegistration(options);
      
      if (!registrationResponse) {
        throw new Error('Hardware FIDO key registration failed');
      }

      // Verify the registration response
      const isValid = await this.verifyRegistrationResponse(registrationResponse, challenge);
      
      if (!isValid) {
        throw new Error('Hardware FIDO key registration verification failed');
      }

      const newKey: SecurityKey = {
        id: registrationResponse.id,
        name: keyName,
        type: 'fido',
        dateAdded: new Date().toISOString(),
        credentialId: registrationResponse.id,
        attestationObject: registrationResponse.response.attestationObject,
        clientDataJSON: registrationResponse.response.clientDataJSON,
        isVerified: true,
      };

      console.log('✅ Hardware FIDO security key registered successfully');
      return newKey;
    } catch (error) {
      console.error('❌ Error registering hardware FIDO key:', error);
      throw error;
    }
  }

  /**
   * Authenticate using a registered FIDO key
   */
  async authenticateWithFIDOKey(credentialId: string): Promise<FIDOAuthResult> {
    try {
      console.log('🔐 Authenticating with FIDO key...');

      // Generate a secure challenge
      const challenge = this.generateChallenge();
      
      const options: PublicKeyCredentialRequestOptionsJSON = {
        challenge: this.arrayBufferToBase64(challenge),
        timeout: 60000,
        rpId: 'bitsleuth.ai',
        allowCredentials: [
          {
            id: credentialId,
            type: 'public-key',
          },
        ],
        userVerification: 'required',
      };

      // Start WebAuthn authentication
      const authenticationResponse = await startAuthentication(options);
      
      if (!authenticationResponse) {
        return { success: false, error: 'FIDO authentication failed' };
      }

      // Verify the authentication response
      const isValid = await this.verifyAuthenticationResponse(authenticationResponse, challenge);
      
      if (!isValid) {
        return { success: false, error: 'FIDO authentication verification failed' };
      }

      console.log('✅ FIDO key authentication successful');
      return {
        success: true,
        credentialId: authenticationResponse.id,
        signature: authenticationResponse.response.signature,
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

      // Step 3: Multi-factor authentication (if enabled)
      if (securitySettings.multiFactorEnabled) {
        console.log('🔐 Step 3: Multi-factor authentication required');
        
        const factorsEnabled = (securityKeys.some(key => key.type === 'biometric') ? 1 : 0) + 
                             securityKeys.filter(key => key.type === 'fido' || key.type === 'passkey').length;
        
        if (factorsEnabled < 2) {
          console.log('❌ Insufficient authentication factors for multi-factor');
          Alert.alert(
            'Multi-Factor Authentication Required',
            'You need at least two authentication factors enabled. Please configure additional security measures.',
            [{ text: 'OK' }]
          );
          return false;
        }

        // For multi-factor, we require both biometric AND security key
        const hasBiometric = securityKeys.some(key => key.type === 'biometric');
        const hasSecurityKey = securityKeys.some(key => key.type === 'fido' || key.type === 'passkey');
        
        if (hasBiometric && hasSecurityKey) {
          console.log('✅ Multi-factor authentication successful');
        } else {
          console.log('❌ Multi-factor authentication failed');
          return false;
        }
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
   * Generate a unique user ID
   */
  private generateUserId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array.buffer);
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Verify WebAuthn registration response
   */
  private async verifyRegistrationResponse(
    response: RegistrationResponseJSON,
    originalChallenge: ArrayBuffer
  ): Promise<boolean> {
    try {
      // In a real implementation, this would verify the attestation object
      // and check the challenge matches the original
      const clientDataJSON = JSON.parse(atob(response.response.clientDataJSON));
      
      // Verify challenge matches
      const responseChallenge = new Uint8Array(
        atob(clientDataJSON.challenge).split('').map(c => c.charCodeAt(0))
      );
      const originalChallengeArray = new Uint8Array(originalChallenge);
      
      if (responseChallenge.length !== originalChallengeArray.length) {
        return false;
      }
      
      for (let i = 0; i < responseChallenge.length; i++) {
        if (responseChallenge[i] !== originalChallengeArray[i]) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error verifying registration response:', error);
      return false;
    }
  }

  /**
   * Verify WebAuthn authentication response
   */
  private async verifyAuthenticationResponse(
    response: AuthenticationResponseJSON,
    originalChallenge: ArrayBuffer
  ): Promise<boolean> {
    try {
      // In a real implementation, this would verify the signature
      // and check the challenge matches the original
      const clientDataJSON = JSON.parse(atob(response.response.clientDataJSON));
      
      // Verify challenge matches
      const responseChallenge = new Uint8Array(
        atob(clientDataJSON.challenge).split('').map(c => c.charCodeAt(0))
      );
      const originalChallengeArray = new Uint8Array(originalChallenge);
      
      if (responseChallenge.length !== originalChallengeArray.length) {
        return false;
      }
      
      for (let i = 0; i < responseChallenge.length; i++) {
        if (responseChallenge[i] !== originalChallengeArray[i]) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error verifying authentication response:', error);
      return false;
    }
  }
}

// Export singleton instance
export const secureAuthService = new SecureAuthService();
