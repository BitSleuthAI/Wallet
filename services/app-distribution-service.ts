import { Platform } from 'react-native';

// Firebase App Distribution with fallback for web/missing native module
let appDistribution: any = null;
let firebaseApp: any = null;
let isInitialized = false;
let isExpoGo = false;

// Check if running in Expo Go
try {
  const Constants = require('expo-constants').default;
  isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    console.log('ℹ️ Running in Expo Go - Firebase App Distribution not available');
  }
} catch (error) {
  console.log('ℹ️ Could not detect Expo Go status');
}

try {
  if (!isExpoGo) {
    // Try to initialize Firebase App first
    try {
      const firebase = require('@react-native-firebase/app');
      const appDistributionModule = require('@react-native-firebase/app-distribution');
      
      firebaseApp = firebase.default;
      appDistribution = appDistributionModule.default;
      
      // Check if Firebase is properly configured
      if (firebaseApp.apps.length === 0) {
        console.warn('⚠️ Firebase app not initialized - check your configuration files');
        isInitialized = false;
      } else {
        isInitialized = true;
        console.log('✅ Firebase App Distribution module loaded successfully');
        console.log('📱 Firebase App Name:', firebaseApp.app().name);
        console.log('🔧 Firebase Project ID:', firebaseApp.app().options.projectId);
      }
    } catch (moduleError) {
      console.log('ℹ️ Firebase App Distribution module not found - running in mock mode');
      console.log('💡 Install @react-native-firebase/app-distribution for production builds');
      isInitialized = false;
    }
  } else {
    console.log('ℹ️ Running on web - App Distribution not available');
  }
} catch (error) {
  console.warn('⚠️ Firebase App Distribution not available:', error);
  console.warn('💡 This is expected in Expo Go. Use a development build to test App Distribution.');
  isInitialized = false;
}

interface UpdateInfo {
  displayVersion: string;
  buildVersion: string;
  releaseNotes: string;
  isCritical: boolean;
}

class AppDistributionService {
  /**
   * Check if a new release is available
   */
  async checkForUpdate(): Promise<UpdateInfo | null> {
    try {
      if (isInitialized && appDistribution) {
        const newRelease = await appDistribution().checkForUpdate();
        
        if (newRelease) {
          const updateInfo: UpdateInfo = {
            displayVersion: newRelease.displayVersion || 'Unknown',
            buildVersion: newRelease.buildVersion || 'Unknown',
            releaseNotes: newRelease.releaseNotes || 'No release notes available',
            isCritical: newRelease.isCritical || false,
          };
          
          console.log('📦 New release available:', updateInfo);
          return updateInfo;
        } else {
          console.log('✅ App is up to date');
          return null;
        }
      } else {
        console.log('🔍 Mock App Distribution - Checking for updates');
        return null;
      }
    } catch (e) {
      console.warn('❌ Failed to check for updates:', e);
      return null;
    }
  }

  /**
   * Check if tester is signed in to App Distribution
   */
  async isTesterSignedIn(): Promise<boolean> {
    try {
      if (isInitialized && appDistribution) {
        const isSignedIn = await appDistribution().isTesterSignedIn();
        console.log('📋 Tester signed in status:', isSignedIn);
        return isSignedIn;
      } else {
        console.log('🔍 Mock App Distribution - Tester not signed in');
        return false;
      }
    } catch (e) {
      console.warn('❌ Failed to check tester sign-in status:', e);
      return false;
    }
  }

  /**
   * Sign in tester to App Distribution
   */
  async signInTester(): Promise<boolean> {
    try {
      if (isInitialized && appDistribution) {
        await appDistribution().signInTester();
        console.log('✅ Tester signed in successfully');
        return true;
      } else {
        console.log('🔍 Mock App Distribution - Tester sign-in simulated');
        return false;
      }
    } catch (e) {
      console.warn('❌ Failed to sign in tester:', e);
      return false;
    }
  }

  /**
   * Sign out tester from App Distribution
   */
  async signOutTester(): Promise<void> {
    try {
      if (isInitialized && appDistribution) {
        await appDistribution().signOutTester();
        console.log('✅ Tester signed out successfully');
      } else {
        console.log('🔍 Mock App Distribution - Tester sign-out simulated');
      }
    } catch (e) {
      console.warn('❌ Failed to sign out tester:', e);
    }
  }

  /**
   * Check for update and sign in tester if needed
   */
  async checkForUpdateWithAuth(): Promise<UpdateInfo | null> {
    try {
      // First check if tester is signed in
      const isSignedIn = await this.isTesterSignedIn();
      
      if (!isSignedIn) {
        console.log('📋 Tester not signed in, attempting sign-in...');
        const signInSuccess = await this.signInTester();
        
        if (!signInSuccess) {
          console.log('⚠️ Could not sign in tester, skipping update check');
          return null;
        }
      }
      
      // Now check for updates
      return await this.checkForUpdate();
    } catch (e) {
      console.warn('❌ Failed to check for update with auth:', e);
      return null;
    }
  }

  /**
   * Get information about the installed release
   */
  getInstalledVersion(): { version: string; buildNumber: string } {
    try {
      const Constants = require('expo-constants').default;
      return {
        version: Constants.expoConfig?.version || '1.2.1',
        buildNumber: Platform.select({
          ios: Constants.expoConfig?.ios?.buildNumber || '1',
          android: String(Constants.expoConfig?.android?.versionCode || 1),
          default: '1',
        }),
      };
    } catch (e) {
      console.warn('❌ Failed to get installed version:', e);
      return {
        version: '1.2.1',
        buildNumber: '1',
      };
    }
  }

  /**
   * Check if App Distribution is available
   */
  isAvailable(): boolean {
    return isInitialized && appDistribution !== null && !isExpoGo;
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
   * Enable automatic update checking on app startup
   */
  async enableAutoUpdateCheck(): Promise<void> {
    if (!this.isAvailable()) {
      console.log('ℹ️ App Distribution not available, skipping auto-update check');
      return;
    }

    try {
      // Check for updates in the background
      const updateInfo = await this.checkForUpdateWithAuth();
      
      if (updateInfo) {
        console.log('📦 New version available:', updateInfo.displayVersion);
        console.log('📝 Release notes:', updateInfo.releaseNotes);
        
        if (updateInfo.isCritical) {
          console.log('🚨 This is a CRITICAL update!');
        }
        
        // In a real implementation, you would show a UI dialog here
        // For now, we just log the information
      }
    } catch (e) {
      console.warn('❌ Auto-update check failed:', e);
    }
  }
}

// Export singleton instance
const appDistributionService = new AppDistributionService();

// Initialize App Distribution on service creation
if (isInitialized && appDistribution && !isExpoGo) {
  try {
    console.log('✅ Firebase App Distribution service initialized successfully');
    
    // Optionally enable auto-update check on initialization
    // This will check for updates when the service is first loaded
    if (!__DEV__) {
      // Only check for updates in production builds
      setTimeout(() => {
        appDistributionService.enableAutoUpdateCheck().catch((error) => {
          console.warn('⚠️ Failed to perform auto-update check:', error);
        });
      }, 5000); // Wait 5 seconds after app startup
    }
  } catch (error) {
    console.warn('⚠️ Failed to initialize App Distribution service:', error);
  }
} else if (isExpoGo) {
  console.log('ℹ️ App Distribution service disabled in Expo Go - use development build');
} else {
  console.log('ℹ️ App Distribution service running in mock mode');
}

export default appDistributionService;
