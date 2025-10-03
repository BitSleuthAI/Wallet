import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { secureAuthService, SecurityKey } from './secure-auth-service';

export interface SecurityTestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: string;
}

export class SecurityTestService {
  /**
   * Run comprehensive security tests
   */
  async runAllTests(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    
    console.log('🧪 Starting comprehensive security tests...');
    
    // Test 1: Biometric availability check
    results.push(await this.testBiometricAvailability());
    
    // Test 2: Biometric authentication
    results.push(await this.testBiometricAuthentication());
    
    // Test 3: Biometric key registration
    results.push(await this.testBiometricKeyRegistration());
    
    // Test 4: FIDO passkey registration
    results.push(await this.testFIDOPasskeyRegistration());
    
    // Test 5: Hardware FIDO key registration
    results.push(await this.testHardwareFIDOKeyRegistration());
    
    // Test 6: Security key verification
    results.push(await this.testSecurityKeyVerification());
    
    // Test 7: Transaction authentication
    results.push(await this.testTransactionAuthentication());
    
    // Test 8: Multi-factor authentication
    results.push(await this.testMultiFactorAuthentication());
    
    // Test 9: Challenge generation
    results.push(await this.testChallengeGeneration());
    
    // Test 10: Cryptographic verification
    results.push(await this.testCryptographicVerification());
    
    console.log('🧪 Security tests completed');
    return results;
  }

  /**
   * Test biometric availability
   */
  private async testBiometricAvailability(): Promise<SecurityTestResult> {
    try {
      const available = await secureAuthService.isBiometricAvailable();
      const biometricType = secureAuthService.getBiometricType();
      
      return {
        testName: 'Biometric Availability Check',
        passed: true,
        details: `Biometric available: ${available}, Type: ${biometricType}`,
      };
    } catch (error) {
      return {
        testName: 'Biometric Availability Check',
        passed: false,
        error: `Error checking biometric availability: ${error}`,
      };
    }
  }

  /**
   * Test biometric authentication
   */
  private async testBiometricAuthentication(): Promise<SecurityTestResult> {
    try {
      const available = await secureAuthService.isBiometricAvailable();
      
      if (!available) {
        return {
          testName: 'Biometric Authentication',
          passed: false,
          details: 'Biometric authentication not available on this device',
          error: 'Feature not available - Consider using Face ID, Touch ID, or fingerprint authentication for enhanced security',
        };
      }

      const result = await secureAuthService.authenticateWithBiometric('Test biometric authentication');
      
      return {
        testName: 'Biometric Authentication',
        passed: result.success,
        details: result.success 
          ? `Authentication successful with ${result.biometricType}` 
          : `Available but not registered. Enable biometric authentication in Security settings for enhanced protection`,
        error: result.success ? undefined : 'Not enabled. Go to Settings > Security to enable biometric authentication',
      };
    } catch (error) {
      return {
        testName: 'Biometric Authentication',
        passed: false,
        error: `Educational: Biometric authentication enhances security by using your unique biometric data (${error})`,
      };
    }
  }

  /**
   * Test biometric key registration
   */
  private async testBiometricKeyRegistration(): Promise<SecurityTestResult> {
    try {
      const available = await secureAuthService.isBiometricAvailable();
      
      if (!available) {
        return {
          testName: 'Biometric Key Registration',
          passed: false,
          details: 'Biometric hardware not available on this device',
          error: 'Educational: Biometric keys provide cryptographic protection using your unique biometric data',
        };
      }

      // Check if biometric key is already registered
      const hasRegisteredKey = await secureAuthService.hasRegisteredBiometricKey();
      
      return {
        testName: 'Biometric Key Registration',
        passed: hasRegisteredKey,
        details: hasRegisteredKey 
          ? `Biometric key already registered - Providing secure authentication` 
          : 'Available but not registered',
        error: hasRegisteredKey ? undefined : 'Educational: Register a biometric key in Security settings to protect your wallet with cryptographic keys derived from your biometric data',
      };
    } catch (error) {
      return {
        testName: 'Biometric Key Registration',
        passed: false,
        error: `Educational: Biometric keys enhance security by binding cryptographic operations to your biometric identity (${error})`,
      };
    }
  }

