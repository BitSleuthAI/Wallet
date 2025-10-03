import { useWallet } from '@/hooks/wallet-store';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Copy, ExternalLink, Info, RefreshCw } from 'lucide-react-native';
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

// Wallet service import
let walletService: any;
try {
  console.log('📦 Loading wallet service in wallet addresses...');
  const importedService = require('@/services/wallet-service');
  
  console.log('📦 Wallet addresses imported service keys:', Object.keys(importedService));
  
  // Ensure functions are properly bound and accessible
  walletService = {
    generateAddressFromXpub: importedService.generateAddressFromXpub,
    generateNewAddress: importedService.generateNewAddress,
    generateAddressesForView: importedService.generateAddressesForView,
    generateAddressBatchForView: importedService.generateAddressBatchForView
  };
  
  // Verify required functions are available
  const requiredFunctions = ['generateAddressFromXpub', 'generateNewAddress', 'generateAddressesForView'];
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
    generateAddressesForView: async () => { throw new Error('Wallet service not available'); }
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
  const [cachedAddresses, setCachedAddresses] = useState<{[key: string]: AddressInfo[]}>({});
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Generate addresses following gap limit logic
  const addressesQuery = useQuery({
    queryKey: ['wallet-addresses-gap-limit', currentWallet?.id, currentWallet?.xpub, selectedTab],
    queryFn: async () => {
      if (!currentWallet?.xpub) return [];
      
      console.log(`🔍 Generating addresses for ${selectedTab} chain using gap limit logic...`);
      
      try {
        // Use the new gap limit function
        const addressData = await walletService.generateAddressesForView(currentWallet.xpub, selectedTab);
        
        const addresses: AddressInfo[] = addressData.map((addrData: {address: string, index: number, isUsed: boolean, balance: number, txCount: number, type: 'receiving' | 'change'}) => ({
          address: addrData.address,
          index: addrData.index,
          balance: addrData.balance,
          txCount: addrData.txCount,
          receivedCount: 0, // Will be calculated separately if needed
          sentCount: 0, // Will be calculated separately if needed
          isUsed: addrData.isUsed,
          type: addrData.type,
          derivationPath: `m/84'/0'/0'/${addrData.type === 'receiving' ? '0' : '1'}/${addrData.index}`
        }));
        
        console.log(`✅ Generated ${addresses.length} ${selectedTab} addresses using gap limit logic`);
        return addresses;
      } catch (error) {
        console.error(`❌ Failed to generate ${selectedTab} addresses:`, error);
        throw error;
      }
    },
    enabled: !!currentWallet?.xpub,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Update cache when query data changes
  React.useEffect(() => {
    if (addressesQuery.data && !addressesQuery.isLoading && !addressesQuery.error) {
      setCachedAddresses(prev => ({
        ...prev,
        [selectedTab]: addressesQuery.data
      }));
    }
  }, [addressesQuery.data, addressesQuery.isLoading, addressesQuery.error, selectedTab]);

  const loadMoreAddresses = async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      // For now, we'll disable the load more button since we're using gap limit logic
      // The gap limit logic already shows all used addresses + appropriate unused addresses
      console.log('Load more is disabled when using gap limit logic');
    } catch (error) {
      console.error('Failed to load more addresses:', error);
      Alert.alert('Error', 'Failed to load more addresses');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Get address data for current tab (from cache or query)
  const addressData = useMemo((): AddressInfo[] => {
    // Determine the best data source for the current tab
    let sourceData: AddressInfo[] = [];
    
    // If query is loading or has an error, don't use stale cached data
    if (addressesQuery.isLoading || addressesQuery.error) {
      // Only use cached data if query is loading (not if it has an error)
      if (addressesQuery.isLoading && cachedAddresses[selectedTab]) {
        sourceData = cachedAddresses[selectedTab];
      } else {
        sourceData = [];
      }
    } else if (addressesQuery.data) {
      // Query succeeded - use fresh query data
      sourceData = addressesQuery.data;
    } else if (cachedAddresses[selectedTab]) {
      // Fallback to cached data if no fresh query data
      sourceData = cachedAddresses[selectedTab];
    }
    
    return sourceData
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
  }, [cachedAddresses, addressesQuery.data, addressesQuery.isLoading, addressesQuery.error, selectedTab]);

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
      // Clear cache and refetch
      setCachedAddresses({});
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
                  ? `Receiving addresses (m/84\'/0\'/0\'/0/x) - Following BIP44 gap limit: all used + up to 20 unused. Showing ${addressData.length} addresses.`
                  : `Change addresses (m/84\'/0\'/0\'/1/x) - Following BIP44 gap limit: all used + up to 20 unused. Showing ${addressData.length} addresses.`}
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
            
            {/* Gap Limit Info */}
            <View style={styles.gapLimitInfo}>
              <Text style={[styles.gapLimitText, { color: theme.colors.textSecondary }]}>
                Gap Limit: Shows all used addresses + up to 20 unused addresses
              </Text>
            </View>
            
            {/* Bitcoin Address Types Educational Section */}
            <View style={[styles.addressTypesEducationCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.addressTypesEducationHeader}>
                <View style={[styles.addressTypesEducationIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Info color={theme.colors.primary} size={20} />
                </View>
                <Text style={[styles.addressTypesEducationTitle, { color: theme.colors.text }]}>
                  Bitcoin Address Types
                </Text>
              </View>
              <Text style={[styles.addressTypesEducationDescription, { color: theme.colors.textSecondary }]}>
                Bitcoin addresses come in different formats, each with distinct characteristics:
              </Text>
              <View style={styles.addressTypesEducationTypes}>
                <View style={styles.addressTypeItem}>
                  <Text style={[styles.addressTypeName, { color: theme.colors.text }]}>
                    Native SegWit (P2WPKH)
                  </Text>
                  <Text style={[styles.addressTypeExample, { color: theme.colors.textSecondary }]}>
                    Example: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
                  </Text>
                  <Text style={[styles.addressTypeDesc, { color: theme.colors.textSecondary }]}>
                    Modern format with lowest fees (~40% cheaper). Recommended standard.
                  </Text>
                </View>
                <View style={styles.addressTypeItem}>
                  <Text style={[styles.addressTypeName, { color: theme.colors.text }]}>
                    Nested SegWit (P2SH)
                  </Text>
                  <Text style={[styles.addressTypeExample, { color: theme.colors.textSecondary }]}>
                    Example: 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy
                  </Text>
                  <Text style={[styles.addressTypeDesc, { color: theme.colors.textSecondary }]}>
                    Compatible with older wallets. Medium fees.
                  </Text>
                </View>
                <View style={styles.addressTypeItem}>
                  <Text style={[styles.addressTypeName, { color: theme.colors.text }]}>
                    Legacy (P2PKH)
                  </Text>
                  <Text style={[styles.addressTypeExample, { color: theme.colors.textSecondary }]}>
                    Example: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
                  </Text>
                  <Text style={[styles.addressTypeDesc, { color: theme.colors.textSecondary }]}>
                    Original Bitcoin format. Highest fees but universal compatibility.
                  </Text>
                </View>
              </View>
              <View style={styles.addressTypesEducationNote}>
                <Text style={[styles.addressTypesEducationNoteText, { color: theme.colors.textSecondary }]}>
                  💡 <Text style={{ fontWeight: '600' }}>Your wallet uses:</Text> Native SegWit addresses for optimal performance and fees
                </Text>
              </View>
            </View>
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
  gapLimitInfo: {
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
  },
  gapLimitText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  addressTypesEducationCard: {
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressTypesEducationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTypesEducationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressTypesEducationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addressTypesEducationDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  addressTypesEducationTypes: {
    marginBottom: 16,
  },
  addressTypeItem: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  addressTypeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressTypeExample: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
    opacity: 0.8,
  },
  addressTypeDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  addressTypesEducationNote: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  addressTypesEducationNoteText: {
    fontSize: 13,
    lineHeight: 18,
  },

});