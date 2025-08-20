import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { RefreshCw, Copy, Share as ShareIcon } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useWallet } from '@/hooks/wallet-store';

export default function ReceiveScreen() {
  const { currentWallet, generateNewAddress, theme } = useWallet();
  const [currentAddress, setCurrentAddress] = useState<string>(
    currentWallet?.addresses?.[currentWallet.addresses.length - 1] || ''
  );

  // Update current address when wallet changes
  React.useEffect(() => {
    if (currentWallet?.addresses?.length) {
      const latestAddress = currentWallet.addresses[currentWallet.addresses.length - 1];
      if (latestAddress && latestAddress !== currentAddress) {
        setCurrentAddress(latestAddress);
      }
    }
  }, [currentWallet?.addresses, currentAddress]);

  const handleNewAddress = async () => {
    try {
      console.log('🔄 Generating new address...');
      const newAddress = await generateNewAddress();
      if (newAddress && newAddress.length > 0) {
        console.log('✅ New address generated:', newAddress);
        setCurrentAddress(newAddress);
        Alert.alert('Success', 'New address generated successfully');
      } else {
        console.warn('⚠️ No address returned from generateNewAddress');
        Alert.alert('Warning', 'Address generation returned empty result');
      }
    } catch (error) {
      console.error('❌ Error generating new address:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to generate new address: ${errorMessage}`);
    }
  };

  const handleCopy = async () => {
    try {
      if (!currentAddress || currentAddress.length === 0) {
        Alert.alert('Error', 'No address available to copy');
        return;
      }
      
      await Clipboard.setStringAsync(currentAddress);
      Alert.alert('Copied', 'Address copied to clipboard');
    } catch (error) {
      console.error('Error copying address:', error);
      Alert.alert('Error', 'Failed to copy address to clipboard');
    }
  };

  const handleShare = async () => {
    try {
      if (!currentAddress || currentAddress.length === 0) {
        Alert.alert('Error', 'No address available to share');
        return;
      }
      
      if (Platform.OS === 'web') {
        // Web fallback - copy to clipboard and show alert
        await Clipboard.setStringAsync(currentAddress);
        Alert.alert(
          'Address Copied',
          'Bitcoin address has been copied to clipboard since sharing is not available on web.',
          [{ text: 'OK' }]
        );
      } else {
        // Native sharing
        await Share.share({
          message: `Bitcoin Address: ${currentAddress}`,
          title: 'Bitcoin Address',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to copy
      try {
        if (currentAddress && currentAddress.length > 0) {
          await Clipboard.setStringAsync(currentAddress);
          Alert.alert('Copied', 'Address copied to clipboard instead');
        } else {
          Alert.alert('Error', 'No address available');
        }
      } catch (clipboardError) {
        console.error('Clipboard error:', clipboardError);
        Alert.alert('Error', 'Unable to share or copy address');
      }
    }
  };

  if (!currentWallet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'Receive' }} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Wallet Found
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Create or import a wallet to receive funds
          </Text>
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/wallet-setup')}
          >
            <Text style={styles.setupButtonText}>Setup Wallet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Receive' }} />
      
      <View style={styles.content}>
        {/* To Section */}
        <View style={styles.toSection}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>To:</Text>
          <View style={styles.walletContainer}>
            <View style={styles.walletIcon}>
              <Text style={styles.walletIconText}>J</Text>
            </View>
            <Text style={[styles.walletName, { color: theme.colors.text }]}>
              {currentWallet.name}
            </Text>
          </View>
        </View>

        {/* QR Code */}
        <View style={[styles.qrContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.qrCodeWrapper}>
            {currentAddress && currentAddress.length > 0 && currentAddress !== 'No address available' ? (
              <QRCode
                value={currentAddress}
                size={200}
                backgroundColor="white"
                color="black"
                logo={undefined}
                logoSize={0}
                logoBackgroundColor="transparent"
                logoMargin={0}
                logoBorderRadius={0}
                quietZone={10}
                enableLinearGradient={false}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={[styles.qrPlaceholderText, { color: theme.colors.textSecondary }]}>
                  {currentWallet ? 'Generating address...' : 'No address available'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Address */}
        <View style={styles.addressSection}>
          <Text style={[styles.addressLabel, { color: theme.colors.textSecondary }]}>
            Your Bitcoin Address
          </Text>
          <Text style={[styles.address, { color: theme.colors.text }]}>
            {currentAddress || 'No address available'}
          </Text>
        </View>

        {/* New Address Button */}
        <TouchableOpacity
          style={[styles.newAddressButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleNewAddress}
        >
          <RefreshCw color="white" size={20} />
          <Text style={styles.newAddressText}>New Address</Text>
        </TouchableOpacity>
      </View>
      
      {/* Action Buttons - Positioned at bottom */}
      <View style={styles.bottomActionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            { 
              backgroundColor: theme.colors.surface,
              opacity: currentAddress && currentAddress.length > 0 ? 1 : 0.5
            }
          ]}
          onPress={handleCopy}
          disabled={!currentAddress || currentAddress.length === 0}
        >
          <Copy color={theme.colors.text} size={20} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
            Copy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton, 
            { 
              backgroundColor: theme.colors.surface,
              opacity: currentAddress && currentAddress.length > 0 ? 1 : 0.5
            }
          ]}
          onPress={handleShare}
          disabled={!currentAddress || currentAddress.length === 0}
        >
          <ShareIcon color={theme.colors.text} size={20} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
            Share
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  toSection: {
    alignSelf: 'flex-start',
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletIconText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  walletName: {
    fontSize: 16,
    fontWeight: '500',
  },
  qrContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
  },
  addressSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  newAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 30,
  },
  newAddressText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomActionButtons: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    marginBottom: 32,
  },
  setupButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  qrPlaceholderText: {
    fontSize: 16,
    textAlign: 'center',
  },
});