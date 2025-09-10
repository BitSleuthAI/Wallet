import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Copy } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as bitcoinService from '@/services/bitcoin-service';
import { GradientBackground } from '@/components/GradientBackground';
import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';

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
  const { theme } = useWallet();
  const router = useRouter();
  const { address } = useLocalSearchParams<{ address: string }>();
  
  // Fetch address balance
  const balanceQuery = useQuery({
    queryKey: ['address-balance', address],
    queryFn: () => bitcoinService.getAddressBalance(address!),
    enabled: !!address,
  });

  // Fetch address transactions
  const transactionsQuery = useQuery({
    queryKey: ['address-transactions', address],
    queryFn: () => bitcoinService.getAddressTransactions(address!),
    enabled: !!address,
  });

  // Process transactions to determine type and amount for this address
  const processedTransactions = useMemo(() => {
    if (!transactionsQuery.data || !address) return [];
    
    return transactionsQuery.data.map((tx: Transaction) => {
      let type: 'sent' | 'received' = 'received';
      let amount = 0;
      
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
  }, [transactionsQuery.data, address]);

  const formatBTC = (satoshis: number) => {
    return (satoshis / 100000000).toFixed(8);
  };

  const formatGBP = (satoshis: number) => {
    // Mock conversion rate - in real app, fetch from API
    const btcAmount = satoshis / 100000000;
    const gbpRate = 75000; // Mock rate
    return (btcAmount * gbpRate).toFixed(2);
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
            <View style={styles.bitcoinIcon}>
              <Text style={styles.bitcoinSymbol}>₿</Text>
            </View>
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
              Bitcoin Address ({processedTransactions.length} transactions)
            </Text>
          </View>

          {/* Balance Card */}
          <View style={[styles.balanceCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.balanceLabel, { color: theme.colors.text }]}>
              Address Balance
            </Text>
            {balanceQuery.isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={styles.balanceLoader} />
            ) : (
              <>
                <Text style={[styles.balanceGBP, { color: theme.colors.text }]}>
                  £{formatGBP(balanceQuery.data || 0)}
                </Text>
                <Text style={[styles.balanceBTC, { color: theme.colors.textSecondary }]}>
                  {formatBTC(balanceQuery.data || 0)} BTC
                </Text>
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
            {transactionsQuery.isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Loading transactions...
                </Text>
              </View>
            ) : processedTransactions.length > 0 ? (
              processedTransactions.map((tx, index) => (
                <View key={tx.txid} style={[styles.transactionItem, index < processedTransactions.length - 1 && styles.transactionBorder]}>
                  <View style={styles.transactionDetails}>
                    <View style={styles.transactionIcon}>
                      {tx.type === 'sent' ? (
                        <ArrowUpRight size={16} color={theme.colors.primary} />
                      ) : (
                        <ArrowDownLeft size={16} color={theme.colors.primary} />
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
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No transactions found for this address
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
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
  bitcoinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bitcoinSymbol: {
    color: 'white',
    fontSize: 20,
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
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
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
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
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
});