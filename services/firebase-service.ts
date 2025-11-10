/**
 * Unified Firebase Service
 * 
 * Provides a single entry point for all Firebase features:
 * - Crashlytics (error reporting)
 * - Performance Monitoring (app performance)
 * - App Distribution (release management)
 */

import crashlyticsService from './crashlytics-service';
import performanceService from './performance-service';
import appDistributionService from './app-distribution-service';
import { Platform } from 'react-native';

class FirebaseService {
  // Crashlytics methods
  get crashlytics() {
    return crashlyticsService;
  }

  // Performance Monitoring methods
  get performance() {
    return performanceService;
  }

  // App Distribution methods
  get appDistribution() {
    return appDistributionService;
  }

  /**
   * Initialize all Firebase services
   */
  async initialize(): Promise<void> {
    console.log('🔥 Initializing Firebase services...');
    
    // Check availability of each service
    const crashlyticsAvailable = crashlyticsService.isAvailable();
    const performanceAvailable = performanceService.isAvailable();
    const appDistributionAvailable = appDistributionService.isAvailable();
    
    console.log('📊 Firebase Services Status:');
    console.log(`  - Crashlytics: ${crashlyticsAvailable ? '✅' : '❌'}`);
    console.log(`  - Performance Monitoring: ${performanceAvailable ? '✅' : '❌'}`);
    console.log(`  - App Distribution: ${appDistributionAvailable ? '✅' : '❌'}`);
    
    // Enable performance monitoring if available
    if (performanceAvailable) {
      try {
        await performanceService.setPerformanceCollectionEnabled(true);
        console.log('✅ Performance Monitoring enabled');
      } catch (error) {
        console.warn('⚠️ Failed to enable Performance Monitoring:', error);
      }
    }
    
    // Enable crashlytics if available
    if (crashlyticsAvailable) {
      try {
        crashlyticsService.setCrashlyticsCollectionEnabled(true);
        console.log('✅ Crashlytics enabled');
      } catch (error) {
        console.warn('⚠️ Failed to enable Crashlytics:', error);
      }
    }
    
    console.log('✅ Firebase services initialized');
  }

  /**
   * Get overall Firebase status
   */
  getStatus(): {
    crashlytics: boolean;
    performance: boolean;
    appDistribution: boolean;
    platform: string;
  } {
    return {
      crashlytics: crashlyticsService.isAvailable(),
      performance: performanceService.isAvailable(),
      appDistribution: appDistributionService.isAvailable(),
      platform: Platform.OS,
    };
  }

  /**
   * Check for app updates (convenience method)
   */
  async checkForUpdates() {
    return await appDistributionService.checkForUpdateWithAuth();
  }

  /**
   * Track a wallet operation with both performance and crash reporting
   */
  async trackWalletOperation(
    operation: string,
    walletId?: string,
    handler?: () => Promise<void>
  ): Promise<void> {
    const stopPerformanceTrace = await performanceService.trackWalletOperation(operation);
    
    try {
      if (handler) {
        await handler();
      }
      
      // Log successful operation to Crashlytics
      crashlyticsService.trackWalletOperation(operation, walletId, true);
    } catch (error) {
      // Log failed operation to Crashlytics
      crashlyticsService.trackWalletOperation(operation, walletId, false);
      
      if (error instanceof Error) {
        crashlyticsService.recordError(error, {
          operation,
          walletId: walletId || 'unknown',
        });
      }
      
      throw error;
    } finally {
      // Stop performance trace
      await stopPerformanceTrace();
    }
  }

  /**
   * Track a transaction operation with both performance and crash reporting
   */
  async trackTransactionOperation(
    operation: string,
    amount?: string,
    handler?: () => Promise<void>
  ): Promise<void> {
    const stopPerformanceTrace = await performanceService.trackTransactionOperation(operation);
    
    try {
      if (handler) {
        await handler();
      }
      
      // Log successful transaction to Crashlytics
      crashlyticsService.trackTransaction(operation, amount, true);
    } catch (error) {
      // Log failed transaction to Crashlytics
      crashlyticsService.trackTransaction(operation, amount, false);
      
      if (error instanceof Error) {
        crashlyticsService.recordError(error, {
          transactionType: operation,
          amount: amount || 'unknown',
        });
      }
      
      throw error;
    } finally {
      // Stop performance trace
      await stopPerformanceTrace();
    }
  }

  /**
   * Track screen navigation with performance monitoring
   */
  async trackScreenView(screenName: string): Promise<() => Promise<void>> {
    const stopTrace = await performanceService.trackScreenRender(screenName);
    crashlyticsService.log(`Screen viewed: ${screenName}`);
    
    return stopTrace;
  }
}

// Export singleton instance
const firebaseService = new FirebaseService();

// Auto-initialize Firebase services
if (!__DEV__) {
  // Only auto-initialize in production builds
  setTimeout(() => {
    firebaseService.initialize().catch((error) => {
      console.warn('⚠️ Failed to auto-initialize Firebase services:', error);
    });
  }, 1000); // Wait 1 second after app startup
}

export default firebaseService;
