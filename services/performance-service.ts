import { Platform } from 'react-native';

// Firebase Performance Monitoring with fallback for web/missing native module
let perf: any = null;
let firebaseApp: any = null;
let isInitialized = false;
let isExpoGo = false;

// Check if running in Expo Go
try {
  const Constants = require('expo-constants').default;
  isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    console.log('ℹ️ Running in Expo Go - Firebase Performance Monitoring not available');
  }
} catch (error) {
  console.log('ℹ️ Could not detect Expo Go status');
}

try {
  if (!isExpoGo) {
    // Try to initialize Firebase App first
    try {
      const firebase = require('@react-native-firebase/app');
      const perfModule = require('@react-native-firebase/perf');
      
      firebaseApp = firebase.default;
      perf = perfModule.default;
      
      // Check if Firebase is properly configured
      if (firebaseApp.apps.length === 0) {
        console.warn('⚠️ Firebase app not initialized - check your configuration files');
        isInitialized = false;
      } else {
        isInitialized = true;
        console.log('✅ Firebase Performance Monitoring module loaded successfully');
        console.log('📱 Firebase App Name:', firebaseApp.app().name);
        console.log('🔧 Firebase Project ID:', firebaseApp.app().options.projectId);
      }
    } catch (moduleError) {
      console.log('ℹ️ Firebase Performance Monitoring module not found - running in mock mode');
      console.log('💡 Install @react-native-firebase/perf for production builds');
      isInitialized = false;
    }
  } else {
    console.log('ℹ️ Running on web - Performance Monitoring not available');
  }
} catch (error) {
  console.warn('⚠️ Firebase Performance Monitoring not available:', error);
  console.warn('💡 This is expected in Expo Go. Use a development build to test Performance Monitoring.');
  isInitialized = false;
}

class PerformanceService {
  /**
   * Start a trace to measure custom performance metrics
   */
  async startTrace(traceName: string): Promise<any> {
    try {
      if (isInitialized && perf) {
        const trace = await perf().startTrace(traceName);
        console.log('📊 Performance trace started:', traceName);
        return trace;
      } else {
        console.log('🔍 Mock Performance - Trace started:', traceName);
        // Return a mock trace object
        return {
          putAttribute: (key: string, value: string) => {
            console.log(`🔍 Mock trace attribute: ${key} = ${value}`);
          },
          putMetric: (metricName: string, value: number) => {
            console.log(`🔍 Mock trace metric: ${metricName} = ${value}`);
          },
          incrementMetric: (metricName: string, incrementBy: number) => {
            console.log(`🔍 Mock trace increment: ${metricName} += ${incrementBy}`);
          },
          stop: async () => {
            console.log(`🔍 Mock trace stopped: ${traceName}`);
          },
        };
      }
    } catch (e) {
      console.warn('❌ Failed to start performance trace:', e);
      return null;
    }
  }

  /**
   * Create an HTTP metric to track network performance
   */
  async createHttpMetric(url: string, httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'): Promise<any> {
    try {
      if (isInitialized && perf) {
        const metric = await perf().newHttpMetric(url, httpMethod);
        console.log('📊 HTTP metric created:', httpMethod, url);
        return metric;
      } else {
        console.log('🔍 Mock Performance - HTTP metric:', httpMethod, url);
        // Return a mock HTTP metric object
        return {
          putAttribute: (key: string, value: string) => {
            console.log(`🔍 Mock HTTP attribute: ${key} = ${value}`);
          },
          setHttpResponseCode: (code: number) => {
            console.log(`🔍 Mock HTTP response code: ${code}`);
          },
          setRequestPayloadSize: (bytes: number) => {
            console.log(`🔍 Mock HTTP request size: ${bytes} bytes`);
          },
          setResponsePayloadSize: (bytes: number) => {
            console.log(`🔍 Mock HTTP response size: ${bytes} bytes`);
          },
          setResponseContentType: (contentType: string) => {
            console.log(`🔍 Mock HTTP content type: ${contentType}`);
          },
          start: async () => {
            console.log(`🔍 Mock HTTP metric started`);
          },
          stop: async () => {
            console.log(`🔍 Mock HTTP metric stopped`);
          },
        };
      }
    } catch (e) {
      console.warn('❌ Failed to create HTTP metric:', e);
      return null;
    }
  }

