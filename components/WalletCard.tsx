import { platformStyles } from '@/constants/themes';
import { getWalletGradient } from '@/constants/wallet-colors';
import { useWallet } from '@/hooks/wallet-store';
import HapticService from '@/services/haptic-service';
import { Wallet, getWalletTypeDisplayName } from '@/types/wallet';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Edit3, MoreHorizontal, Trash2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Default gradient colors for fallback
const DEFAULT_GRADIENT = ['#6366F1', '#8B5CF6'] as const; // Indigo gradient

interface WalletCardProps {
  wallet?: Wallet;
  isActive?: boolean;
  onPress?: () => void;
  onEdit?: (wallet: Wallet) => void;
}

// Wrapper component that checks for context availability
export default function WalletCard({ wallet, isActive = false, onPress, onEdit }: WalletCardProps) {
  const walletContext = useWallet();
  
  // Safety check: if context is not available yet, return null or loading
  if (!walletContext) {
    return null;
  }
  
  return <WalletCardContent wallet={wallet} isActive={isActive} onPress={onPress} onEdit={onEdit} />;
}

// Main component with all hooks
function WalletCardContent({ wallet, isActive = false, onPress, onEdit }: WalletCardProps) {
  const { currentWallet, balance, balanceUSD, hasBalanceError, hasPriceError, formatCurrency, hideBalance, deleteWallet, theme } = useWallet()!; // Non-null assertion is safe here because wrapper checked
  
  // Initialize all hooks
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuButtonRef = useRef<View>(null);

  // Animation values
  const scale = useSharedValue(1);
  const elevation = useSharedValue(isActive ? 8 : 4);
  const glowOpacity = useSharedValue(isActive ? 0.3 : 0);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: 0.2 + (glowOpacity.value * 0.3),
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Use provided wallet or fall back to current wallet
  const displayWallet = wallet || currentWallet;
  
  // Memoize gradient colors to prevent recalculation on every render
  // Only depends on color property to avoid unnecessary recalculations
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gradientColors = useMemo(() => displayWallet ? getWalletGradient(displayWallet.color) : DEFAULT_GRADIENT, [displayWallet?.color]);

  // Update glow effect when active state changes
  React.useEffect(() => {
    glowOpacity.value = withSpring(isActive ? 0.4 : 0, { damping: 15, stiffness: 200 });
    elevation.value = withSpring(isActive ? 12 : 4, { damping: 15, stiffness: 200 });
  }, [isActive, glowOpacity, elevation]);

  // Menu button press handler
  const handleMenuPress = useCallback(() => {
    menuButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      const menuWidth = 150;
      const padding = 20;
      
      // Always position menu to the left of the button with proper spacing
      const menuX = pageX - menuWidth + width - padding;
      
      setMenuPosition({ 
        x: Math.max(padding, menuX), 
        y: pageY + height + 5 
      });
      setShowMenu(true);
    });
  }, []);

  // Edit button press handler
  const handleEditPress = useCallback(() => {
    setShowMenu(false);
    if (onEdit && displayWallet) {
      onEdit(displayWallet);
    }
  }, [onEdit, displayWallet]);

  // Delete button press handler
  const handleDeletePress = useCallback(() => {
    setShowMenu(false);
    if (displayWallet) {
      Alert.alert(
        'Delete Wallet',
        `Are you sure you want to delete "${displayWallet.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => deleteWallet(displayWallet.id)
          }
        ]
      );
    }
  }, [displayWallet, deleteWallet]);

  const handlePressIn = useCallback(() => {
    HapticService.light();
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (onPress) {
      HapticService.medium();
      // Subtle bounce animation
      scale.value = withSequence(
        withSpring(1.02, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 400 })
      );
      onPress();
    }
  }, [onPress, scale]);
  
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
        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        
        <View style={styles.header}>
          <View style={styles.walletInfo}>
            <Text style={styles.walletName}>{displayWallet.name}</Text>
            <View style={styles.walletTypeContainer}>
              <Text style={styles.walletType}>{getWalletTypeDisplayName(displayWallet.type)}</Text>
            </View>
          </View>
          <TouchableOpacity 
            ref={menuButtonRef}
            style={styles.menuButton}
            onPress={handleMenuPress} 
            testID="wallet-menu-button"
          >
            <MoreHorizontal color="white" size={24} />
          </TouchableOpacity>
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
              <Text style={styles.balance}>{balance.toFixed(8)} BTC</Text>
              <Text style={styles.balanceUSD}>
                {hasPriceError ? 'Fiat value unavailable' : formatCurrency(balanceUSD)}
              </Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          {isActive && (
            <View style={styles.activeIndicator}>
              <Check color="white" size={16} />
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
        <TouchableOpacity 
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
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleEditPress}
              testID="edit-wallet-button"
            >
              <Edit3 color="#333333" size={20} />
              <Text style={[styles.menuText, { color: '#333333' }]}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleDeletePress}
              testID="delete-wallet-button"
            >
              <Trash2 color="#FF3B30" size={20} />
              <Text style={[styles.menuText, { color: '#FF3B30' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: platformStyles.borderRadius.xxl,
    padding: platformStyles.spacing.xl,
    width: 320,
    height: 180,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
    fontSize: 20,
    fontWeight: '700',
    maxWidth: 200,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  walletTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: platformStyles.spacing.xs,
    gap: 6,
  },
  walletType: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  menuButton: {
    padding: 6,
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
    fontSize: 26,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  balanceUSD: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 17,
    fontWeight: '600',
    marginTop: platformStyles.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    alignItems: 'flex-end',
    zIndex: 1,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: platformStyles.spacing.md,
    paddingVertical: platformStyles.spacing.xs + 2,
    borderRadius: platformStyles.borderRadius.round,
    gap: 4,
  },
  activeText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    // backgroundColor will be set dynamically via theme.colors.surface
    borderRadius: platformStyles.borderRadius.large,
    padding: platformStyles.spacing.sm,
    minWidth: 150,
    ...platformStyles.cardShadow,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.sm,
  },
  menuText: {
    marginLeft: platformStyles.spacing.sm,
    ...platformStyles.typography.body,
    fontWeight: '500',
  },
});