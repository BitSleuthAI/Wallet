import { platformStyles } from '@/constants/themes';
import { PressableOpacity } from '@/components/PressableOpacity';
import { getWalletGradient } from '@/constants/wallet-colors';
import { useTheme } from '@/hooks/theme-store';
import { WalletsContext, useWalletActions, useWalletBalance, useWalletSettings, useWallets } from '@/hooks/wallet-contexts';
import { HapticService } from '@/services/haptic-service';
import { Wallet, getWalletTypeDisplayName } from '@/types/wallet';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit3, MoreHorizontal, Trash2 } from 'lucide-react-native';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Default gradient colors for fallback - Bitcoin orange, matching the brand
const DEFAULT_GRADIENT = ['#FFAB40', '#F7931A'] as const;

interface WalletCardProps {
  wallet?: Wallet;
  isActive?: boolean;
  onPress?: () => void;
  onEdit?: (wallet: Wallet) => void;
}

// Wrapper component that checks for context availability. Subscribes only to
// the low-churn wallets slice so the gate itself doesn't re-render on polls.
export default function WalletCard({ wallet, isActive = false, onPress, onEdit }: WalletCardProps) {
  const walletData = useContext(WalletsContext);

  if (!walletData) {
    return null;
  }

  return <WalletCardContent wallet={wallet} isActive={isActive} onPress={onPress} onEdit={onEdit} />;
}

