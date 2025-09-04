import { Platform } from 'react-native';

// Firebase Crashlytics with fallback for web/missing native module
let crashlytics: any = null;
try {
  crashlytics = require('@react-native-firebase/crashlytics').default;
} catch (error) {
  console.warn('Firebase Crashlytics not available:', error);
  // Create a mock crashlytics object for fallback
  crashlytics = () => ({
    recordError: (error: Error) => console.error('Mock Crashlytics - Error:', error),
    setAttributes: (attrs: any) => console.log('Mock Crashlytics - Attributes:', attrs),
    setAttribute: (key: string, value: string) => console.log('Mock Crashlytics - Attribute:', key, value),
    setUserId: (id: string) => console.log('Mock Crashlytics - User ID:', id),
    setCrashlyticsCollectionEnabled: (enabled: boolean) => console.log('Mock Crashlytics - Collection enabled:', enabled),
    isCrashlyticsCollectionEnabled: () => false,
    log: (message: string) => console.log('Mock Crashlytics - Log:', message),
    crash: () => console.log('Mock Crashlytics - Crash triggered')
  });
}

class CrashlyticsService {
  /**
   * Record a non-fatal error
   */
  recordError(error: Error, context?: Record<string, string>) {
    try {
      if (crashlytics) {
        if (context) {
          crashlytics().setAttributes(context);
        }
        crashlytics().recordError(error);
      }
    } catch (e) {
      console.warn('Failed to record error to Crashlytics:', e);
    }
  }

  /**
   * Log a custom message
   */
  log(message: string) {
    try {
      if (crashlytics) {
        crashlytics().log(message);
      }
    } catch (e) {
      console.warn('Failed to log to Crashlytics:', e);
    }
  }

  /**
   * Set user identifier
   */
  setUserId(userId: string) {
    try {
      if (crashlytics) {
        crashlytics().setUserId(userId);
      }
    } catch (e) {
      console.warn('Failed to set user ID in Crashlytics:', e);
    }
  }

  /**
   * Set custom attributes
   */
  setAttributes(attributes: Record<string, string>) {
    try {
      if (crashlytics) {
        crashlytics().setAttributes(attributes);
      }
    } catch (e) {
      console.warn('Failed to set attributes in Crashlytics:', e);
    }
  }

  /**
   * Set a single attribute
   */
  setAttribute(key: string, value: string) {
    try {
      if (crashlytics) {
        crashlytics().setAttribute(key, value);
      }
    } catch (e) {
      console.warn('Failed to set attribute in Crashlytics:', e);
    }
  }

  /**
   * Force a test crash (for testing purposes only)
   */
  crash() {
    try {
      if (crashlytics) {
        crashlytics().crash();
      }
    } catch (e) {
      console.warn('Failed to force crash in Crashlytics:', e);
    }
  }

  /**
   * Check if Crashlytics is available
   */
  isAvailable(): boolean {
    try {
      return crashlytics ? crashlytics().isCrashlyticsCollectionEnabled() : false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Enable or disable crash collection
   */
  setCrashlyticsCollectionEnabled(enabled: boolean) {
    try {
      if (crashlytics) {
        crashlytics().setCrashlyticsCollectionEnabled(enabled);
      }
    } catch (e) {
      console.warn('Failed to set crash collection enabled in Crashlytics:', e);
    }
  }

  /**
   * Track wallet operations
   */
  trackWalletOperation(operation: string, walletId?: string, success: boolean = true) {
    this.log(`Wallet operation: ${operation} - ${success ? 'success' : 'failed'}`);
    this.setAttributes({
      walletOperation: operation,
      walletId: walletId || 'unknown',
      operationSuccess: success.toString(),
      platform: Platform.OS,
    });
  }

  /**
   * Track transaction events
   */
  trackTransaction(transactionType: string, amount?: string, success: boolean = true) {
    this.log(`Transaction: ${transactionType} - ${success ? 'success' : 'failed'}`);
    this.setAttributes({
      transactionType,
      amount: amount || 'unknown',
      transactionSuccess: success.toString(),
      platform: Platform.OS,
    });
  }

  /**
   * Track authentication events
   */
  trackAuthEvent(event: string, method: string, success: boolean = true) {
    this.log(`Auth event: ${event} - ${method} - ${success ? 'success' : 'failed'}`);
    this.setAttributes({
      authEvent: event,
      authMethod: method,
      authSuccess: success.toString(),
      platform: Platform.OS,
    });
  }
}

// Export singleton instance
export default new CrashlyticsService();
