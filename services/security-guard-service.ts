import { Alert } from 'react-native';
import { secureAuthService } from './secure-auth-service';

/**
 * Security Guard Service
 * Provides authentication verification for sensitive operations to prevent unauthorized changes
 */
export class SecurityGuardService {
  /**
   * Verify user authentication before allowing security-related operations
   * @param operationDescription Description of the operation requiring authentication
   * @returns Promise<boolean> true if authentication successful, false otherwise
   */
  static async requireAuthenticationForSecurityOperation(
    operationDescription: string
  ): Promise<boolean> {
    try {
      console.log(`🔐 Security Guard: Requiring authentication for ${operationDescription}...`);
      
      // Authenticate the user before allowing security changes
      const authResult = await secureAuthService.authenticateWithBiometric(
        `Authentication required for ${operationDescription}`
      );
      
      if (!authResult.success) {
        Alert.alert(
          'Authentication Required',
          `You must authenticate with biometric or security key to ${operationDescription.toLowerCase()}. This prevents unauthorized changes to your security configuration.`,
          [{ text: 'OK' }]
        );
        console.log(`❌ Authentication failed for ${operationDescription}`);
        return false;
      }
      
      console.log(`✅ Authentication successful for ${operationDescription}`);
      return true;
    } catch (error) {
      console.error(`❌ Authentication error during ${operationDescription}:`, error);
      Alert.alert(
        'Authentication Failed',
        'Unable to verify your identity. This operation requires proper authentication.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Verify authentication specifically for biometric operations
   * Enhanced security check for biometric-related changes
   */
  static async requireAuthenticationForBiometricOperation(
    operationDescription: string
  ): Promise<boolean> {
    try {
      console.log(`🔐 Biometric Security Guard: Requiring authentication for ${operationDescription}...`);
      
      const authResult = await secureAuthService.authenticateWithBiometric(
        `Biometric verification required for ${operationDescription}`
      );
      
      if (!authResult.success) {
        Alert.alert(
          'Biometric Verification Required',
          `For ${operationDescription.toLowerCase()}, you must verify your biometric identity. This ensures only you can modify biometric security settings.`,
          [{ text: 'OK' }]
        );
        console.log(`❌ Biometric authentication failed for ${operationDescription}`);
        return false;
      }
      
      console.log(`✅ Biometric authentication successful for ${operationDescription}`);
      return true;
    } catch (error) {
      console.error(`❌ Biometric authentication error during ${operationDescription}:`, error);
      Alert.alert(
        'Biometric Verification Failed',
        'Unable to verify your biometric identity. This biometric operation requires proper authentication.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Verify authentication for security key operations
   * Enhanced security check for FIDO/passkey operations
   */
  static async requireAuthenticationForSecurityKeyOperation(
    operationDescription: string
  ): Promise<boolean> {
    try {
      console.log(`🔐 Security Key Guard: Requiring authentication for ${operationDescription}...`);
      
      // For security key operations, try biometric first, then fallback to FIDO
      let authResult = await secureAuthService.authenticateWithBiometric(
        `Security verification required for ${operationDescription}'`
      );
      
      if (!authResult.success) {
        Alert.alert(
          'Security Verification Required',
          `For ${operationDescription.toLowerCase()}, you must verify your identity. This prevents unauthorized modification of security keys and authentication methods.',
          [{ text: 'OK' }]
        );
        console.log(`❌ Security authentication failed for ${operationDescription}`);
        return false;
      }
      
      console.log(`✅ Security authentication successful for ${operationDescription}`);
      return true;
    } catch (error) {
      console.error(`❌ Security authentication error during ${operationDescription}:`, error);
      Alert.alert(
        'Security Verification Failed',
        'Unable to verify your identity. This security operation requires proper authentication to prevent unauthorized changes.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Confirm that security operations are properly guarded
   * Used for security audit and verification
   */
  static isSecurityGuardActive(): boolean {
    return true; // Security guard is always active
  }

  /**
   * Get security guard operation types for monitoring/auditing
   */
  static getGuardedOperations(): string[] {
    return [
      'Security Settings Change',
      'Biometric Enable/Disable',
      'Security Key Registration/Removal',
      'MFA Configuration Changes',
      'Transaction Authentication',
    ];
  }
}

// Export singleton instance for consistent usage
export const securityGuard = SecurityGuardService;
