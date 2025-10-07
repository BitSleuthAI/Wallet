import { GradientBackground } from '@/components/GradientBackground';
import WalletSelector from '@/components/WalletSelector';
import { createButtonStyle } from '@/constants/themes';
import { useTabAnimation } from '@/hooks/use-tab-animation';
import { useWallet } from '@/hooks/wallet-store';
import * as Clipboard from 'expo-clipboard';
import { Stack, router } from 'expo-router';
import { Copy, RefreshCw, Share as ShareIcon } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function ReceiveScreen() {
  const { animatedStyle } = useTabAnimation(2); // Receive tab = index 2
  const { currentWallet, generateNewAddress, theme } = useWallet();
  const [currentAddress, setCurrentAddress] = useState<string>(
    currentWallet?.addresses?.[currentWallet.addresses.length - 1] || ''
  );
  const [isGeneratingAddress, setIsGeneratingAddress] = useState<boolean>(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Spin animation for the refresh icon
  useEffect(() => {
    let spinAnimation: Animated.CompositeAnimation | null = null;
    
    if (isGeneratingAddress) {
      spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
    } else {
      spinValue.setValue(0);
    }
    
    // Cleanup: stop the animation when component unmounts or isGeneratingAddress changes
    return () => {
      if (spinAnimation) {
        spinAnimation.stop();
      }
    };
  }, [isGeneratingAddress, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
    if (isGeneratingAddress) return; // Prevent multiple simultaneous requests
    
    try {
      setIsGeneratingAddress(true);
      console.log('🔄 Generating new address...');
      const result = await generateNewAddress();
      if (result.success && result.address) {
        console.log('✅ New address generated:', result.address);
        setCurrentAddress(result.address);
        // Remove the success alert for faster UX
        // Alert.alert('Success', 'New address generated successfully');
      } else {
        console.warn('⚠️ Address generation failed:', result.error);
        Alert.alert('Warning', result.error || 'Address generation failed');
      }
    } catch (error) {
      console.error('❌ Unexpected error generating new address:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsGeneratingAddress(false);
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
      
      // Native sharing
      await Share.share({
        message: `Bitcoin Address: ${currentAddress}`,
        title: 'Bitcoin Address',
      });
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
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <SafeAreaView style={styles.container}>
          <Stack.Screen 
            options={{ 
              title: 'Receive',
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: theme.colors.text,
            }} 
          />
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
      </GradientBackground>
    );
  }

  return (
    <GradientBackground theme={theme} variant="primary" direction="vertical">
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Receive',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: theme.colors.text,
          }} 
        />
        
        <Animated.View style={[styles.animatedContainer, animatedStyle]}>
        <View style={styles.content}>
          {/* To Section */}
          <WalletSelector label="To:" />

          {/* QR Code */}
          <View style={[styles.qrContainer, { backgroundColor: theme.colors.surface, alignSelf: 'center' }]}>
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
            style={[
              createButtonStyle(theme, 'primary'),
              styles.newAddressButton,
              { 
                alignSelf: 'center',
                opacity: isGeneratingAddress ? 0.7 : 1
              }
            ]}
            onPress={handleNewAddress}
            disabled={isGeneratingAddress}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw color="white" size={20} />
            </Animated.View>
            <Text style={styles.newAddressText}>
              {isGeneratingAddress ? 'Generating...' : 'New Address'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Action Buttons - Positioned at bottom */}
        <View style={styles.bottomActionButtons}>
          <TouchableOpacity
            style={[
              createButtonStyle(theme, 'secondary'),
              styles.actionButton,
              { 
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
              createButtonStyle(theme, 'secondary'),
              styles.actionButton,
              { 
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
        </Animated.View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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