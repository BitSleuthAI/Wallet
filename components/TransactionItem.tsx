import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { Transaction } from '@/types/wallet';
import { useWallet } from '@/hooks/wallet-store';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

export default function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const { theme, bitcoinPrice, hasPriceError } = useWallet();
  
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

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
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
              {isReceived ? '+' : '-'}${amountUSD.toFixed(2)}
            </Text>
          ) : (
            <Text style={[styles.amountUSD, { color: theme.colors.textSecondary }]}>
              USD unavailable
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
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  type: {
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
  },
  amountUSD: {
    fontSize: 14,
  },
  statusRow: {
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  address: {
    fontSize: 12,
    marginTop: 4,
  },
});