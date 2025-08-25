import RNBootSplash from 'react-native-bootsplash';

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
   * Hide the native splash screen
   * This should be called when your app is ready to show the main content
   */
  public async hide(): Promise<void> {
    if (this.isHidden) {
      return;
    }

    try {
      await RNBootSplash.hide({ fade: true });
      this.isHidden = true;
      console.log('✅ Native splash screen hidden successfully');
    } catch (error) {
      console.error('❌ Error hiding native splash screen:', error);
      // Fallback: try to hide without animation
      try {
        await RNBootSplash.hide({ fade: false });
        this.isHidden = true;
        console.log('✅ Native splash screen hidden without animation');
      } catch (fallbackError) {
        console.error('❌ Failed to hide splash screen even without animation:', fallbackError);
      }
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
