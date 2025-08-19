import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Copy } from 'lucide-react-native';
import { useWallet } from '@/hooks/wallet-store';
import * as Clipboard from 'expo-clipboard';

interface AddressInfo {
  address: string;
  index: number;
  balance: number;
  txCount: number;
  isUsed: boolean;
}

export default function WalletAddressesScreen() {
  const { theme, currentWallet, balance } = useWallet();
  const [selectedTab, setSelectedTab] = useState<'receiving' | 'change'>('receiving');

  // Mock address data based on current wallet addresses
  const addressData = useMemo((): AddressInfo[] => {
    if (!currentWallet?.addresses) return [];
    
    return currentWallet.addresses.map((address, index) => ({
      address,
      index,
      balance: index === 0 ? balance : index === 1 ? balance * 0.1 : 0, // Mock balance distribution
      txCount: index === 0 ? 3 : index === 1 ? 1 : 0, // Mock transaction counts
      isUsed: index <= 1, // First two addresses are "used"
    }));
  }, [currentWallet?.addresses, balance]);

  const copyToClipboard = async (address: string) => {
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Copied', 'Address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const formatBalance = (balance: number) => {
    return balance.toFixed(8);
  };

  const AddressItem = ({ addressInfo }: { addressInfo: AddressInfo }) => (
    <TouchableOpacity
      style={[styles.addressItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => copyToClipboard(addressInfo.address)}
      activeOpacity={0.7}
    >
      <View style={styles.addressHeader}>
        <Text style={[styles.addressIndex, { color: theme.colors.textSecondary }]}>
          {addressInfo.index}
        </Text>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: addressInfo.isUsed 
                ? theme.colors.textSecondary + '20'
                : theme.colors.success + '20'
            }
          ]}>
            <Text style={[
              styles.statusText,
              {
                color: addressInfo.isUsed 
                  ? theme.colors.textSecondary
                  : theme.colors.success
              }
            ]}>
              {addressInfo.isUsed ? 'Used' : 'Unused'}
            </Text>
          </View>
          <Text style={[styles.txCount, { color: theme.colors.textSecondary }]}>
            Txs: {addressInfo.txCount}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.addressText, { color: theme.colors.text }]}>
        {addressInfo.address}
      </Text>
      
      <View style={styles.addressFooter}>
        <Text style={[styles.balanceText, { color: theme.colors.textSecondary }]}>
          {formatBalance(addressInfo.balance)} BTC
        </Text>
        <Copy color={theme.colors.textSecondary} size={16} />
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Wallet Addresses',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft color={theme.colors.text} size={24} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
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
        {addressData.length > 0 ? (
          addressData.map((addressInfo) => (
            <AddressItem key={addressInfo.address} addressInfo={addressInfo} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No addresses found
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  addressIndex: {
    fontSize: 16,
    fontWeight: '600',
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
  txCount: {
    fontSize: 12,
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
});