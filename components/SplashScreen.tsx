import { LinearGradient } from 'expo-linear-gradient';
import { Bitcoin, Shield, Zap } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
    Dimensions,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const iconRotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    const startAnimation = () => {
      // Reset values
      logoScale.value = 0;
      logoOpacity.value = 0;
      textOpacity.value = 0;
      iconRotation.value = 0;
      glowOpacity.value = 0;

      // Create animation sequence
      logoScale.value = withTiming(1, { duration: 800 });
      logoOpacity.value = withTiming(1, { duration: 600 });
      
      iconRotation.value = withDelay(800, withTiming(1, { duration: 1000 }));
      textOpacity.value = withDelay(1800, withTiming(1, { duration: 800 }));
      glowOpacity.value = withDelay(2600, withTiming(1, { duration: 600 }));

      // Trigger completion callback after animation
      setTimeout(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, 3200);
    };

    startAnimation();
  }, [onAnimationComplete]);

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: logoScale.value }],
      opacity: logoOpacity.value,
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${iconRotation.value * 360}deg` }],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value * 0.3,
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Background gradient */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.background}
      />

      {/* Glow effect */}
      <Animated.View style={[styles.glow, glowAnimatedStyle]} />

      {/* Main content container */}
      <View style={styles.content}>
        {/* Logo container */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoBackground}>
            <Bitcoin size={60} color="#F7931A" />
          </View>
        </Animated.View>

        {/* Icon rotation */}
        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          <Shield size={40} color="#10B981" style={styles.icon} />
          <Zap size={40} color="#F59E0B" style={styles.icon} />
        </Animated.View>

        {/* App name */}
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={styles.appName}>BitSleuth</Text>
          <Text style={styles.appSubtitle}>Wallet</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineContainer, textAnimatedStyle]}>
          <Text style={styles.tagline}>Secure • Fast • Smart</Text>
        </Animated.View>
      </View>
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
  glow: {
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
  logoBackground: {
    padding: 20,
    backgroundColor: 'rgba(247, 147, 26, 0.1)',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(247, 147, 26, 0.3)',
  },
  iconContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  icon: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appSubtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#CBD5E1',
    textAlign: 'center',
    letterSpacing: 1,
  },
  taglineContainer: {
    marginBottom: 60,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500',
    color: '#CBD5E1',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
