import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MoreHorizontal, Check } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';

interface WalletCardProps {
  onPress?: () => void;
}

export default function WalletCard({ onPress }: WalletCardProps) {
  const { currentWallet, balance, balanceUSD, theme, hasBalanceError, hasPriceError, formatCurrency } = useWallet();

  if (!currentWallet) return null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.walletName}>{currentWallet.name}</Text>
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
          <Check color="white" size={20} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  walletName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  walletType: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  balanceContainer: {
    marginBottom: 20,
  },
  balance: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  balanceUSD: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    marginTop: 4,
  },
  footer: {
    alignItems: 'flex-end',
  },
});