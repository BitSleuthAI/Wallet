import * as ExpoSplashScreen from 'expo-splash-screen';

export class SplashScreenManager {
  private static instance: SplashScreenManager;
  private isHidden = false;

  private constructor() {}

  public static getInstance(): SplashScreenManager {
    if (!SplashScreenManager.instance) {
      SplashScreenManager.instance = new SplashScreenManager();
    }
    return SplashScreenManager.instance;
  }

  /**
   * Hide the Expo splash screen
   * This should be called when your app is ready to show the main content
   */
  public async hide(): Promise<void> {
    if (this.isHidden) {
      return;
    }

    try {
      await ExpoSplashScreen.hideAsync();
      this.isHidden = true;
      console.log('✅ Expo splash screen hidden successfully');
    } catch (error) {
      console.error('❌ Error hiding Expo splash screen:', error);
      // Mark as hidden even if there's an error to prevent app from being stuck
      this.isHidden = true;
    }
  }

  /**
   * Check if the splash screen is currently hidden
   */
  public isSplashHidden(): boolean {
    return this.isHidden;
  }

  /**
   * Get the current splash screen status
   */
  public getStatus(): { isHidden: boolean } {
    return {
      isHidden: this.isHidden,
    };
  }
}

// Export singleton instance
export const splashScreenManager = SplashScreenManager.getInstance();
