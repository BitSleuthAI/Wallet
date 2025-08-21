import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { Transaction } from '@/types/wallet';
import { useWallet } from '@/hooks/wallet-store';
import { platformStyles } from '@/constants/themes';

interface TransactionItemProps {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const { theme, bitcoinPrice, hasPriceError, formatCurrency } = useWallet();
  
  const isReceived = transaction.type === 'received';
  const amountUSD = !hasPriceError && bitcoinPrice?.usd ? transaction.amount * bitcoinPrice.usd : 0;
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const handlePress = () => {
    router.push({
      pathname: '/transaction-details',
      params: { txid: transaction.txid },
    });
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: isReceived ? theme.colors.success : theme.colors.error }
      ]}>
        {isReceived ? (
          <ArrowDownLeft color="white" size={20} />
        ) : (
          <ArrowUpRight color="white" size={20} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.type, { color: theme.colors.text }]}>
            {isReceived ? 'Received' : 'Sent'}
          </Text>
          <Text style={[
            styles.amount,
            { color: isReceived ? theme.colors.success : theme.colors.error }
          ]}>
            {isReceived ? '+' : '-'}{transaction.amount.toFixed(8)} BTC
          </Text>
        </View>

        <View style={styles.details}>
          <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
            {formatDate(transaction.timestamp)}
          </Text>
          {!hasPriceError && amountUSD > 0 ? (
            <Text style={[styles.amountUSD, { color: theme.colors.textSecondary }]}>
              {isReceived ? '+' : '-'}{formatCurrency(amountUSD, false)}
            </Text>
          ) : (
            <Text style={[styles.amountUSD, { color: theme.colors.textSecondary }]}>
              Fiat unavailable
            </Text>
          )}
        </View>

        <View style={styles.statusRow}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: transaction.status === 'confirmed' ? theme.colors.success : '#FFA500' }
          ]}>
            <Text style={styles.statusText}>
              {transaction.status === 'confirmed' ? 'Completed' : 'Pending'}
            </Text>
          </View>
        </View>

        <Text style={[styles.address, { color: theme.colors.textSecondary }]}>
          {isReceived ? 'From' : 'To'}: {truncateAddress(transaction.address)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: platformStyles.spacing.lg,
    marginHorizontal: platformStyles.spacing.xl,
    marginVertical: platformStyles.spacing.xs,
    borderRadius: platformStyles.borderRadius.medium,
    alignItems: 'flex-start',
    ...platformStyles.shadow,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.xs,
  },
  type: {
    ...platformStyles.typography.bodyLarge,
    fontWeight: '600',
  },
  amount: {
    ...platformStyles.typography.bodyLarge,
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.sm,
  },
  date: {
    ...platformStyles.typography.body,
  },
  amountUSD: {
    ...platformStyles.typography.body,
  },
  statusRow: {
    marginBottom: platformStyles.spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: platformStyles.spacing.sm,
    paddingVertical: platformStyles.spacing.xs,
    borderRadius: platformStyles.borderRadius.medium,
  },
  statusText: {
    color: 'white',
    ...platformStyles.typography.caption,
    fontWeight: '500',
  },
  address: {
    ...platformStyles.typography.caption,
    marginTop: platformStyles.spacing.xs,
  },
});