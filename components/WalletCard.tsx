import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreHorizontal, Check } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';
import { Wallet } from '@/types/wallet';
import { platformStyles } from '@/constants/themes';

// Function to generate gradient colors from a base color
function generateGradientColors(baseColor: string): [string, string] {
  // Convert hex to RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Create a lighter version (add 30 to each component, max 255)
  const lighterR = Math.min(255, r + 30);
  const lighterG = Math.min(255, g + 30);
  const lighterB = Math.min(255, b + 30);
  
  // Create a darker version (subtract 40 from each component, min 0)
  const darkerR = Math.max(0, r - 40);
  const darkerG = Math.max(0, g - 40);
  const darkerB = Math.max(0, b - 40);
  
  const lighterColor = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
  const darkerColor = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
  
  return [lighterColor, darkerColor];
}

interface WalletCardProps {
  wallet?: Wallet;
  isActive?: boolean;
  onPress?: () => void;
}

export default function WalletCard({ wallet, isActive = false, onPress }: WalletCardProps) {
  const { currentWallet, balance, balanceUSD, hasBalanceError, hasPriceError, formatCurrency, hideBalance } = useWallet();

  // Use provided wallet or fall back to current wallet
  const displayWallet = wallet || currentWallet;
  
  if (!displayWallet) return null;

  // Generate gradient colors based on wallet color
  const [lightColor, darkColor] = generateGradientColors(displayWallet.color);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={[lightColor, darkColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.walletName}>{displayWallet.name}</Text>
            <Text style={styles.walletType}>P2WPKH</Text>
          </View>
          <TouchableOpacity>
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
          {isActive && <Check color="white" size={20} />}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: platformStyles.borderRadius.large,
    padding: platformStyles.spacing.xl,
    width: 320,
    height: 160,
    justifyContent: 'space-between',
    ...platformStyles.cardShadow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walletName: {
    color: 'white',
    ...platformStyles.typography.subtitle,
    maxWidth: 200,
  },
  walletType: {
    color: 'rgba(255, 255, 255, 0.8)',
    ...platformStyles.typography.caption,
    marginTop: platformStyles.spacing.xs,
  },
  balanceContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.sm,
  },
  balance: {
    color: 'white',
    ...platformStyles.typography.heading,
  },
  balanceUSD: {
    color: 'rgba(255, 255, 255, 0.9)',
    ...platformStyles.typography.bodyLarge,
    fontWeight: '500',
    marginTop: platformStyles.spacing.xs,
  },
  footer: {
    alignItems: 'flex-end',
  },
});