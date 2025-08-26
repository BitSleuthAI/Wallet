import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export class AnimationManager {
  private static instance: AnimationManager;
  private animationsEnabled: boolean = true;
  private reducedMotionEnabled: boolean = false;
  private performanceMode: 'high' | 'medium' | 'low' = 'high';

  private constructor() {
    this.loadSettings();
  }

  static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  private async loadSettings() {
    try {
      const animationsEnabled = await AsyncStorage.getItem('animationsEnabled');
      const reducedMotion = await AsyncStorage.getItem('reducedMotionEnabled');
      const performanceMode = await AsyncStorage.getItem('animationPerformanceMode');

      this.animationsEnabled = animationsEnabled !== 'false';
      this.reducedMotionEnabled = reducedMotion === 'true';
      this.performanceMode = (performanceMode as any) || 'high';
    } catch (error) {
      console.log('Failed to load animation settings:', error);
    }
  }

  // Check if animations should be enabled
  shouldAnimate(): boolean {
    if (!this.animationsEnabled) return false;
    if (this.reducedMotionEnabled) return false;
    if (Platform.OS === 'web') return false; // Disable on web for performance
    
    return true;
  }

  // Get animation duration based on performance mode
  getAnimationDuration(baseDuration: number): number {
    if (!this.shouldAnimate()) return 0;
    
    switch (this.performanceMode) {
      case 'high':
        return baseDuration;
      case 'medium':
        return baseDuration * 1.5;
      case 'low':
        return baseDuration * 2;
      default:
        return baseDuration;
    }
  }

  // Get spring configuration based on performance mode
  getSpringConfig(baseConfig: { tension: number; friction: number }) {
    if (!this.shouldAnimate()) {
      return { tension: 1000, friction: 100 }; // Instant animation
    }
    
    switch (this.performanceMode) {
      case 'high':
        return baseConfig;
      case 'medium':
        return {
          tension: baseConfig.tension * 0.8,
          friction: baseConfig.friction * 1.2,
        };
      case 'low':
        return {
          tension: baseConfig.tension * 0.6,
          friction: baseConfig.friction * 1.5,
        };
      default:
        return baseConfig;
    }
  }

  // Enable/disable animations
  async setAnimationsEnabled(enabled: boolean) {
    this.animationsEnabled = enabled;
    await AsyncStorage.setItem('animationsEnabled', enabled.toString());
  }

  // Enable/disable reduced motion
  async setReducedMotionEnabled(enabled: boolean) {
    this.reducedMotionEnabled = enabled;
    await AsyncStorage.setItem('reducedMotionEnabled', enabled.toString());
  }

  // Set performance mode
  async setPerformanceMode(mode: 'high' | 'medium' | 'low') {
    this.performanceMode = mode;
    await AsyncStorage.setItem('animationPerformanceMode', mode);
  }

  // Get current settings
  getSettings() {
    return {
      animationsEnabled: this.animationsEnabled,
      reducedMotionEnabled: this.reducedMotionEnabled,
      performanceMode: this.performanceMode,
    };
  }

  // Check device performance capabilities
  checkDevicePerformance(): 'high' | 'medium' | 'low' {
    // Simple heuristic based on platform and available memory
    if (Platform.OS === 'ios') {
      // iOS devices generally handle animations well
      return 'high';
    } else if (Platform.OS === 'android') {
      // Android devices vary - could implement more sophisticated detection
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Optimize animations for current device
  async optimizeForDevice() {
    const deviceCapability = this.checkDevicePerformance();
    if (this.performanceMode !== deviceCapability) {
      await this.setPerformanceMode(deviceCapability);
    }
  }
}

export default AnimationManager;
