import TransactionItem from '@/components/TransactionItem';
import { useWallet } from '@/hooks/wallet-store';
import { Stack } from 'expo-router';
import { Clock } from 'lucide-react-native';
import React from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { GradientBackground } from '@/components/GradientBackground';

export default function TransactionHistoryScreen() {
  const { 
    theme, 
    transactions, 
    isLoadingTransactions, 
    hasTransactionsError,
    refreshData,
    currentWallet
  } = useWallet();

  const handleRefresh = async () => {
    await refreshData();
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface }]}>
        <Clock color={theme.colors.textSecondary} size={48} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No Transactions Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        {currentWallet ? 
          'Your transaction history will appear here once you send or receive Bitcoin.' :
          'Please set up a wallet to view transaction history.'
        }
      </Text>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface }]}>
        <Clock color={theme.colors.error} size={48} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.error }]}>
        Failed to Load Transactions
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Pull down to refresh and try again.
      </Text>
    </View>
  );

  return (
    <GradientBackground theme={theme} variant="primary">
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
        options={{ 
          title: 'Transaction History',
          headerStyle: { 
            backgroundColor: 'transparent',
          },
          headerTintColor: theme.colors.text,
          headerTransparent: true,
        }} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingTransactions}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            All Transactions
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Loading State */}
        {isLoadingTransactions && transactions.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading transactions...
            </Text>
          </View>
        )}

        {/* Error State */}
        {hasTransactionsError && transactions.length === 0 && !isLoadingTransactions && (
          <ErrorState />
        )}

        {/* Empty State */}
        {!isLoadingTransactions && !hasTransactionsError && transactions.length === 0 && (
          <EmptyState />
        )}

        {/* Transaction List */}
        {transactions.length > 0 && (
          <View style={styles.transactionsList}>
            {transactions.map((transaction, index) => (
              <TransactionItem
                key={`${transaction.txid}-${index}`}
                transaction={transaction}
              />
            ))}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  transactionsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});