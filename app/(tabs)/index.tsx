import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';
import WalletCard from '@/components/WalletCard';
import TransactionItem from '@/components/TransactionItem';
import PriceChart from '@/components/PriceChart';

export default function WalletScreen() {
  const {
    currentWallet,
    balance,
    balanceUSD,
    bitcoinPrice,
    transactions,
    theme,
    refreshData,
  } = useWallet();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const formatPriceChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  if (!currentWallet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'Wallet', headerShown: false }} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Wallet Found
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Create or import a wallet to get started
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Wallet', headerShown: false }} />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.colors.text }]}>
              {currentWallet.name}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Wallet balance
            </Text>
          </View>
          
          <View style={styles.priceContainer}>
            <View style={styles.bitcoinInfo}>
              <View style={styles.bitcoinIcon}>
                <Text style={styles.bitcoinSymbol}>₿</Text>
              </View>
              <View>
                <Text style={[styles.bitcoinLabel, { color: theme.colors.textSecondary }]}>
                  BTC Bitcoin
                </Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.bitcoinPrice, { color: theme.colors.text }]}>
                    ${bitcoinPrice?.usd.toLocaleString() || '0'}
                  </Text>
                  <Text style={[
                    styles.priceChange,
                    { color: (bitcoinPrice?.usd_24h_change || 0) >= 0 ? theme.colors.success : theme.colors.error }
                  ]}>
                    {formatPriceChange(bitcoinPrice?.usd_24h_change || 0)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Wallet Card */}
        <WalletCard />

        {/* Balance Display */}
        <View style={styles.balanceSection}>
          <Text style={[styles.mainBalance, { color: theme.colors.text }]}>
            ${balanceUSD.toFixed(2)}
          </Text>
          <Text style={[styles.btcBalance, { color: theme.colors.textSecondary }]}>
            {balance.toFixed(8)} BTC
          </Text>
          <View style={styles.changeContainer}>
            <TrendingUp color={theme.colors.success} size={16} />
            <Text style={[styles.changeText, { color: theme.colors.success }]}>
              ${(balanceUSD * 0.0143).toFixed(2)} (1.43%) 24h
            </Text>
          </View>
        </View>

        {/* Time Period Selector */}
        <View style={styles.periodSelector}>
          {['1D', '1W', '1M', '1Y', 'All'].map((period, index) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                index === 2 && { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={[
                styles.periodText,
                { color: index === 2 ? 'white' : theme.colors.textSecondary }
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Chart */}
        <PriceChart />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}>
            <ArrowUpRight color="white" size={20} />
            <Text style={styles.actionButtonText}>Send</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.receiveButton, { backgroundColor: theme.colors.surface }]}>
            <ArrowDownLeft color={theme.colors.text} size={20} />
            <Text style={[styles.receiveButtonText, { color: theme.colors.text }]}>Receive</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Transactions
            </Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {transactions.slice(0, 5).map((transaction) => (
            <TransactionItem
              key={transaction.txid}
              transaction={transaction}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  bitcoinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bitcoinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bitcoinSymbol: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bitcoinLabel: {
    fontSize: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bitcoinPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  mainBalance: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  btcBalance: {
    fontSize: 16,
    marginTop: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  changeText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  receiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  receiveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  transactionsSection: {
    marginTop: 30,
    paddingBottom: 20,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});