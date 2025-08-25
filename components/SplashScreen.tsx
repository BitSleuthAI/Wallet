import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bitcoin, Shield, Zap } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      // Reset values
      logoScale.setValue(0);
      logoOpacity.setValue(0);
      textOpacity.setValue(0);
      iconRotation.setValue(0);
      glowOpacity.setValue(0);

      // Create animation sequence
      const animationSequence = Animated.sequence([
        // Logo entrance with scale and fade
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        // Icon rotation
        Animated.timing(iconRotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Text fade in
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        // Glow effect
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Hold for a moment
        Animated.delay(500),
      ]);

      animationSequence.start(() => {
        // Animation complete, trigger callback
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    };

    startAnimation();
  }, [onAnimationComplete]);

  const rotateInterpolate = iconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowInterpolate = glowOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Background gradient */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated glow effect */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowInterpolate,
            },
          ]}
        />

        {/* Main content container */}
        <View style={styles.content}>
          {/* Logo container */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            {/* Bitcoin icon with rotation */}
            <Animated.View
              style={[
                styles.bitcoinIcon,
                {
                  transform: [{ rotate: rotateInterpolate }],
                },
              ]}
            >
              <Bitcoin color="#F7931A" size={48} />
            </Animated.View>

            {/* Security and speed icons */}
            <View style={styles.featureIcons}>
              <Shield color="#10B981" size={24} style={styles.featureIcon} />
              <Zap color="#F59E0B" size={24} style={styles.featureIcon} />
            </View>
          </Animated.View>

          {/* App name */}
          <Animated.Text
            style={[
              styles.appName,
              {
                opacity: textOpacity,
              },
            ]}
          >
            BitSleuth
          </Animated.Text>

          {/* App tagline */}
          <Animated.Text
            style={[
              styles.appTagline,
              {
                opacity: textOpacity,
              },
            ]}
          >
            Secure • Fast • Private
          </Animated.Text>

          {/* Loading indicator */}
          <Animated.View
            style={[
              styles.loadingContainer,
              {
                opacity: textOpacity,
              },
            ]}
          >
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </Animated.View>
        </View>

        {/* Bottom branding */}
        <Animated.View
          style={[
            styles.bottomBranding,
            {
              opacity: textOpacity,
            },
          ]}
        >
          <Text style={styles.bottomText}>Bitcoin Wallet</Text>
        </Animated.View>
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
  glowEffect: {
    position: 'absolute',
    top: height * 0.2,
    left: width * 0.1,
    right: width * 0.1,
    height: height * 0.4,
    backgroundColor: '#6366F1',
    borderRadius: 200,
    opacity: 0.3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  bitcoinIcon: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'rgba(247, 147, 26, 0.1)',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(247, 147, 26, 0.3)',
  },
  featureIcons: {
    flexDirection: 'row',
    gap: 20,
  },
  featureIcon: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  appName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appTagline: {
    fontSize: 18,
    fontWeight: '500',
    color: '#CBD5E1',
    marginBottom: 60,
    textAlign: 'center',
    letterSpacing: 1,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  dot1: {
    animationDelay: '0ms',
  },
  dot2: {
    animationDelay: '200ms',
  },
  dot3: {
    animationDelay: '400ms',
  },
  bottomBranding: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
});
