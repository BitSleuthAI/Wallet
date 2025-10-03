import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { Transaction } from '@/types/wallet';
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Clock, DollarSign, Zap } from 'lucide-react-native';
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
      pathname: '/transaction-explorer',
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
          <ArrowDownLeft color="white" size={18} />
        ) : (
          <ArrowUpRight color="white" size={18} />
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
          
          {/* RBF and CPFP Indicators */}
          <View style={styles.featureIndicators}>
            {transaction.rbf && (
              <View style={[styles.featureBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                <Zap color={theme.colors.warning} size={12} />
                <Text style={[styles.featureText, { color: theme.colors.warning }]}>
                  RBF
                </Text>
              </View>
            )}
            {transaction.cpfp && (
              <View style={[styles.featureBadge, { backgroundColor: theme.colors.success + '20' }]}>
                <DollarSign color={theme.colors.success} size={12} />
                <Text style={[styles.featureText, { color: theme.colors.success }]}>
                  CPFP
                </Text>
              </View>
            )}
            {transaction.childTxids && transaction.childTxids.length > 0 && (
              <View style={[styles.featureBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <DollarSign color={theme.colors.primary} size={12} />
                <Text style={[styles.featureText, { color: theme.colors.primary }]}>
                  Parent
                </Text>
              </View>
            )}
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
    padding: platformStyles.spacing.md,
    marginVertical: platformStyles.spacing.xs,
    marginHorizontal: platformStyles.spacing.xs,
    borderRadius: platformStyles.borderRadius.medium,
    alignItems: 'flex-start',
    ...platformStyles.shadow,
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.sm,
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
    ...platformStyles.typography.body,
    fontWeight: '600',
  },
  amount: {
    ...platformStyles.typography.body,
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.sm,
  },
  date: {
    ...platformStyles.typography.caption,
    fontWeight: '500',
  },
  amountUSD: {
    ...platformStyles.typography.caption,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.xs,
  },
  statusBadge: {
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
  featureIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  featureText: {
    ...platformStyles.typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  address: {
    ...platformStyles.typography.caption,
    marginTop: platformStyles.spacing.xs,
    fontWeight: '500',
  },
});