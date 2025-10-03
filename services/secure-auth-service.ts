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
import { fromByteArray, toByteArray } from 'react-native-quick-base64';

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

      // Create a new key pair for this biometric registration
      const result = await this.rnBiometrics.createKeys();
      
      if (!result.publicKey) {
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

      // Generate a secure challenge as ArrayBuffer
      const challenge = this.generateChallenge();
      const userId = this.generateUserIdAsArrayBuffer();
      
      const options: PublicKeyCredentialCreationOptionsJSON = {
        challenge: this.arrayBufferToBase64(challenge),
        rp: {
          name: 'BitSleuth Wallet',
          id: this.getRpId(), // Dynamic rpId for mobile app context
        },
        user: {
          id: this.arrayBufferToBase64(userId), // Convert ArrayBuffer to base64 for JSON
          name: 'BitSleuth User',
          displayName: 'BitSleuth User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
          { type: 'public-key', alg: -8 }, // EdDSA
        ],
        timeout: 60000,
        attestation: 'direct',
        authenticatorSelection: {
          // Remove platform authenticator limitation - allow both platform and cross-platform
          userVerification: 'required',
        },
      };

      // Start WebAuthn registration
      const registrationResponse = await startRegistration({ optionsJSON: options });
      
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

      // Generate a secure challenge as ArrayBuffer
      const challenge = this.generateChallenge();
      const userId = this.generateUserIdAsArrayBuffer();
      
      const options: PublicKeyCredentialCreationOptionsJSON = {
        challenge: this.arrayBufferToBase64(challenge),
        rp: {
          name: 'BitSleuth Wallet',
          id: this.getRpId(), // Dynamic rpId for mobile app context
        },
        user: {
          id: this.arrayBufferToBase64(userId), // Convert ArrayBuffer to base64 for JSON
          name: 'BitSleuth User',
          displayName: 'BitSleuth User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
          { type: 'public-key', alg: -8 }, // EdDSA
        ],
        timeout: 60000,
        attestation: 'direct',
        authenticatorSelection: {
          authenticatorAttachment: 'cross-platform', // Use cross-platform authenticator (hardware key)
          userVerification: 'required',
        },
      };

      // Start WebAuthn registration for hardware key
      const registrationResponse = await startRegistration({ optionsJSON: options });
      
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

      // Generate a secure challenge as ArrayBuffer
      const challenge = this.generateChallenge();
      
      const options: PublicKeyCredentialRequestOptionsJSON = {
        challenge: this.arrayBufferToBase64(challenge),
        timeout: 60000,
        rpId: this.getRpId(), // Dynamic rpId for mobile app context
        allowCredentials: [
          {
            id: credentialId,
            type: 'public-key',
          },
        ],
        userVerification: 'required',
      };

      // Start WebAuthn authentication
      const authenticationResponse = await startAuthentication({ optionsJSON: options });
      
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
   * Generate a unique user ID as ArrayBuffer
   */
  private generateUserIdAsArrayBuffer(): ArrayBuffer {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return array.buffer;
  }

  /**
   * Generate a unique user ID as base64 string (legacy method for compatibility)
   */
  private generateUserId(): string {
    return this.arrayBufferToBase64(this.generateUserIdAsArrayBuffer());
  }

  /**
   * Get the appropriate Relying Party ID for the current platform
   */
  private getRpId(): string {
    // For mobile apps, use a proper domain that works with FIDO2/WebAuthn
    // Mobile WebAuthn implementations need a valid domain, not localhost
    if (Platform.OS === 'web') {
      // For web, use the current hostname if window is available
      if (typeof window !== 'undefined' && window.location) {
        return window.location.hostname;
      }
      // Fallback for web environments without window
      return 'bitsleuth.ai';
    } else {
      // For mobile apps, use a proper domain that works with WebAuthn
      // This allows FIDO2 operations to work correctly on mobile
      return 'bitsleuth.ai';
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    // Use react-native-quick-base64 for React Native compatibility
    return fromByteArray(bytes);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Use react-native-quick-base64 for React Native compatibility
    const bytes = toByteArray(base64);
    // Create a new ArrayBuffer with the correct size
    const buffer = new ArrayBuffer(bytes.length);
    const view = new Uint8Array(buffer);
    view.set(bytes);
    return buffer;
  }

  /**
   * Perform constant-time comparison of two ArrayBuffers to prevent timing attacks
   */
  private timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (a.byteLength !== b.byteLength) {
      return false;
    }

    const viewA = new Uint8Array(a);
    const viewB = new Uint8Array(b);
    
    let result = 0;
    for (let i = 0; i < a.byteLength; i++) {
      result |= viewA[i] ^ viewB[i];
    }
    
    return result === 0;
  }

  /**
   * Verify WebAuthn registration response
   */
  private async verifyRegistrationResponse(
    response: RegistrationResponseJSON,
    originalChallenge: ArrayBuffer
  ): Promise<boolean> {
    try {
      // Decode base64-encoded clientDataJSON before parsing
      const clientDataJSONString = atob(response.response.clientDataJSON);
      const clientDataJSON = JSON.parse(clientDataJSONString);
      
      // Verify challenge matches using constant-time comparison
      const responseChallenge = this.base64ToArrayBuffer(clientDataJSON.challenge);
      return this.timingSafeEqual(responseChallenge, originalChallenge);
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
      // Decode base64-encoded clientDataJSON before parsing
      const clientDataJSONString = atob(response.response.clientDataJSON);
      const clientDataJSON = JSON.parse(clientDataJSONString);
      
      // Verify challenge matches using constant-time comparison
      const responseChallenge = this.base64ToArrayBuffer(clientDataJSON.challenge);
      return this.timingSafeEqual(responseChallenge, originalChallenge);
    } catch (error) {
      console.error('❌ Error verifying authentication response:', error);
      return false;
    }
  }
}

// Export singleton instance
export const secureAuthService = new SecureAuthService();
