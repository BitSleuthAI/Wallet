import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { secureAuthService } from './secure-auth-service';

export interface SecurityTestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: string;
}

export class SecurityTestService {
  /**
   * Run comprehensive security education assessment
   */
  async runAllTests(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    
    console.log('🧪 Starting security education assessment...');
    
    // Core User-Configurable Security Features
    // Feature 1: Biometric Availability Check
    results.push(await this.testBiometricAvailability());
    
    // Feature 2: Biometric Authentication Status
    results.push(await this.testBiometricAuthenticationStatus());
    
    // Feature 3: PIN Security
    results.push(await this.testPINSecurity());
    
    // Feature 4: Security Settings
    results.push(await this.testSecuritySettings());
    
    console.log('🧪 Security education assessment completed');
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
   * Test biometric authentication status
   */
  private async testBiometricAuthenticationStatus(): Promise<SecurityTestResult> {
    try {
      const available = await secureAuthService.isBiometricAvailable();
      const biometricType = secureAuthService.getBiometricType();
      
      if (!available) {
        return {
          testName: 'Biometric Authentication',
          passed: false,
          details: 'Biometric authentication not available or not enrolled on this device',
          error: 'Please set up biometric authentication in your device settings first',
        };
      }

      // Check if biometric is enabled in app
      const enabledStr = await AsyncStorage.getItem('biometricEnabled');
      const isEnabled = enabledStr === 'true';
      
      return {
        testName: 'Biometric Authentication',
        passed: isEnabled,
        details: isEnabled 
          ? `${biometricType} is enabled and ready to use` 
          : `${biometricType} is available but not enabled in app`,
        error: !isEnabled 
          ? 'Enable it in Passkeys & Security settings for enhanced protection'
          : undefined,
      };
    } catch (error) {
      return {
        testName: 'Biometric Authentication',
        passed: false,
        error: `Error checking biometric status: ${error}`,
      };
    }
  }

  /**
   * Test PIN security
   */
  private async testPINSecurity(): Promise<SecurityTestResult> {
    try {
      const pin = await AsyncStorage.getItem('pin');
      
      if (!pin) {
        return {
          testName: 'PIN Security',
          passed: false,
          details: 'No PIN set',
          error: 'Set up a PIN in Security settings for basic wallet protection',
        };
      }

      return {
        testName: 'PIN Security',
        passed: true,
        details: 'PIN is configured and active',
      };
    } catch (error) {
      return {
        testName: 'PIN Security',
        passed: false,
        error: `Error checking PIN: ${error}`,
      };
    }
  }

  /**
   * Test security settings configuration
   */
  private async testSecuritySettings(): Promise<SecurityTestResult> {
    try {
      const settingsStr = await AsyncStorage.getItem('securitySettings');
      const settings = settingsStr ? JSON.parse(settingsStr) : null;
      
      if (!settings) {
        return {
          testName: 'Security Settings',
          passed: true,
          details: 'Using default security settings',
        };
      }

      const features: string[] = [];
      if (settings.requireBiometricForTransactions) {
        features.push('Biometric for transactions');
      }
      if (settings.allowPINFallback) {
        features.push('PIN fallback');
      }

      return {
        testName: 'Security Settings',
        passed: true,
        details: features.length > 0 
          ? `Active features: ${features.join(', ')}` 
          : 'No custom security settings configured',
      };
    } catch (error) {
      return {
        testName: 'Security Settings',
        passed: false,
        error: `Error checking security settings: ${error}`,
      };
    }
  }



  /**
   * Display test results
   */
  displayTestResults(results: SecurityTestResult[]): void {
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    console.log(`\n🧪 Security Education Assessment: ${passedTests}/${totalTests} features enabled\n`);
    
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
    
    // Show educational summary alert with contextual messaging
    const summary = passedTests === totalTests 
      ? `🛡️ Excellent! All ${totalTests} security features are enabled and protecting your wallet!`
      : passedTests >= 2
      ? `🛡️ Good Security: ${passedTests}/${totalTests} features enabled\n\nYou have good protection! Consider enabling the remaining ${totalTests - passedTests} feature(s) for maximum security.`
      : passedTests >= 1
      ? `🔒 Basic Security: ${passedTests}/${totalTests} features enabled\n\nYour wallet has some protection. Enable biometric authentication for stronger defense.`
      : `📚 Security Recommended: ${passedTests}/${totalTests} features enabled\n\nConsider enabling security features to protect your Bitcoin wallet from unauthorized access.`;
    
    const buttonText = passedTests === totalTests ? 'Perfect!' : 'Got it';
    
    Alert.alert(
      'Security Education Report',
      summary,
      [{ text: buttonText }]
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
