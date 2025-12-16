import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { platformStyles } from '@/constants/themes';
import { useWallet } from '@/hooks/wallet-store';
import { getAddressStats, getAddressTransactions } from '@/services/esplora-service';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Copy } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Transaction {
  txid: string;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  fee: number;
  vin: {
    txid: string;
    vout: number;
    prevout?: {
      scriptpubkey: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      scriptpubkey_address: string;
      value: number;
    };
  }[];
  vout: {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
  }[];
}

export default function AddressDetailsScreen() {
  const { theme, currentWallet, getAddressStatsCacheValue, setAddressStatsCache, priceQuery, selectedCurrency, getCurrencySymbol } = useWallet();
  const router = useRouter();
  const { address } = useLocalSearchParams<{ address: string }>();
  const [showCopiedModal, setShowCopiedModal] = useState(false);
  const lastBalanceRef = useRef<number | null>(null);
  const lastTransactionsRef = useRef<Transaction[]>([]);
  
  // Fetch address balance using Esplora service
  const balanceQuery = useQuery({
    queryKey: ['address-balance-improved', address],
    queryFn: async () => {
      if (!address) return 0;
      
      console.log('💰 Fetching address balance using Esplora service...');
      const result = await getAddressStats(address);
      
      if (result.error || !result.data) {
        console.warn('❌ Address balance fetch failed:', result.error);
        const cached = getAddressStatsCacheValue(address);
        return cached?.balance ?? 0;
      }
      
      const balance = result.data.chain_stats ? 
        (result.data.chain_stats.funded_txo_sum - result.data.chain_stats.spent_txo_sum) / 1e8 : 0;
      
      console.log('✅ Address balance fetched:', balance, 'BTC');
      setAddressStatsCache(address, { balance });
      return balance;
    },
    enabled: !!address,
  });

  // Fetch address transactions using Esplora service
  const transactionsQuery = useQuery({
    queryKey: ['address-transactions-improved', address],
    queryFn: async () => {
      if (!address) return [];
      
      console.log('📜 Fetching address transactions using Esplora service...');
      const result = await getAddressTransactions(address, currentWallet?.xpub);
      
      if (result.error || !result.data) {
        console.warn('❌ Address transactions fetch failed:', result.error);
        return [];
      }
      
      console.log('✅ Address transactions fetched:', result.data.length, 'transactions');
      return result.data;
    },
    enabled: !!address,
  });

  // Process transactions to determine type and amount for this address
  useEffect(() => {
    if (balanceQuery.data !== undefined && balanceQuery.data !== null) {
      lastBalanceRef.current = balanceQuery.data;
    }
  }, [balanceQuery.data]);

  useEffect(() => {
    if (transactionsQuery.data && Array.isArray(transactionsQuery.data) && transactionsQuery.data.length > 0) {
      lastTransactionsRef.current = transactionsQuery.data as Transaction[];
    }
  }, [transactionsQuery.data]);

  const balance = balanceQuery.data ?? lastBalanceRef.current ?? 0;
  const isInitialBalanceLoading = balanceQuery.isLoading && lastBalanceRef.current === null;
  const isBalanceRefreshing = balanceQuery.isFetching && lastBalanceRef.current !== null;

  const transactions = (transactionsQuery.data as Transaction[] | undefined) ?? lastTransactionsRef.current;
  const isInitialTransactionsLoading = transactionsQuery.isLoading && lastTransactionsRef.current.length === 0;
  const isTransactionsRefreshing = transactionsQuery.isFetching && lastTransactionsRef.current.length > 0;

  const processedTransactions = useMemo(() => {
    if (!transactions || !address) return [];
    
    return transactions.map((tx: Transaction) => {
      let type: 'sent' | 'received';
      let amount: number;
      
      // Check if this address received funds
      const receivedOutputs = tx.vout.filter(output => 
        output.scriptpubkey_address === address
      );
      const receivedAmount = receivedOutputs.reduce((sum, output) => sum + output.value, 0);
      
      // Check if this address sent funds
      const sentInputs = tx.vin.filter(input => 
        input.prevout?.scriptpubkey_address === address
      );
      const sentAmount = sentInputs.reduce((sum, input) => sum + (input.prevout?.value || 0), 0);
      
      // Determine net effect
      const netAmount = receivedAmount - sentAmount;
      
      if (netAmount > 0) {
        type = 'received';
        amount = netAmount;
      } else {
        type = 'sent';
        amount = Math.abs(netAmount);
      }
      
      return {
        ...tx,
        type,
        amount,
        timestamp: tx.status.block_time || Date.now() / 1000,
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, address]);

  const formatBTC = (satoshis: number) => {
    return (satoshis / 100000000).toFixed(8);
  };

  const formatFiat = (satoshis: number) => {
    // Use real exchange rate from wallet store based on selected currency
    const btcAmount = satoshis / 100000000;
    // Get rate for selected currency from price query, fallback to USD if specific currency not available
    const rate = priceQuery?.data?.[selectedCurrency]?.last || priceQuery?.data?.usd || 0;
    return rate > 0 ? (btcAmount * rate).toFixed(2) : '0.00';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const copyAddress = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      setShowCopiedModal(true);
    }
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 20) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-10)}`;
  };

  if (!address) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <AndroidSafeContainer style={styles.container}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            No address provided
          </Text>
        </AndroidSafeContainer>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <AndroidSafeContainer style={styles.container}>
        {/* Custom Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            testID="back-button"
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Address</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Address Header */}
          <View style={styles.addressHeader}>
            <TouchableOpacity onPress={copyAddress} style={styles.addressContainer}>
              <Text style={[styles.addressText, { color: theme.colors.text }]}>
                {truncateAddress(address)}
              </Text>
              <Copy size={16} color={theme.colors.textSecondary} style={styles.copyIcon} />
            </TouchableOpacity>
            <Text style={[styles.addressSubtitle, { color: theme.colors.textSecondary }]}> 
              {`Balance: ${formatBTC(balance)} BTC • ${processedTransactions.length} transactions`}
            </Text>
          </View>

          {/* Balance Card */}
          <View style={[styles.balanceCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.balanceLabel, { color: theme.colors.text }]}>
              Address Balance
            </Text>
            {isInitialBalanceLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={styles.balanceLoader} />
            ) : (
              <>
                <Text style={[styles.balanceGBP, { color: theme.colors.text }]}>
                  {getCurrencySymbol()}{formatFiat(balance)}
                </Text>
                <Text style={[styles.balanceBTC, { color: theme.colors.textSecondary }]}>
                  {formatBTC(balance)} BTC
                </Text>
                {isBalanceRefreshing && (
                  <View style={styles.refreshRow}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.refreshText, { color: theme.colors.textSecondary }]}>Refreshing…</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Transactions Section */}
          <View style={styles.transactionsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Address Transactions ({processedTransactions.length})
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              A list of all transactions involving this specific address.
            </Text>

            {/* Transaction Headers */}
            <View style={styles.transactionHeaders}>
              <Text style={[styles.headerText, { color: theme.colors.textSecondary }]}>Details</Text>
              <Text style={[styles.headerText, { color: theme.colors.textSecondary }]}>Amount{"\n"}(BTC)</Text>
              <Text style={[styles.headerText, { color: theme.colors.textSecondary }]}>Status</Text>
            </View>

            {/* Transaction List */}
            {isInitialTransactionsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Loading transactions...
                </Text>
              </View>
            ) : processedTransactions.length > 0 ? (
              <>
                {isTransactionsRefreshing && (
                  <View style={styles.refreshRow}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.refreshText, { color: theme.colors.textSecondary }]}>Refreshing…</Text>
                  </View>
                )}
                {processedTransactions.map((tx, index) => (
                <View key={tx.txid} style={[styles.transactionItem, index < processedTransactions.length - 1 && styles.transactionBorder]}>
                  <View style={styles.transactionDetails}>
                    <View style={[styles.transactionIcon, { 
                      backgroundColor: tx.type === 'sent' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)' 
                    }]}>
                      {tx.type === 'sent' ? (
                        <ArrowUpRight size={16} color="#EF4444" />
                      ) : (
                        <ArrowDownLeft size={16} color="#22C55E" />
                      )}
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={[styles.transactionType, { color: theme.colors.text }]}>
                        {tx.type === 'sent' ? 'Sent' : 'Received'}
                      </Text>
                      <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
                        {formatDate(tx.timestamp)}, {formatTime(tx.timestamp)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.transactionAmount}>
                    <Text style={[
                      styles.amountBTC,
                      { color: tx.type === 'sent' ? theme.colors.error : theme.colors.success }
                    ]}>
                      {tx.type === 'sent' ? '-' : '+'}{formatBTC(tx.amount)}{"\n"}BTC
                    </Text>
                  </View>
                  
                  <View style={styles.transactionStatus}>
                    <View style={[styles.statusBadge, { backgroundColor: theme.colors.success + '20' }]}>
                      <Text style={[styles.statusText, { color: theme.colors.success }]}>
                        Confirmed
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No transactions found for this address
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Copied Modal */}
        <Modal
          visible={showCopiedModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCopiedModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setShowCopiedModal(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Copied</Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>Copied to clipboard</Text>
              <TouchableOpacity
                style={[styles.modalButton, { borderTopColor: theme.colors.border }]}
                onPress={() => setShowCopiedModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.primary }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingTop: 20,
  },
  addressHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyIcon: {
    marginLeft: 8,
  },
  addressSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  balanceCard: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
    marginBottom: 30,
    ...platformStyles.cardShadow,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  balanceGBP: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceBTC: {
    fontSize: 16,
  },
  balanceLoader: {
    marginVertical: 20,
  },
  transactionsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  transactionHeaders: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  transactionDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    flex: 1,
    alignItems: 'center',
  },
  amountBTC: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  transactionStatus: {
    flex: 1,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 14,
    overflow: 'hidden',
    ...platformStyles.buttonShadow,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  modalButton: {
    borderTopWidth: 1,
    paddingVertical: 16,
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  refreshText: {
    fontSize: 14,
  },
});