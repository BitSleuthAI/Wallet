import TransactionItem from '@/components/TransactionItem';
import { PressableOpacity } from '@/components/PressableOpacity';
import { useWallet } from '@/hooks/wallet-store';
import { Transaction } from '@/types/wallet';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Clock } from 'lucide-react-native';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ListRenderItemInfo,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { GradientBackground } from '@/components/GradientBackground';
import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';

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

  const keyExtractor = useCallback((transaction: Transaction) => transaction.txid, []);

  const renderTransaction = useCallback(
    ({ item, index }: ListRenderItemInfo<Transaction>) => (
      <TransactionItem transaction={item} index={index} />
    ),
    []
  );

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

  const handleBack = () => {
    router.back();
  };

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <AndroidSafeContainer style={styles.container} enableBottomPadding={false}>
        <Stack.Screen 
          options={{ 
            headerShown: false,
          }} 
        />
        
        {/* Custom Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <PressableOpacity
            style={styles.backButton}
            onPress={handleBack}
            testID="back-button"
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </PressableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Transaction History
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      
      <FlatList
        style={styles.scrollView}
        data={transactions}
        keyExtractor={keyExtractor}
        renderItem={renderTransaction}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingTransactions}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={styles.contentHeader}>
            <Text style={[styles.contentHeaderTitle, { color: theme.colors.text }]}>
              All Transactions
            </Text>
            <Text style={[styles.contentHeaderSubtitle, { color: theme.colors.textSecondary }]}>
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoadingTransactions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading transactions...
              </Text>
            </View>
          ) : hasTransactionsError ? (
            <ErrorState />
          ) : (
            <EmptyState />
          )
        }
        ListFooterComponent={<View style={styles.bottomSpacing} />}
      />
      </AndroidSafeContainer>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  contentHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  contentHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  contentHeaderSubtitle: {
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});
