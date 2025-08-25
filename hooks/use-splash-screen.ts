import { useState, useEffect, useCallback } from 'react';
import { splashScreenManager } from '@/services/splash-screen-manager';

export interface UseSplashScreenReturn {
  isVisible: boolean;
  hideSplash: () => Promise<void>;
  isReady: boolean;
}

export const useSplashScreen = (): UseSplashScreenReturn => {
  const [isVisible, setIsVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const hideSplash = useCallback(async () => {
    try {
      // Hide the native splash screen
      await splashScreenManager.hide();
      
      // Update local state
      setIsVisible(false);
      setIsReady(true);
      
      console.log('🎉 Splash screen hidden, app is ready!');
    } catch (error) {
      console.error('❌ Error in hideSplash:', error);
      // Even if there's an error, mark as ready to prevent app from being stuck
      setIsVisible(false);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    // Check if splash screen is already hidden (e.g., app was backgrounded)
    const checkSplashStatus = () => {
      const status = splashScreenManager.getStatus();
      if (status.isHidden) {
        setIsVisible(false);
        setIsReady(true);
      }
    };

    checkSplashStatus();
  }, []);

  return {
    isVisible,
    hideSplash,
    isReady,
  };
};
