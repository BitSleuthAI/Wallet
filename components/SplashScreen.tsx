import { LinearGradient } from 'expo-linear-gradient';
import { Bitcoin } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const bitcoinRotation = useRef(new Animated.Value(0)).current;
  const magnifyingGlassScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const versionOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      // Reset values
      logoScale.setValue(0);
      logoOpacity.setValue(0);
      textOpacity.setValue(0);
      bitcoinRotation.setValue(0);
      magnifyingGlassScale.setValue(0);
      glowOpacity.setValue(0);
      versionOpacity.setValue(0);

      // Create animation sequence
      const animationSequence = Animated.sequence([
        // Magnifying glass entrance
        Animated.parallel([
          Animated.timing(magnifyingGlassScale, {
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
        // Bitcoin symbol starts spinning
        Animated.timing(bitcoinRotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        // Text fade in
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        // Version info fade in
        Animated.timing(versionOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Glow effect
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Hold for a moment
        Animated.delay(800),
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

  const rotateInterpolate = bitcoinRotation.interpolate({
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
      
      {/* Background gradient - dark blue theme */}
      <LinearGradient
        colors={['#0B1426', '#1A2332', '#2D3748']}
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
            {/* Magnifying Glass */}
            <View style={styles.magnifyingGlass}>
              {/* Glass circle */}
              <View style={styles.glassCircle}>
                {/* Spinning Bitcoin symbol inside */}
                <Animated.View
                  style={[
                    styles.bitcoinContainer,
                    {
                      transform: [{ rotate: rotateInterpolate }],
                    },
                  ]}
                >
                  <Bitcoin color="#F7931A" size={32} />
                </Animated.View>
              </View>
              {/* Handle */}
              <View style={styles.glassHandle} />
            </View>
          </Animated.View>

          {/* App name with 3D effect */}
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
            secure • private • trusted
          </Animated.Text>
        </View>

        {/* Bottom branding with version */}
        <Animated.View
          style={[
            styles.bottomBranding,
            {
              opacity: versionOpacity,
            },
          ]}
        >
          <Text style={styles.versionText}>v1.1.6</Text>
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
    top: height * 0.15,
    left: width * 0.15,
    right: width * 0.15,
    height: height * 0.5,
    backgroundColor: '#F7931A',
    borderRadius: 200,
    opacity: 0.1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  magnifyingGlass: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 3,
    borderColor: '#F7931A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F7931A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bitcoinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassHandle: {
    width: 20,
    height: 30,
    backgroundColor: '#F7931A',
    borderRadius: 10,
    marginTop: -5,
    marginLeft: 25,
    shadowColor: '#F7931A',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  appName: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 3,
    // 3D text effect with multiple shadows
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    // Additional shadow for more depth
    shadowColor: '#F7931A',
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  appTagline: {
    fontSize: 18,
    fontWeight: '500',
    color: '#CBD5E1',
    marginBottom: 80,
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomBranding: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 1,
  },
  bottomText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
