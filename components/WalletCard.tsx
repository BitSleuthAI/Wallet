import HapticService from '@/services/haptic-service';
import { Wallet } from '@/types/wallet';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreVertical, Sparkles, TrendingUp, Wallet as WalletIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

interface WalletCardProps {
  wallet: Wallet;
  isActive: boolean;
  onPress: () => void;
  onMenuPress: () => void;
  balance: number;
  balanceUSD: number;
  priceChange: number;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const CARD_HEIGHT = 200;

export default function WalletCard({
  wallet,
  isActive,
  onPress,
  onMenuPress,
  balance,
  balanceUSD,
  priceChange,
}: WalletCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const sparkleRotation = useSharedValue(0);

  // Generate gradient colors based on wallet name
  const generateGradientColors = (name: string) => {
    const colors = [
      ['#FF6B6B', '#4ECDC4', '#45B7D1'], // Coral to Teal to Blue
      ['#9B59B6', '#E91E63', '#F1C40F'], // Purple to Pink to Yellow
      ['#2ECC71', '#E67E22', '#E74C3C'], // Green to Orange to Red
      ['#3498DB', '#1ABC9C', '#F39C12'], // Blue to Teal to Orange
    ];
    
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const gradientColors = generateGradientColors(wallet.name);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
    };
  });

  const sparkleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${sparkleRotation.value}deg` }],
    };
  });

  // Press animations
  const handlePressIn = () => {
    setIsPressed(true);
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    HapticService.light();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  // Active state animations
  React.useEffect(() => {
    if (isActive) {
      // Glow effect
      glowOpacity.value = withSequence(
        withTiming(0.3, { duration: 500 }),
        withTiming(0.1, { duration: 500 })
      );
      
      // Sparkle rotation
      sparkleRotation.value = withTiming(360, { duration: 2000 });
      
      // Success haptic
      HapticService.success();
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isActive]);

  // Menu press handler
  const handleMenuPress = () => {
    rotation.value = withSequence(
      withTiming(-5, { duration: 100 }),
      withTiming(5, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
    HapticService.medium();
    onMenuPress();
  };

  // Format balance with emoji
  const formatBalance = (bal: number) => {
    if (bal === 0) return '0 ₿ 🆕';
    if (bal < 0.001) return `${bal.toFixed(8)} ₿ 🔍`;
    if (bal < 0.01) return `${bal.toFixed(6)} ₿ 💎`;
    if (bal < 0.1) return `${bal.toFixed(4)} ₿ ✨`;
    if (bal < 1) return `${bal.toFixed(3)} ₿ 🚀`;
    if (bal < 10) return `${bal.toFixed(2)} ₿ 🌟`;
    return `${bal.toFixed(2)} ₿ 💰`;
  };

  // Format price change with emoji
  const formatPriceChange = (change: number) => {
    if (change > 0) return `+${change.toFixed(2)}% 📈`;
    if (change < 0) return `${change.toFixed(2)}% 📉`;
    return '0.00% ➡️';
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Glow effect for active card */}
      {isActive && (
        <Animated.View style={[styles.glow, glowStyle]} />
      )}
      
      <TouchableOpacity
        style={styles.card}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Decorative background elements */}
        <View style={styles.backgroundElements}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.walletInfo}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <WalletIcon color="white" size={20} />
            </View>
            <Text style={styles.walletName}>{wallet.name}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.menuButton}
            onPress={handleMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreVertical color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Balance 💎</Text>
          <Text style={styles.balance}>{formatBalance(balance)}</Text>
          <Text style={styles.balanceUSD}>${balanceUSD.toLocaleString()}</Text>
        </View>

        {/* Price Change Section */}
        <View style={styles.priceChangeSection}>
          <View style={styles.priceChangeRow}>
            <TrendingUp color="white" size={16} />
            <Text style={styles.priceChangeText}>
              {formatPriceChange(priceChange)}
            </Text>
          </View>
        </View>

        {/* Active indicator */}
        {isActive && (
          <Animated.View style={[styles.activeIndicator, sparkleStyle]}>
            <Sparkles color="white" size={16} />
            <Text style={styles.activeText}>Active</Text>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: 10,
  },
  glow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: CARD_HEIGHT / 2,
    backgroundColor: '#FF6B6B',
    opacity: 0.3,
    zIndex: -1,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  circle1: {
    width: 80,
    height: 80,
    top: -20,
    right: -20,
  },
  circle2: {
    width: 60,
    height: 60,
    bottom: -10,
    left: -10,
  },
  circle3: {
    width: 40,
    height: 40,
    top: '50%',
    right: '10%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  balanceSection: {
    flex: 1,
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  balanceUSD: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  priceChangeSection: {
    marginTop: 'auto',
  },
  priceChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceChangeText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 6,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
});