import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { Transaction } from '@/types/wallet';
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Clock } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

  const getStatusIcon = () => {
    if (transaction.status === 'confirmed') {
      return <CheckCircle color="white" size={16} />;
    }
    return <Clock color="white" size={16} />;
  };

  const getStatusColor = () => {
    if (transaction.status === 'confirmed') {
      return theme.colors.success;
    }
    return theme.colors.warning;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.colors.surface,
          borderLeftWidth: 4,
          borderLeftColor: isReceived ? theme.colors.success : theme.colors.error,
        }
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        { 
          backgroundColor: isReceived ? theme.colors.success : theme.colors.error,
          shadowColor: isReceived ? theme.colors.success : theme.colors.error,
        }
      ]}>
        {isReceived ? (
          <ArrowDownLeft color="white" size={20} />
        ) : (
          <ArrowUpRight color="white" size={20} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <Text style={[styles.type, { color: theme.colors.text }]}>
              {isReceived ? 'Received' : 'Sent'}
            </Text>
          </View>
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
              {isReceived ? '+' : '-'}{formatCurrency(amountUSD)}
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
            { backgroundColor: getStatusColor() }
          ]}>
            {getStatusIcon()}
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
    position: 'relative',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.md,
    ...platformStyles.shadow,
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
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  type: {
    ...platformStyles.typography.bodyLarge,
    fontWeight: '700',
  },
  amount: {
    ...platformStyles.typography.bodyLarge,
    fontWeight: '700',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.sm,
  },
  date: {
    ...platformStyles.typography.body,
    fontWeight: '500',
  },
  amountUSD: {
    ...platformStyles.typography.body,
    fontWeight: '500',
  },
  statusRow: {
    marginBottom: platformStyles.spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: platformStyles.spacing.sm,
    paddingVertical: platformStyles.spacing.xs,
    borderRadius: platformStyles.borderRadius.medium,
    gap: 4,
  },
  statusText: {
    color: 'white',
    ...platformStyles.typography.caption,
    fontWeight: '600',
  },
  address: {
    ...platformStyles.typography.caption,
    marginTop: platformStyles.spacing.xs,
    fontWeight: '500',
  },
});