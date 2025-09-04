import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';

class CrashlyticsService {
  /**
   * Record a non-fatal error
   */
  recordError(error: Error, context?: Record<string, string>) {
    try {
      if (context) {
        crashlytics().setAttributes(context);
      }
      crashlytics().recordError(error);
    } catch (e) {
      console.warn('Failed to record error to Crashlytics:', e);
    }
  }

  /**
   * Log a custom message
   */
  log(message: string) {
    try {
      crashlytics().log(message);
    } catch (e) {
      console.warn('Failed to log to Crashlytics:', e);
    }
  }

  /**
   * Set user identifier
   */
  setUserId(userId: string) {
    try {
      crashlytics().setUserId(userId);
    } catch (e) {
      console.warn('Failed to set user ID in Crashlytics:', e);
    }
  }

  /**
   * Set custom attributes
   */
  setAttributes(attributes: Record<string, string>) {
    try {
      crashlytics().setAttributes(attributes);
    } catch (e) {
      console.warn('Failed to set attributes in Crashlytics:', e);
    }
  }

  /**
   * Set a single attribute
   */
  setAttribute(key: string, value: string) {
    try {
      crashlytics().setAttribute(key, value);
    } catch (e) {
      console.warn('Failed to set attribute in Crashlytics:', e);
    }
  }

  /**
   * Force a test crash (for testing purposes only)
   */
  crash() {
    try {
      crashlytics().crash();
    } catch (e) {
      console.warn('Failed to force crash in Crashlytics:', e);
    }
  }

  /**
   * Check if Crashlytics is available
   */
  isAvailable(): boolean {
    try {
      return crashlytics().isCrashlyticsCollectionEnabled();
    } catch (e) {
      return false;
    }
  }

  /**
   * Enable or disable crash collection
   */
  setCrashlyticsCollectionEnabled(enabled: boolean) {
    try {
      crashlytics().setCrashlyticsCollectionEnabled(enabled);
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
