import { useWallet } from '@/hooks/wallet-store';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Copy, ExternalLink, RefreshCw } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';

// Platform-specific wallet service imports
let walletService: any;
try {
  let importedService: any;
  if (Platform.OS === 'web') {
    console.log('🌐 Loading web wallet service in wallet addresses...');
    importedService = require('@/services/wallet-service.web');
  } else {
    console.log('📱 Loading mobile wallet service in wallet addresses...');
    importedService = require('@/services/wallet-service');
  }
  
  console.log('📦 Wallet addresses imported service keys:', Object.keys(importedService));
  
  // Ensure functions are properly bound and accessible
  walletService = {
    generateAddressFromXpub: importedService.generateAddressFromXpub,
    generateNewAddress: importedService.generateNewAddress,
    generateAddressBatchForView: importedService.generateAddressBatchForView
  };
  
  // Verify required functions are available
  const requiredFunctions = ['generateAddressFromXpub', 'generateNewAddress', 'generateAddressBatchForView'];
  const missingFunctions = requiredFunctions.filter(func => typeof walletService[func] !== 'function');
  
  if (missingFunctions.length > 0) {
    throw new Error(`Missing wallet service functions in addresses: ${missingFunctions.join(', ')}`);
  }
  
  console.log('✅ Wallet service loaded successfully in wallet addresses');
} catch (error) {
  console.error('❌ Failed to load wallet service in wallet addresses:', error);
  // Provide a minimal fallback
  walletService = {
    generateAddressFromXpub: async () => { throw new Error('Wallet service not available'); },
    generateNewAddress: async () => { throw new Error('Wallet service not available'); },
    generateAddressBatchForView: async () => { throw new Error('Wallet service not available'); }
  };
}

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
  const [loadedBatches, setLoadedBatches] = useState<number>(1); // Start with 1 batch (20 addresses)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const BATCH_SIZE = 20; // Load 20 addresses at a time

  // Generate addresses in batches for display
  const addressesQuery = useQuery({
    queryKey: ['wallet-addresses-batched', currentWallet?.id, currentWallet?.xpub, loadedBatches],
    queryFn: async () => {
      if (!currentWallet?.xpub) return [];
      
      console.log(`🔍 Generating ${loadedBatches} batches of addresses for display...`);
      const allAddresses: AddressInfo[] = [];
      
      // Generate receiving addresses in batches
      for (let batchIndex = 0; batchIndex < loadedBatches; batchIndex++) {
        const startIndex = batchIndex * BATCH_SIZE;
        console.log(`🔧 Generating receiving addresses batch ${batchIndex + 1}: indices ${startIndex}-${startIndex + BATCH_SIZE - 1}`);
        
        try {
          // Use the new batch generation function
          const batchData = await walletService.generateAddressBatchForView(currentWallet.xpub, startIndex, BATCH_SIZE);
          
          batchData.forEach((addrData) => {
            allAddresses.push({
              address: addrData.address,
              index: addrData.index,
              balance: addrData.balance,
              txCount: addrData.txCount,
              receivedCount: 0, // Will be calculated separately if needed
              sentCount: 0, // Will be calculated separately if needed
              isUsed: addrData.isUsed,
              type: 'receiving',
              derivationPath: `m/84'/0'/0'/0/${addrData.index}`
            });
          });
          
          console.log(`✅ Generated batch ${batchIndex + 1}: ${batchData.length} addresses`);
        } catch (error) {
          console.warn(`❌ Failed to generate batch ${batchIndex + 1}:`, error);
        }
      }
      
      console.log(`✅ Generated ${allAddresses.length} total addresses for display`);
      return allAddresses;
    },
    enabled: !!currentWallet?.xpub,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const loadMoreAddresses = async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      setLoadedBatches(prev => prev + 1);
      // The query will automatically refetch with the new batch count
    } catch (error) {
      console.error('Failed to load more addresses:', error);
      Alert.alert('Error', 'Failed to load more addresses');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Combine address data with balance information
  const addressData = useMemo((): AddressInfo[] => {
    if (!addressesQuery.data) return [];
    
    return addressesQuery.data
      .filter(addressInfo => addressInfo.address && addressInfo.address.trim() !== '') // Filter out empty addresses
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
  }, [addressesQuery.data, selectedTab]);

  const copyToClipboard = async (address: string) => {
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Copied', 'Address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const openAddressDetails = (address: string) => {
    router.push(`/address-details?address=${encodeURIComponent(address)}`);
  };

  const refreshAddresses = async () => {
    setGeneratingAddresses(true);
    try {
      await addressesQuery.refetch();
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
      onPress={() => openAddressDetails(addressInfo.address)}
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
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {addressInfo.txCount}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Received</Text>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            {addressInfo.receivedCount}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Sent</Text>
          <Text style={[styles.statValue, { color: theme.colors.error }]}>
            {addressInfo.sentCount}
          </Text>
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
              openAddressDetails(addressInfo.address);
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
                  ? `Receiving addresses (m/84\'/0\'/0\'/0/x) - Showing ${addressData.length} addresses. Used addresses are shown first.`
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
            
            {/* Load More Button */}
            <TouchableOpacity
              style={[
                styles.loadMoreButton,
                { 
                  backgroundColor: theme.colors.primary + '20',
                  borderColor: theme.colors.primary,
                  opacity: isLoadingMore ? 0.6 : 1
                }
              ]}
              onPress={loadMoreAddresses}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>
                    Loading more addresses...
                  </Text>
                </>
              ) : (
                <>
                  <RefreshCw color={theme.colors.primary} size={20} />
                  <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>
                    Load More Addresses (+{BATCH_SIZE})
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
  },

});