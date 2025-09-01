import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const bitcoinRotation = useRef(new Animated.Value(0)).current;
  const magnifyingGlassScale = useRef(new Animated.Value(0)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      // Reset values
      logoScale.setValue(0);
      logoOpacity.setValue(0);
      textOpacity.setValue(0);
      bitcoinRotation.setValue(0);
      magnifyingGlassScale.setValue(0);
      shimmerAnimation.setValue(0);

      // Start continuous bitcoin rotation
      Animated.loop(
        Animated.timing(bitcoinRotation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();

      // Start shimmer effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

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
  }, [onAnimationComplete, bitcoinRotation, logoOpacity, logoScale, magnifyingGlassScale, shimmerAnimation, textOpacity]);

  const rotateInterpolate = bitcoinRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shimmerOpacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

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
            {/* Professional Magnifying Glass SVG */}
            <Svg width={180} height={180} viewBox="0 0 180 180">
              {/* Glass circle with gradient effect */}
              <Circle
                cx="75"
                cy="75"
                r="55"
                stroke="white"
                strokeWidth="12"
                fill="none"
              />
              {/* Glass shine effect */}
              <Animated.View
                style={{
                  opacity: shimmerOpacity,
                }}
              >
                <Circle
                  cx="60"
                  cy="60"
                  r="15"
                  fill="rgba(255, 255, 255, 0.4)"
                />
              </Animated.View>
              {/* Handle */}
              <G transform="translate(110, 110)">
                <Path
                  d="M 0 0 L 35 35 Q 40 40 45 35 L 50 30 Q 55 25 50 20 L 15 -15 Q 10 -20 5 -15 L 0 -10 Q -5 -5 0 0 Z"
                  fill="white"
                />
              </G>
            </Svg>
            
            {/* Spinning Bitcoin symbol positioned in center of magnifying glass */}
            <Animated.View
              style={[
                styles.bitcoinContainer,
                {
                  transform: [{ rotate: rotateInterpolate }],
                },
              ]}
            >
              <Svg width={60} height={60} viewBox="0 0 24 24">
                <Path
                  d="M11.767 12.57c-2.118-.31-2.74-.498-2.74-1.04 0-.498.498-.87 1.452-.87 1.04 0 1.452.373 1.493 1.163h1.928c-.083-1.204-.83-2.328-2.349-2.659V7h-2v2.206c-1.328.29-2.393 1.163-2.393 2.493 0 1.599 1.328 2.401 3.27 2.86 1.743.415 2.09.996 2.09 1.62 0 .456-.332 1.203-1.452 1.203-1.107 0-1.556-.498-1.62-1.163H7.518c.083 1.412 1.162 2.206 2.533 2.472V21h2v-2.289c1.33-.249 2.393-1.04 2.393-2.41 0-1.902-1.62-2.533-3.677-2.97z"
                  fill="white"
                />
                <Path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                  fill="white"
                />
              </Svg>
            </Animated.View>
          </Animated.View>

          {/* App name */}
          <Animated.View style={{ opacity: textOpacity }}>
            <Text style={styles.appName}>BitSleuth</Text>
          </Animated.View>

          {/* App tagline */}
          <Animated.View style={{ opacity: textOpacity }}>
            <Text style={styles.appTagline}>Your Bitcoin Wallet</Text>
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
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  bitcoinContainer: {
    position: 'absolute',
    top: 45,
    left: 45,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