function WalletCardContent({ wallet, isActive = false, onPress, onEdit }: WalletCardProps) {
  // Narrow subscriptions: keeps genuine balance churn, sheds tx/utxo/feedback churn
  const { currentWallet } = useWallets();
  const { balance, balanceUSD, hasBalanceError, hasPriceError } = useWalletBalance();
  const { formatCurrency, deleteWallet } = useWalletActions();
  const { hideBalance } = useWalletSettings();
  const { theme } = useTheme();

  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuButtonRef = useRef<View>(null);

  // Animation values
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const glowOpacity = useSharedValue(isActive ? 0.3 : 0);
  // Decorative circles parallax
  const circleTranslateX = useSharedValue(0);
  const circleTranslateY = useSharedValue(0);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { scale: scale.value },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Parallax effect for decorative circles
  const animatedCircle1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: circleTranslateX.value * 0.8 },
      { translateY: circleTranslateY.value * 0.8 },
    ],
  }));

  const animatedCircle2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -circleTranslateX.value * 0.5 },
      { translateY: -circleTranslateY.value * 0.5 },
    ],
  }));

  const displayWallet = wallet || currentWallet;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gradientColors = useMemo(() => displayWallet ? getWalletGradient(displayWallet.color) : DEFAULT_GRADIENT, [displayWallet?.color]);

  React.useEffect(() => {
    glowOpacity.value = withSpring(isActive ? 0.4 : 0, { damping: 15, stiffness: 200 });
  }, [isActive, glowOpacity]);

  const handleMenuPress = useCallback(() => {
    HapticService.light();
    menuButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      const menuWidth = 150;
      const padding = 20;
      const menuX = pageX - menuWidth + width - padding;

      setMenuPosition({
        x: Math.max(padding, menuX),
        y: pageY + height + 5
      });
      setShowMenu(true);
    });
  }, []);

  const handleEditPress = useCallback(() => {
    setShowMenu(false);
    HapticService.light();
    if (onEdit && displayWallet) {
      onEdit(displayWallet);
    }
  }, [onEdit, displayWallet]);

  const handleDeletePress = useCallback(() => {
    setShowMenu(false);
    HapticService.warning();
    if (displayWallet) {
      Alert.alert(
        'Delete Wallet',
        `Are you sure you want to delete "${displayWallet.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              HapticService.error();
              deleteWallet(displayWallet.id);
            }
          }
        ]
      );
    }
  }, [displayWallet, deleteWallet]);

  const handlePressIn = useCallback(() => {
    HapticService.light();
    scale.value = withSpring(0.96, { damping: 12, stiffness: 400 });
    // Subtle 3D tilt on press
    rotateX.value = withSpring(2, { damping: 15, stiffness: 300 });
    circleTranslateX.value = withSpring(3, { damping: 15, stiffness: 300 });
    circleTranslateY.value = withSpring(2, { damping: 15, stiffness: 300 });
  }, [scale, rotateX, circleTranslateX, circleTranslateY]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    rotateX.value = withSpring(0, { damping: 15, stiffness: 300 });
    rotateY.value = withSpring(0, { damping: 15, stiffness: 300 });
    circleTranslateX.value = withSpring(0, { damping: 15, stiffness: 300 });
    circleTranslateY.value = withSpring(0, { damping: 15, stiffness: 300 });
  }, [scale, rotateX, rotateY, circleTranslateX, circleTranslateY]);

  const handlePress = useCallback(() => {
    if (onPress) {
      HapticService.medium();
      scale.value = withSequence(
        withSpring(1.03, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 400 })
      );
      // Quick tilt bounce on selection
      rotateY.value = withSequence(
        withTiming(3, { duration: 100 }),
        withSpring(0, { damping: 12, stiffness: 300 })
      );
      onPress();
    }
  }, [onPress, scale, rotateY]);

  if (!displayWallet) return null;

  return (
    <AnimatedTouchable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={0.95}
      style={animatedCardStyle}
    >
      {/* Glow effect for active card */}
      {isActive && (
        <Animated.View
          style={[
            styles.glowEffect,
            { backgroundColor: gradientColors[1] + '40' },
            animatedGlowStyle,
          ]}
        />
      )}
      <AnimatedLinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, isActive && styles.activeCard]}
      >
        {/* Animated decorative elements with parallax */}
        <Animated.View style={[styles.decorativeCircle1, animatedCircle1Style]} />
        <Animated.View style={[styles.decorativeCircle2, animatedCircle2Style]} />
        {/* Additional decorative element for depth */}
        <View style={styles.decorativeCircle3} />

        <View style={styles.header}>
          <View style={styles.walletInfo}>
            <Text style={styles.walletName} numberOfLines={1}>{displayWallet.name}</Text>
            <View style={styles.walletTypeContainer}>
              <View style={styles.walletTypePill}>
                <Text style={styles.walletType}>{getWalletTypeDisplayName(displayWallet.type)}</Text>
              </View>
            </View>
          </View>
          <PressableOpacity
            ref={menuButtonRef}
            style={styles.menuButton}
            onPress={handleMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="wallet-menu-button"
          >
            <MoreHorizontal color="white" size={22} />
          </PressableOpacity>
        </View>

        <View style={styles.balanceContainer}>
          {hasBalanceError ? (
            <>
              <Text style={styles.balance}>Balance unavailable</Text>
              <Text style={styles.balanceUSD}>Network error</Text>
            </>
          ) : hideBalance ? (
            <>
              <Text style={styles.balance}>••••••••</Text>
              <Text style={styles.balanceUSD}>Balance hidden</Text>
            </>
          ) : (
            <>
              <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {balance.toFixed(8)} BTC
              </Text>
              <Text style={styles.balanceUSD}>
                {hasPriceError ? 'Fiat value unavailable' : formatCurrency(balanceUSD)}
              </Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          {isActive && (
            <View style={styles.activeIndicator}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>
      </AnimatedLinearGradient>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <PressableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, {
            position: 'absolute',
            top: menuPosition.y,
            left: menuPosition.x,
            backgroundColor: theme.colors.surface,
          }]}>
            <PressableOpacity
              style={styles.menuItem}
              onPress={handleEditPress}
              testID="edit-wallet-button"
            >
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                <Edit3 color={theme.colors.primary} size={16} />
              </View>
              <Text style={[styles.menuText, { color: theme.colors.text }]}>Edit</Text>
            </PressableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme.colors.border }]} />

            <PressableOpacity
              style={styles.menuItem}
              onPress={handleDeletePress}
              testID="delete-wallet-button"
            >
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.error + '15' }]}>
                <Trash2 color={theme.colors.error} size={16} />
              </View>
              <Text style={[styles.menuText, { color: theme.colors.error }]}>Delete</Text>
            </PressableOpacity>
          </View>
        </PressableOpacity>
      </Modal>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: platformStyles.borderRadius.xxxl,
    padding: platformStyles.spacing.xxl,
    width: 340,
    height: 200,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    ...platformStyles.cardShadow,
  },
  activeCard: {
    ...platformStyles.cardShadow,
  },
  glowEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: platformStyles.borderRadius.xxl + 10,
    zIndex: -1,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: 60,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    maxWidth: 220,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.2,
  },
  walletTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: platformStyles.spacing.sm,
    gap: 8,
  },
  walletTypePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  walletType: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  balanceContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.md,
    zIndex: 1,
  },
  balance: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: -0.5,
  },
  balanceUSD: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 17,
    fontWeight: '600',
    marginTop: platformStyles.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: 'flex-end',
    zIndex: 1,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: platformStyles.spacing.md + 2,
    paddingVertical: platformStyles.spacing.xs + 3,
    borderRadius: platformStyles.borderRadius.round,
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  activeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    borderRadius: platformStyles.borderRadius.xl,
    padding: platformStyles.spacing.sm,
    minWidth: 160,
    ...platformStyles.cardShadow,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.md,
    borderRadius: platformStyles.borderRadius.medium,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.md,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: platformStyles.spacing.md,
  },
  menuText: {
    ...platformStyles.typography.body,
    fontWeight: '600',
  },
});
