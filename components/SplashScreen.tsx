import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { APP_VERSION } from '@/constants/app-version';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

// Sequence timing: logo entrance (600ms) -> text fade (800ms) -> hold (1500ms)
const LOGO_DURATION_MS = 600;
const TEXT_DURATION_MS = 800;
const HOLD_DURATION_MS = 1500;

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const magnifyingGlassScale = useSharedValue(0);

  useEffect(() => {
    // Magnifying glass entrance with bounce, logo fade in parallel
    magnifyingGlassScale.value = withSpring(1, { damping: 9, stiffness: 60, mass: 1 });
    logoOpacity.value = withTiming(1, { duration: LOGO_DURATION_MS });

    // Text fade in after the logo settles
    textOpacity.value = withDelay(LOGO_DURATION_MS, withTiming(1, { duration: TEXT_DURATION_MS }));

    // Completion is scheduled on the JS side for deterministic timing
    const completeTimeout = setTimeout(() => {
      onAnimationComplete?.();
    }, LOGO_DURATION_MS + TEXT_DURATION_MS + HOLD_DURATION_MS);

    return () => clearTimeout(completeTimeout);
  }, [onAnimationComplete, logoOpacity, magnifyingGlassScale, textOpacity]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: magnifyingGlassScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Background gradient matching the logo */}
      <LinearGradient
        colors={['#FF8A3D', '#FF6B5C', '#FF5E7B']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Main content container */}
        <View style={styles.content}>
          {/* Magnifying Glass Logo Container */}
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            {/* Static Magnifying Glass Logo - Exact replica of the provided image */}
            <Svg width={180} height={180} viewBox="0 0 24 24">
              {/* Main magnifying glass circle */}
              <Circle
                cx="10.5"
                cy="10.5"
                r="7.5"
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
              {/* Handle of magnifying glass - straight diagonal line */}
              <Path
                d="M 16.5 16.5 L 21 21"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>

          {/* App name */}
          <Animated.View style={textStyle}>
            <Text style={styles.appName}>BitSleuth</Text>
          </Animated.View>

          {/* App tagline */}
          <Animated.View style={textStyle}>
            <Text style={styles.appTagline}>secure • private • trusted</Text>
          </Animated.View>

          {/* Version and description */}
          <Animated.View style={[styles.versionContainer, textStyle]}>
            <Text style={styles.versionText}>{`v${APP_VERSION}`}</Text>
            <Text style={styles.walletText}>Bitcoin Wallet</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
    width: 180,
    height: 180,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
      web: {
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
      },
    }),
  },

  appName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  appTagline: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 40,
  },
  versionContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  walletText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
