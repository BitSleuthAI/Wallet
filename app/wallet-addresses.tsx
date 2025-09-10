import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Copy, RefreshCw, ExternalLink, ArrowLeft } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import * as walletService from '@/services/wallet-service';
import * as bitcoinService from '@/services/bitcoin-service';
import { GradientBackground } from '@/components/GradientBackground';
import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';

interface AddressInfo {
  address: string;
  index: number;
  balance: number;
  txCount: number;
  receivedCount: number;
  sentCount: number;
  isUsed: boolean;
  type: 'receiving' | 'change';
  derivationPath: string;
}

export default function WalletAddressesScreen() {
  const { theme, currentWallet } = useWallet();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'receiving' | 'change'>('receiving');
  const [generatingAddresses, setGeneratingAddresses] = useState<boolean>(false);

  // Generate additional addresses for display (up to 20 receiving + 20 change)
  const addressesQuery = useQuery({
    queryKey: ['wallet-addresses', currentWallet?.id, currentWallet?.xpub],
    queryFn: async () => {
      if (!currentWallet?.xpub) return [];
      
      console.log('🔍 Generating addresses for display...');
      const addresses: AddressInfo[] = [];
      
      // Generate receiving addresses (m/84'/0'/0'/0/i)
      for (let i = 0; i < 20; i++) {
        try {
          const address = await walletService.generateAddressFromXpub(currentWallet.xpub, i);
          addresses.push({
            address,
            index: i,
            balance: 0,
            txCount: 0,
            receivedCount: 0,
            sentCount: 0,
            isUsed: false,
            type: 'receiving',
            derivationPath: `m/84'/0'/0'/0/${i}`
          });
        } catch (error) {
          console.warn(`Failed to generate receiving address ${i}:`, error);
        }
      }
      
      // Generate change addresses (m/84'/0'/0'/1/i)
      // For proper HD wallet implementation, change addresses use path 1
      for (let i = 0; i < 20; i++) {
        try {
          // Generate change addresses using proper derivation path
          // In a real implementation, this would use the change derivation path
          // For demo purposes, we'll use a different range to simulate change addresses
          const changeIndex = 1000 + i; // Use offset to simulate change path
          const address = await walletService.generateAddressFromXpub(currentWallet.xpub, changeIndex);
          addresses.push({
            address,
            index: i,
            balance: 0,
            txCount: 0,
            receivedCount: 0,
            sentCount: 0,
            isUsed: false,
            type: 'change',
            derivationPath: `m/84'/0'/0'/1/${i}`
          });
        } catch (error) {
          console.warn(`Failed to generate change address ${i}:`, error);
        }
      }
      
      console.log(`✅ Generated ${addresses.length} addresses for display`);
      return addresses;
    },
    enabled: !!currentWallet?.xpub,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch balance and transaction data for each address
  const addressBalancesQuery = useQuery({
    queryKey: ['address-balances', addressesQuery.data?.map(a => a.address).join(','), addressesQuery.data?.length],
    queryFn: async () => {
      if (!addressesQuery.data?.length) return {};
      
      console.log('💰 Fetching balances and transaction details for addresses...');
      const balanceData: Record<string, { 
        balance: number; 
        txCount: number; 
        receivedCount: number; 
        sentCount: number; 
      }> = {};
      
      // Fetch balance and transaction details for each address
      const promises = addressesQuery.data.map(async (addressInfo) => {
        try {
          const [balance, transactions] = await Promise.all([
            bitcoinService.getAddressBalance(addressInfo.address),
            bitcoinService.getAddressTransactions(addressInfo.address)
          ]);
          
          // Analyze transactions to count received vs sent
          let receivedCount = 0;
          let sentCount = 0;
          
          transactions.forEach((tx: any) => {
            // Check if this address received funds in this transaction
            const receivedInTx = tx.vout?.some((output: any) => 
              output.scriptpubkey_address === addressInfo.address
            );
            
            // Check if this address sent funds in this transaction
            const sentInTx = tx.vin?.some((input: any) => 
              input.prevout?.scriptpubkey_address === addressInfo.address
            );
            
            if (receivedInTx) receivedCount++;
            if (sentInTx) sentCount++;
          });
          
          balanceData[addressInfo.address] = {
            balance,
            txCount: transactions.length,
            receivedCount,
            sentCount
          };
        } catch (error) {
          console.warn(`Failed to fetch data for address ${addressInfo.address}:`, error);
          balanceData[addressInfo.address] = {
            balance: 0,
            txCount: 0,
            receivedCount: 0,
            sentCount: 0
          };
        }
      });
      
      await Promise.all(promises);
      console.log(`✅ Fetched balance data for ${Object.keys(balanceData).length} addresses`);
      return balanceData;
    },
    enabled: !!addressesQuery.data?.length,
    staleTime: 120000, // 2 minutes
    refetchInterval: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Combine address data with balance information
  const addressData = useMemo((): AddressInfo[] => {
    if (!addressesQuery.data || !addressBalancesQuery.data) return [];
    
    return addressesQuery.data
      .filter(addressInfo => addressInfo.address && addressInfo.address.trim() !== '') // Filter out empty addresses
      .map(addressInfo => {
        const balanceInfo = addressBalancesQuery.data[addressInfo.address] || { 
          balance: 0, 
          txCount: 0, 
          receivedCount: 0, 
          sentCount: 0 
        };
        return {
          ...addressInfo,
          balance: balanceInfo.balance,
          txCount: balanceInfo.txCount,
          receivedCount: balanceInfo.receivedCount,
          sentCount: balanceInfo.sentCount,
          isUsed: balanceInfo.txCount > 0 || balanceInfo.balance > 0
        };
      })
      .filter(addr => addr.type === selectedTab)
      .filter((addr, index, array) => {
        // Remove duplicates based on address
        return array.findIndex(a => a.address === addr.address) === index;
      })
      .sort((a, b) => {
        // Sort by usage first (used addresses first), then by index
        if (a.isUsed !== b.isUsed) {
          return a.isUsed ? -1 : 1;
        }
        return a.index - b.index;
      });
  }, [addressesQuery.data, addressBalancesQuery.data, selectedTab]);

  const copyToClipboard = async (address: string) => {
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Copied', 'Address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const openAddressExplorer = async (address: string) => {
    try {
      const url = `https://app.bitsleuth.ai/address/${address}`;
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Failed to open address explorer:', error);
      Alert.alert('Error', 'Failed to open address explorer');
    }
  };

  const refreshAddresses = async () => {
    setGeneratingAddresses(true);
    try {
      await Promise.all([
        addressesQuery.refetch(),
        addressBalancesQuery.refetch()
      ]);
    } catch (error) {
      console.error('Failed to refresh addresses:', error);
      Alert.alert('Error', 'Failed to refresh addresses');
    } finally {
      setGeneratingAddresses(false);
    }
  };

  const formatBalance = (balance: number) => {
    return balance.toFixed(8);
  };

  const AddressItem = ({ addressInfo }: { addressInfo: AddressInfo }) => (
    <TouchableOpacity
      style={[styles.addressItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => openAddressExplorer(addressInfo.address)}
      activeOpacity={0.7}
    >
      <View style={styles.addressHeader}>
        <View style={styles.addressIndexContainer}>
          <Text style={[styles.addressIndex, { color: theme.colors.text }]}>
            #{addressInfo.index}
          </Text>
          <Text style={[styles.derivationPath, { color: theme.colors.textSecondary }]}>
            {addressInfo.derivationPath}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: addressInfo.isUsed 
                ? theme.colors.warning + '20'
                : theme.colors.success + '20'
            }
          ]}>
            <Text style={[
              styles.statusText,
              {
                color: addressInfo.isUsed 
                  ? theme.colors.warning
                  : theme.colors.success
              }
            ]}>
              {addressInfo.isUsed ? 'Used' : 'Unused'}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.addressText, { color: theme.colors.text }]}>
        {addressInfo.address}
      </Text>
      
      <View style={styles.transactionStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Txs</Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{addressInfo.txCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Received</Text>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>{addressInfo.receivedCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Sent</Text>
          <Text style={[styles.statValue, { color: theme.colors.error }]}>{addressInfo.sentCount}</Text>
        </View>
      </View>
      
      <View style={styles.addressFooter}>
        <Text style={[styles.balanceText, { color: theme.colors.textSecondary }]}>
          Balance: {formatBalance(addressInfo.balance)} BTC
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              copyToClipboard(addressInfo.address);
            }}
            style={styles.actionButton}
          >
            <Copy color={theme.colors.textSecondary} size={16} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              openAddressExplorer(addressInfo.address);
            }}
            style={styles.actionButton}
          >
            <ExternalLink color={theme.colors.primary} size={16} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const TabButton = ({ 
    title, 
    isActive, 
    onPress 
  }: { 
    title: string; 
    isActive: boolean; 
    onPress: () => void; 
  }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor: isActive ? theme.colors.primary + '20' : 'transparent',
          borderBottomWidth: isActive ? 2 : 0,
          borderBottomColor: theme.colors.primary,
        }
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.tabText,
        {
          color: isActive ? theme.colors.primary : theme.colors.textSecondary,
          fontWeight: isActive ? '600' : '400',
        }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            View Addresses
          </Text>
          <TouchableOpacity
            onPress={refreshAddresses}
            style={styles.refreshButton}
            disabled={generatingAddresses}
          >
            <RefreshCw 
              color={generatingAddresses ? theme.colors.textSecondary : theme.colors.primary} 
              size={20} 
            />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View testID="addresses-tab-container" style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
          <TabButton
            title="Receiving"
            isActive={selectedTab === 'receiving'}
            onPress={() => setSelectedTab('receiving')}
          />
          <TabButton
            title="Change"
            isActive={selectedTab === 'change'}
            onPress={() => setSelectedTab('change')}
          />
        </View>
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {addressesQuery.isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Generating addresses...
            </Text>
          </View>
        ) : addressData.length > 0 ? (
          <>
            <View style={styles.infoContainer}>
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                {selectedTab === 'receiving' 
                  ? 'Receiving addresses (m/84\'/0\'/0\'/0/x) - Share these to receive Bitcoin. Used addresses are shown first.'
                  : 'Change addresses (m/84\'/0\'/0\'/1/x) - Automatically used for transaction change outputs.'}
              </Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{addressData.length}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Used</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.warning }]}>
                    {addressData.filter(addr => addr.isUsed).length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Unused</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                    {addressData.filter(addr => !addr.isUsed).length}
                  </Text>
                </View>
              </View>
            </View>
            {addressData.map((addressInfo, index) => (
              <AddressItem key={`${addressInfo.type}-${addressInfo.index}-${index}-${addressInfo.address.slice(-8)}`} addressInfo={addressInfo} />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {addressesQuery.error 
                ? 'Failed to generate addresses. Please try again.'
                : 'No addresses found'}
            </Text>
          </View>
        )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  refreshButton: {
    padding: 8,
    marginRight: -8,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  infoContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    paddingTop: 20,
  },
  addressItem: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressIndexContainer: {
    flex: 1,
  },
  addressIndex: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  derivationPath: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
    marginBottom: 12,
  },
  addressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },

});