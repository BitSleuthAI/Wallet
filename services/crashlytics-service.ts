import { Platform } from 'react-native';

// Firebase Crashlytics with fallback for web/missing native module
let crashlytics: any = null;
let isInitialized = false;

try {
  if (Platform.OS !== 'web') {
    crashlytics = require('@react-native-firebase/crashlytics').default;
    isInitialized = true;
    console.log('✅ Firebase Crashlytics module loaded successfully');
  } else {
    console.log('ℹ️ Running on web - Crashlytics not available');
  }
} catch (error) {
  console.warn('⚠️ Firebase Crashlytics not available:', error);
  isInitialized = false;
}

class CrashlyticsService {
  /**
   * Record a non-fatal error
   */
  recordError(error: Error, context?: Record<string, string>) {
    try {
      if (isInitialized && crashlytics) {
        if (context) {
          crashlytics.setAttributes(context);
        }
        crashlytics.recordError(error);
        console.log('📊 Error recorded to Crashlytics:', error.message);
      } else {
        console.log('🔍 Mock Crashlytics - Error:', error.message, context);
      }
    } catch (e) {
      console.warn('❌ Failed to record error to Crashlytics:', e);
    }
  }

  /**
   * Log a custom message
   */
  log(message: string) {
    try {
      if (isInitialized && crashlytics) {
        crashlytics.log(message);
        console.log('📊 Log sent to Crashlytics:', message);
      } else {
        console.log('🔍 Mock Crashlytics - Log:', message);
      }
    } catch (e) {
      console.warn('❌ Failed to log to Crashlytics:', e);
    }
  }

  /**
   * Set user identifier
   */
  setUserId(userId: string) {
    try {
      if (isInitialized && crashlytics) {
        crashlytics.setUserId(userId);
        console.log('📊 User ID set in Crashlytics:', userId);
      } else {
        console.log('🔍 Mock Crashlytics - User ID:', userId);
      }
    } catch (e) {
      console.warn('❌ Failed to set user ID in Crashlytics:', e);
    }
  }

  /**
   * Set custom attributes
   */
  setAttributes(attributes: Record<string, string>) {
    try {
      if (isInitialized && crashlytics) {
        crashlytics.setAttributes(attributes);
        console.log('📊 Attributes set in Crashlytics:', attributes);
      } else {
        console.log('🔍 Mock Crashlytics - Attributes:', attributes);
      }
    } catch (e) {
      console.warn('❌ Failed to set attributes in Crashlytics:', e);
    }
  }

  /**
   * Set a single attribute
   */
  setAttribute(key: string, value: string) {
    try {
      if (isInitialized && crashlytics) {
        crashlytics.setAttribute(key, value);
        console.log('📊 Attribute set in Crashlytics:', key, value);
      } else {
        console.log('🔍 Mock Crashlytics - Attribute:', key, value);
      }
    } catch (e) {
      console.warn('❌ Failed to set attribute in Crashlytics:', e);
    }
  }

  /**
   * Force a test crash (for testing purposes only)
   */
  crash() {
    try {
      if (isInitialized && crashlytics) {
        console.log('💥 Forcing crash for testing...');
        crashlytics.crash();
      } else {
        console.log('🔍 Mock Crashlytics - Crash triggered (app would crash here)');
        // For testing purposes, throw an actual error in mock mode
        throw new Error('Test crash from Crashlytics service');
      }
    } catch (e) {
      console.warn('❌ Failed to force crash in Crashlytics:', e);
      // Re-throw to actually crash in test mode
      throw e;
    }
  }

  /**
   * Check if Crashlytics is available
   */
  isAvailable(): boolean {
    try {
      if (isInitialized && crashlytics) {
        return crashlytics.isCrashlyticsCollectionEnabled();
      }
      return false;
    } catch (e) {
      console.warn('❌ Failed to check Crashlytics availability:', e);
      return false;
    }
  }

  /**
   * Enable or disable crash collection
   */
  setCrashlyticsCollectionEnabled(enabled: boolean) {
    try {
      if (isInitialized && crashlytics) {
        crashlytics.setCrashlyticsCollectionEnabled(enabled);
        console.log('📊 Crashlytics collection enabled:', enabled);
      } else {
        console.log('🔍 Mock Crashlytics - Collection enabled:', enabled);
      }
    } catch (e) {
      console.warn('❌ Failed to set crash collection enabled in Crashlytics:', e);
    }
  }

  /**
   * Track wallet operations
   */
  trackWalletOperation(operation: string, walletId?: string, success: boolean = true) {
    const logMessage = `Wallet operation: ${operation} - ${success ? 'success' : 'failed'}`;
    this.log(logMessage);
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
    const logMessage = `Transaction: ${transactionType} - ${success ? 'success' : 'failed'}`;
    this.log(logMessage);
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
    const logMessage = `Auth event: ${event} - ${method} - ${success ? 'success' : 'failed'}`;
    this.log(logMessage);
    this.setAttributes({
      authEvent: event,
      authMethod: method,
      authSuccess: success.toString(),
      platform: Platform.OS,
    });
  }
}

// Export singleton instance
const crashlyticsService = new CrashlyticsService();

// Initialize Crashlytics on service creation
if (isInitialized && crashlytics) {
  try {
    crashlytics.setCrashlyticsCollectionEnabled(true);
    crashlytics.setUserId('anonymous');
    crashlytics.setAttributes({
      platform: Platform.OS,
      appVersion: '1.1.6',
      buildType: __DEV__ ? 'debug' : 'release',
    });
    console.log('✅ Crashlytics service initialized successfully');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Crashlytics service:', error);
  }
} else {
  console.log('ℹ️ Crashlytics service running in mock mode');
}

export default crashlyticsService;
