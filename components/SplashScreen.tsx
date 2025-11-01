import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const magnifyingGlassScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      // Reset values
      logoScale.setValue(0);
      logoOpacity.setValue(0);
      textOpacity.setValue(0);
      magnifyingGlassScale.setValue(0);

      // Create animation sequence
      const animationSequence = Animated.sequence([
        // Magnifying glass entrance with bounce
        Animated.parallel([
          Animated.spring(magnifyingGlassScale, {
            toValue: 1,
            tension: 20,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        // Text fade in
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        // Hold for a moment
        Animated.delay(1500),
      ]);

      animationSequence.start(() => {
        // Animation complete, trigger callback
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    };

    startAnimation();
  }, [onAnimationComplete, logoOpacity, logoScale, magnifyingGlassScale, textOpacity]);

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
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: magnifyingGlassScale }],
              },
            ]}
          >
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
          <Animated.View style={{ opacity: textOpacity }}>
            <Text style={styles.appName}>BitSleuth</Text>
          </Animated.View>

          {/* App tagline */}
          <Animated.View style={{ opacity: textOpacity }}>
            <Text style={styles.appTagline}>secure • private • trusted</Text>
          </Animated.View>

          {/* Version and description */}
          <Animated.View style={[styles.versionContainer, { opacity: textOpacity }]}>
            <Text style={styles.versionText}>v1.1.6</Text>
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