  /**
   * Enable or disable performance monitoring
   */
  async setPerformanceCollectionEnabled(enabled: boolean): Promise<void> {
    try {
      if (isInitialized && perf) {
        await perf().setPerformanceCollectionEnabled(enabled);
        console.log('📊 Performance collection enabled:', enabled);
      } else {
        console.log('🔍 Mock Performance - Collection enabled:', enabled);
      }
    } catch (e) {
      console.warn('❌ Failed to set performance collection enabled:', e);
    }
  }

  /**
   * Check if performance monitoring is enabled
   */
  async isPerformanceCollectionEnabled(): Promise<boolean> {
    try {
      if (isInitialized && perf) {
        return await perf().isPerformanceCollectionEnabled();
      }
      return false;
    } catch (e) {
      console.warn('❌ Failed to check performance collection status:', e);
      return false;
    }
  }

  /**
   * Check if Performance Monitoring is available
   */
  isAvailable(): boolean {
    return isInitialized && perf !== null && !isExpoGo;
  }

  /**
   * Get the current environment info
   */
  getEnvironmentInfo(): { isExpoGo: boolean; isInitialized: boolean; platform: string } {
    return {
      isExpoGo,
      isInitialized,
      platform: Platform.OS,
    };
  }

  /**
   * Track wallet operations with performance metrics
   */
  async trackWalletOperation(operation: string): Promise<() => Promise<void>> {
    const trace = await this.startTrace(`wallet_${operation}`);
    
    return async () => {
      if (trace) {
        await trace.stop();
      }
    };
  }

  /**
   * Track transaction operations with performance metrics
   */
  async trackTransactionOperation(operation: string): Promise<() => Promise<void>> {
    const trace = await this.startTrace(`transaction_${operation}`);
    
    return async () => {
      if (trace) {
        await trace.stop();
      }
    };
  }

  /**
   * Track Bitcoin network API calls
   */
  async trackBitcoinAPICall(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<{
    start: () => Promise<void>;
    success: (responseSize?: number) => Promise<void>;
    failure: (errorCode?: number) => Promise<void>;
  }> {
    const metric = await this.createHttpMetric(endpoint, method);
    
    return {
      start: async () => {
        if (metric) {
          await metric.start();
        }
      },
      success: async (responseSize?: number) => {
        if (metric) {
          metric.setHttpResponseCode(200);
          if (responseSize) {
            metric.setResponsePayloadSize(responseSize);
          }
          await metric.stop();
        }
      },
      failure: async (errorCode: number = 500) => {
        if (metric) {
          metric.setHttpResponseCode(errorCode);
          await metric.stop();
        }
      },
    };
  }

  /**
   * Track screen render performance
   */
  async trackScreenRender(screenName: string): Promise<() => Promise<void>> {
    const trace = await this.startTrace(`screen_${screenName}`);
    
    if (trace) {
      trace.putAttribute('screen_name', screenName);
      trace.putAttribute('platform', Platform.OS);
    }
    
    return async () => {
      if (trace) {
        await trace.stop();
      }
    };
  }

  /**
   * Track app startup performance
   */
  async trackAppStartup(): Promise<() => Promise<void>> {
    const trace = await this.startTrace('app_startup');
    
    if (trace) {
      trace.putAttribute('platform', Platform.OS);
      trace.putAttribute('build_type', __DEV__ ? 'debug' : 'release');
    }
    
    return async () => {
      if (trace) {
        await trace.stop();
      }
    };
  }
}

// Export singleton instance
const performanceService = new PerformanceService();

// Initialize Performance Monitoring on service creation
if (isInitialized && perf && !isExpoGo) {
  try {
    perf().setPerformanceCollectionEnabled(true);
    console.log('✅ Firebase Performance Monitoring service initialized successfully');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Performance Monitoring service:', error);
  }
} else if (isExpoGo) {
  console.log('ℹ️ Performance Monitoring service disabled in Expo Go - use development build');
} else {
  console.log('ℹ️ Performance Monitoring service running in mock mode');
}

export default performanceService;
