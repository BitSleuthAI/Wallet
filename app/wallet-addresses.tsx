import { useWallet } from '@/hooks/wallet-store';
import { transformAddressDataForUI, type AddressInfo } from '@/utils/address-transform';
import { loadWalletService } from '@/utils/wallet-service-loader';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Copy, ExternalLink, Info, RefreshCw } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { AndroidSafeContainer } from '@/components/AndroidSafeContainer';
import { GradientBackground } from '@/components/GradientBackground';
import { toast } from '@/components/Toast';
import { platformStyles } from '@/constants/themes';

// Load wallet service using shared utility
const walletService = loadWalletService([
  'generateAddressFromXpub',
  'generateNewAddress',
  'generateAddressesForView',
]);

export default function WalletAddressesScreen() {
  const {
    theme,
    currentWallet,
  } = useWallet();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'receiving' | 'change'>('receiving');
  const [generatingAddresses, setGeneratingAddresses] = useState<boolean>(false);

  // Generate addresses following gap limit logic
  // OPTIMIZED: Fetch both chains at once to leverage shared caching from discoverUsedAddresses
  const addressesQuery = useQuery<AddressInfo[]>({
    queryKey: ['wallet-addresses-all-chains', currentWallet?.id, currentWallet?.xpub],
    queryFn: async (): Promise<AddressInfo[]> => {
      if (!currentWallet?.xpub) {
        console.log('❌ No current wallet or xpub available');
        return [];
      }
      
      console.log(`🔍 Generating addresses for both chains using gap limit logic with caching...`);
      console.log(`🔍 Current wallet:`, currentWallet.name, currentWallet.xpub.substring(0, 20) + '...');
      
      try {
        // Fetch both receiving and change addresses in parallel
        // They share the same discoverUsedAddresses cache, so the second call is very fast
        console.log('🔍 Fetching receiving addresses...');
        const receivingData = await walletService.generateAddressesForView(currentWallet.xpub, 'receiving');
        console.log(`✅ Received ${receivingData.length} receiving addresses`);
        
        console.log('🔍 Fetching change addresses...');
        const changeData = await walletService.generateAddressesForView(currentWallet.xpub, 'change');
        console.log(`✅ Received ${changeData.length} change addresses`);
        
        // Use shared utility to transform address data
        const allAddresses = transformAddressDataForUI(receivingData, changeData);
        
        console.log(`✅ Generated ${allAddresses.length} addresses total (${receivingData.length} receiving, ${changeData.length} change)`);
        console.log(`🔍 Address breakdown:`, {
          receiving: allAddresses.filter(a => a.type === 'receiving').length,
          change: allAddresses.filter(a => a.type === 'change').length,
          used: allAddresses.filter(a => a.isUsed).length,
          unused: allAddresses.filter(a => !a.isUsed).length
        });
        return allAddresses;
      } catch (error) {
        console.error(`❌ Failed to generate addresses:`, error);
        throw error;
      }
    },
    enabled: !!currentWallet?.xpub,
    staleTime: 300000, // 5 minutes - consider data fresh
    gcTime: 300000, // 5 minutes - keep cached data even when query is disabled (wallet switching)
    refetchOnWindowFocus: false,
  });

  // Get address data for current tab (filtered from query data)
  const addressData = useMemo((): AddressInfo[] => {
    // Use data from the addressesQuery instead of the wallet store
    const sourceData = addressesQuery.data || [];
    
    console.log(`🔍 Address data filtering for ${selectedTab} tab:`, {
      totalSourceData: sourceData.length,
      selectedTab,
      queryLoading: addressesQuery.isLoading,
      queryError: addressesQuery.error,
      queryData: sourceData.length > 0 ? sourceData.slice(0, 3).map(a => ({ address: a.address.substring(0, 10) + '...', type: a.type, index: a.index })) : 'No data'
    });
    
    const filteredData = sourceData
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
    
    console.log(`✅ Filtered ${filteredData.length} ${selectedTab} addresses`);
    return filteredData;
  }, [addressesQuery.data, addressesQuery.error, addressesQuery.isLoading, selectedTab]);

  const copyToClipboard = async (address: string) => {
    try {
      await Clipboard.setStringAsync(address);
      toast.success('Copied!', 'Address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Copy failed', 'Could not copy address to clipboard');
    }
  };

  const openAddressDetails = (address: string) => {
    router.push(`/address-details?address=${encodeURIComponent(address)}`);
  };

  const refreshAddresses = async () => {
    setGeneratingAddresses(true);
    try {
      // Clear the service-level address metadata cache to force fresh blockchain queries
      if (currentWallet?.xpub && walletService.clearAddressCache) {
        walletService.clearAddressCache(currentWallet.xpub);
      }

      await addressesQuery.refetch();
    } catch (error) {
      console.error('Failed to refresh addresses:', error);
      toast.error('Refresh failed', 'Could not refresh addresses');
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
        
        <FlatList
          style={styles.scrollView}
          data={addressData}
          keyExtractor={(addressInfo) => addressInfo.address}
          renderItem={({ item }) => <AddressItem addressInfo={item} />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={addressData.length > 0 ? (
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
          ) : null}
          ListEmptyComponent={addressesQuery.isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Generating addresses...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {addressesQuery.error
                  ? 'Failed to generate addresses. Please try again.'
                  : 'No addresses found'}
              </Text>
            </View>
          )}
          ListFooterComponent={addressData.length > 0 ? (
          <>
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
          ) : null}
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
    ...platformStyles.shadow,
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