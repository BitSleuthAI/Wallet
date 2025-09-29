import { NativeModules, Platform } from 'react-native';

interface GooglePlayServicesResult {
  isAvailable: boolean;
  status: string;
  message: string;
  resultCode: number;
  isUserResolvable: boolean;
}

interface GooglePlayServicesCheckerModule {
  checkPlayServices(): Promise<GooglePlayServicesResult>;
  showErrorDialog(): Promise<boolean>;
}

const { GooglePlayServicesChecker } = NativeModules as {
  GooglePlayServicesChecker: GooglePlayServicesCheckerModule;
};

class GooglePlayServicesService {
  private isAvailable: boolean | null = null;
  private lastCheckTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if Google Play Services is available on the device
   * @param forceCheck - Force a new check even if cached result exists
   * @returns Promise<boolean> - true if available, false otherwise
   */
  async checkAvailability(forceCheck: boolean = false): Promise<boolean> {
    // On iOS, always return true as Google Play Services is not needed
    if (Platform.OS === 'ios') {
      return true;
    }

    const now = Date.now();
    
    // Return cached result if available and not expired
    if (!forceCheck && this.isAvailable !== null && (now - this.lastCheckTime) < this.CACHE_DURATION) {
      return this.isAvailable;
    }

    try {
      if (!GooglePlayServicesChecker) {
        console.warn('GooglePlayServicesChecker module not available');
        return false;
      }

      const result: GooglePlayServicesResult = await GooglePlayServicesChecker.checkPlayServices();
      
      this.isAvailable = result.isAvailable;
      this.lastCheckTime = now;
      
      if (!result.isAvailable) {
        console.warn('Google Play Services not available:', result.message);
      }
      
      return result.isAvailable;
    } catch (error) {
      console.error('Error checking Google Play Services:', error);
      this.isAvailable = false;
      this.lastCheckTime = now;
      return false;
    }
  }

  /**
   * Get detailed information about Google Play Services status
   * @returns Promise<GooglePlayServicesResult | null>
   */
  async getDetailedStatus(): Promise<GooglePlayServicesResult | null> {
    if (Platform.OS === 'ios') {
      return {
        isAvailable: true,
        status: 'SUCCESS',
        message: 'Google Play Services not required on iOS',
        resultCode: 0,
        isUserResolvable: false,
      };
    }

    try {
      if (!GooglePlayServicesChecker) {
        return null;
      }

      return await GooglePlayServicesChecker.checkPlayServices();
    } catch (error) {
      console.error('Error getting Google Play Services status:', error);
      return null;
    }
  }

  /**
   * Show error dialog to user if Google Play Services is not available
   * @returns Promise<boolean> - true if dialog was shown, false otherwise
   */
  async showErrorDialog(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return false;
    }

    try {
      if (!GooglePlayServicesChecker) {
        return false;
      }

      return await GooglePlayServicesChecker.showErrorDialog();
    } catch (error) {
      console.error('Error showing Google Play Services error dialog:', error);
      return false;
    }
  }

  /**
   * Clear cached availability status
   */
  clearCache(): void {
    this.isAvailable = null;
    this.lastCheckTime = 0;
  }

  /**
   * Check if barcode scanning is supported
   * @returns Promise<boolean>
   */
  async isBarcodeScanningSupported(): Promise<boolean> {
    return await this.checkAvailability();
  }
}

export const googlePlayServicesService = new GooglePlayServicesService();
export default googlePlayServicesService;