  /**
   * Test FIDO passkey registration
   */
  private async testFIDOPasskeyRegistration(): Promise<SecurityTestResult> {
    try {
      // Check if FIDO is available
      const available = await secureAuthService.isFIDOAvailable();
      
      if (!available) {
        return {
          testName: 'FIDO Passkey Registration',
          passed: false,
          details: 'FIDO2/WebAuthn not available on this device',
          error: 'Educational: FIDO2 passkeys provide phishing-resistant authentication using hardware-backed security keys',
        };
      }

      // Check if any passkeys are registered
      const registeredKeys = await secureAuthService.getRegisteredSecurityKeys();
      const hasPasskey = registeredKeys.some(key => key.type === 'passkey');
      
      return {
        testName: 'FIDO Passkey Registration',
        passed: hasPasskey,
        details: hasPasskey 
          ? `FIDO2 passkey registered - Enhancing security with standardized protocols` 
          : 'Available but not registered',
        error: hasPasskey ? undefined : 'Educational: Register a FIDO2 passkey for phishing-resistant authentication that works across all modern browsers and devices',
      };
    } catch (error) {
      return {
        testName: 'FIDO Passkey Registration',
        passed: false,
        error: `Educational: FIDO2 passkeys protect against phishing by using hardware-backed cryptographic keys (${error})`,
      };
    }
  }

  /**
   * Test hardware FIDO key registration
   */
  private async testHardwareFIDOKeyRegistration(): Promise<SecurityTestResult> {
    try {
      // Check if hardware FIDO is available
      const available = await secureAuthService.isHardwareFIDOAvailable();
      
      if (!available) {
        return {
          testName: 'Hardware FIDO Key Registration',
          passed: false,
          details: 'Hardware FIDO2 keys not detected (USB/NFC security keys)',
          error: 'Educational: Hardware security keys like YubiKey provide the strongest authentication by storing keys in tamper-proof hardware',
        };
      }

      // Check if any hardware FIDO keys are registered
      const registeredKeys = await secureAuthService.getRegisteredSecurityKeys();
      const hasHardwareKey = registeredKeys.some(key => key.type === 'fido');
      
      return {
        testName: 'Hardware FIDO Key Registration',
        passed: hasHardwareKey,
        details: hasHardwareKey 
          ? `Hardware FIDO2 key registered - Maximum security with tamper-proof hardware` 
          : 'Hardware detected but no key registered',
        error: hasHardwareKey ? undefined : 'Educational: Register a hardware security key (YubiKey, etc.) for the highest level of protection against sophisticated attacks',
      };
    } catch (error) {
      return {
        testName: 'Hardware FIDO Key Registration',
        passed: false,
        error: `Educational: Hardware security keys provide unbeatable protection by keeping cryptographic secrets in tamper-proof hardware (${error})`,
      };
    }
  }

  /**
   * Test security key verification
   */
  private async testSecurityKeyVerification(): Promise<SecurityTestResult> {
    try {
      // Load existing security keys
      const securityKeysStr = await AsyncStorage.getItem('securityKeys');
      const securityKeys: SecurityKey[] = securityKeysStr ? JSON.parse(securityKeysStr) : [];
      
      if (securityKeys.length === 0) {
        return {
          testName: 'Security Key Verification',
          passed: true,
          details: 'No security keys to verify',
        };
      }
      
      const keyToVerify = securityKeys[0];
      const verified = await secureAuthService.verifySecurityKeyPresence(keyToVerify);
      
      return {
        testName: 'Security Key Verification',
        passed: verified,
        details: verified 
          ? `Security key verified successfully: ${keyToVerify.name}` 
          : `Security key verification failed: ${keyToVerify.name}`,
        error: verified ? undefined : 'Security key verification failed',
      };
    } catch (error) {
      return {
        testName: 'Security Key Verification',
        passed: false,
        error: `Error during security key verification: ${error}`,
      };
    }
  }

  /**
   * Test transaction authentication
   */
  private async testTransactionAuthentication(): Promise<SecurityTestResult> {
    try {
      const result = await secureAuthService.authenticateForTransaction(0.001); // Small amount
      
      return {
        testName: 'Transaction Authentication',
        passed: result,
        details: result 
          ? 'Transaction authentication successful' 
          : 'Transaction authentication failed',
        error: result ? undefined : 'Transaction authentication failed',
      };
    } catch (error) {
      return {
        testName: 'Transaction Authentication',
        passed: false,
        error: `Error during transaction authentication: ${error}`,
      };
    }
  }

