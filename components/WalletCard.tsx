import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { Wallet, getWalletTypeDisplayName } from '@/types/wallet';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Edit3, MoreHorizontal, Trash2 } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Enhanced function to generate gradient colors from a base color
function generateGradientColors(baseColor: string): [string, string, string] {
  // Convert hex to RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Create a lighter version (add 40 to each component, max 255)
  const lighterR = Math.min(255, r + 40);
  const lighterG = Math.min(255, g + 40);
  const lighterB = Math.min(255, b + 40);
  
  // Create a darker version (subtract 50 from each component, min 0)
  const darkerR = Math.max(0, r - 50);
  const darkerG = Math.max(0, g - 50);
  const darkerB = Math.max(0, b - 50);
  
  const lighterColor = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
  const darkerColor = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
  
  return [baseColor, lighterColor, darkerColor];
}

interface WalletCardProps {
  wallet?: Wallet;
  isActive?: boolean;
  onPress?: () => void;
  onEdit?: (wallet: Wallet) => void;
}

export default function WalletCard({ wallet, isActive = false, onPress, onEdit }: WalletCardProps) {
  const { currentWallet, balance, balanceUSD, hasBalanceError, hasPriceError, formatCurrency, hideBalance, deleteWallet } = useWallet();
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuButtonRef = useRef<View>(null);

  // Use provided wallet or fall back to current wallet
  const displayWallet = wallet || currentWallet;
  
  if (!displayWallet) return null;

  // Generate enhanced gradient colors based on wallet color
  const [baseColor, lightColor, darkColor] = generateGradientColors(displayWallet.color);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={[baseColor, lightColor, darkColor]}
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
            onPress={() => {
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
            }} 
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
      </LinearGradient>
      
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
          }]}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                if (onEdit && displayWallet) {
                  onEdit(displayWallet);
                }
              }}
              testID="edit-wallet-button"
            >
              <Edit3 color="#333333" size={20} />
              <Text style={[styles.menuText, { color: '#333333' }]}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
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
              }}
              testID="delete-wallet-button"
            >
              <Trash2 color="#FF3B30" size={20} />
              <Text style={[styles.menuText, { color: '#FF3B30' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: platformStyles.borderRadius.xl,
    padding: platformStyles.spacing.xl,
    width: 320,
    height: 160,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    ...platformStyles.cardShadow,
  },
  activeCard: {
    transform: [{ scale: 1.02 }],
    ...platformStyles.cardShadow,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    ...platformStyles.typography.subtitle,
    maxWidth: 200,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  walletTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: platformStyles.spacing.xs,
    gap: 6,
  },
  walletType: {
    color: 'rgba(255, 255, 255, 0.9)',
    ...platformStyles.typography.caption,
    fontWeight: '500',
  },
  menuButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.sm,
    zIndex: 1,
  },
  balance: {
    color: 'white',
    ...platformStyles.typography.heading,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  balanceUSD: {
    color: 'rgba(255, 255, 255, 0.95)',
    ...platformStyles.typography.bodyLarge,
    fontWeight: '600',
    marginTop: platformStyles.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  footer: {
    alignItems: 'flex-end',
    zIndex: 1,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: platformStyles.spacing.sm,
    paddingVertical: platformStyles.spacing.xs,
    borderRadius: platformStyles.borderRadius.round,
    gap: 4,
  },
  activeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: platformStyles.borderRadius.medium,
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