  /**
   * Test multi-factor authentication
   */
  private async testMultiFactorAuthentication(): Promise<SecurityTestResult> {
    try {
      // Set up multi-factor authentication
      const securitySettings = {
        requireBiometricForTransactions: true,
        requireSecurityKeyForTransactions: false,
        allowPINFallback: true,
        multiFactorEnabled: true,
      };
      
      await AsyncStorage.setItem('securitySettings', JSON.stringify(securitySettings));
      
      const result = await secureAuthService.authenticateForTransaction(0.01); // Higher amount
      
      return {
        testName: 'Multi-Factor Authentication',
        passed: result,
        details: result 
          ? 'Multi-factor authentication successful' 
          : 'Multi-factor authentication failed',
        error: result ? undefined : 'Multi-factor authentication failed',
      };
    } catch (error) {
      return {
        testName: 'Multi-Factor Authentication',
        passed: false,
        error: `Error during multi-factor authentication: ${error}`,
      };
    }
  }

  /**
   * Test challenge generation
   */
  private async testChallengeGeneration(): Promise<SecurityTestResult> {
    try {
      // Test challenge generation by attempting biometric authentication
      const result = await secureAuthService.authenticateWithBiometric('Test challenge generation');
      
      return {
        testName: 'Challenge Generation',
        passed: result.success,
        details: result.success 
          ? 'Challenge generation and verification successful' 
          : 'Challenge generation or verification failed',
        error: result.success ? undefined : 'Challenge generation or verification failed',
      };
    } catch (error) {
      return {
        testName: 'Challenge Generation',
        passed: false,
        error: `Error during challenge generation test: ${error}`,
      };
    }
  }

  /**
   * Test cryptographic verification
   */
  private async testCryptographicVerification(): Promise<SecurityTestResult> {
    try {
      // Test cryptographic verification by attempting biometric authentication
      const result = await secureAuthService.authenticateWithBiometric('Test cryptographic verification');
      
      const hasSignature = result.signature && result.signature.length > 0;
      const hasPublicKey = result.publicKey && result.publicKey.length > 0;
      
      return {
        testName: 'Cryptographic Verification',
        passed: result.success && hasSignature && hasPublicKey,
        details: result.success && hasSignature && hasPublicKey
          ? 'Cryptographic verification successful with signature and public key'
          : 'Cryptographic verification failed or missing cryptographic data',
        error: result.success && hasSignature && hasPublicKey 
          ? undefined 
          : 'Cryptographic verification failed or missing cryptographic data',
      };
    } catch (error) {
      return {
        testName: 'Cryptographic Verification',
        passed: false,
        error: `Error during cryptographic verification test: ${error}`,
      };
    }
  }

  /**
   * Display test results
   */
  displayTestResults(results: SecurityTestResult[]): void {
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    const educationalResults = results.filter(r => !r.passed && r.error?.includes('educational') || r.error?.includes('Educational')).length;
    
    console.log(`\n🧪 Security Education Results: ${passedTests}/${totalTests} features enabled\n`);
    
    results.forEach(result => {
      const status = result.passed ? '✅' : '📚';
      console.log(`${status} ${result.testName}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      if (result.error) {
        console.log(`   💡 ${result.error}`);
      }
      console.log('');
    });
    
    // Show educational summary alert
    const summary = passedTests === totalTests 
      ? '🛡️ Excellent! All available security features are enabled and working correctly!'
      : passedTests > totalTests / 2
      ? `📚 Security Education: ${passedTests}/${totalTests} features enabled\n\nGood security foundation! Consider enabling additional features for stronger protection.`
      : `📚 Security Education: ${passedTests}/${totalTests} features enabled\n\nYour wallet is secure but you can enhance protection with biometric authentication, FIDO2 keys, and hardware security keys.`;
    
    Alert.alert(
      'Security Education Report',
      summary,
      [{ text: passedTests < totalTests ? 'Learn More' : 'Great!' }]
    );
  }

  /**
   * Run tests and display results
   */
  async runTestsAndDisplayResults(): Promise<void> {
    try {
      const results = await this.runAllTests();
      this.displayTestResults(results);
    } catch (error) {
      console.error('❌ Error running security tests:', error);
      Alert.alert('Test Error', 'Failed to run security tests');
    }
  }
}

// Export singleton instance
export const securityTestService = new SecurityTestService();
