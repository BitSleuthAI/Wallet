import { GradientBackground } from '@/components/GradientBackground';
import WalletSelector from '@/components/WalletSelector';
import { createButtonStyle, platformStyles } from '@/constants/themes';
import { useTabAnimation } from '@/hooks/use-tab-animation';
import { useWallet } from '@/hooks/wallet-store';
import * as Clipboard from 'expo-clipboard';
import { Stack, router } from 'expo-router';
import { Copy, RefreshCw, Share as ShareIcon } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Platform,
    SafeAreaView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

// Wrapper component that checks for context availability
export default function ReceiveScreen() {
  const walletContext = useWallet();
  
  // Safety check: if context is not available yet, show loading
  if (!walletContext) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    );
  }
  
  return <ReceiveScreenContent />;
}

// Main component with all hooks
function ReceiveScreenContent() {
  const { animatedStyle } = useTabAnimation(2); // Receive tab = index 2
  const { currentWallet, generateNewAddress, theme, incrementUsageCount } = useWallet()!; // Non-null assertion is safe here because wrapper checked
  const spinValue = useRef(new Animated.Value(0)).current;
  
  // Initialize state hooks
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [isGeneratingAddress, setIsGeneratingAddress] = useState<boolean>(false);

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
    
    if (!currentWallet) {
      console.error('❌ No current wallet available');
      Alert.alert('Error', 'No wallet selected');
      return;
    }
    
    try {
      setIsGeneratingAddress(true);
      console.log('🔄 Generating new address...');
      const result = await generateNewAddress(currentWallet);
      if (result.success && result.wallet) {
        console.log('✅ New address generated:', result.wallet.addresses[result.wallet.addresses.length - 1]);
        setCurrentAddress(result.wallet.addresses[result.wallet.addresses.length - 1]);
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
          <View style={styles.qrContainer}>
            {currentAddress && currentAddress.length > 0 && currentAddress !== 'No address available' ? (
              <QRCode
                value={currentAddress}
                size={220}
                backgroundColor="white"
                color="black"
                logo={undefined}
                logoSize={0}
                logoBackgroundColor="transparent"
                logoMargin={0}
                logoBorderRadius={0}
                quietZone={12}
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

          {/* Address */}
          <View style={styles.addressSection}>
            <Text style={[styles.addressLabel, { color: theme.colors.textSecondary }]}>
              Your Bitcoin Address
            </Text>
            <Text 
              style={[styles.address, { color: theme.colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
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
              }
            ]}
            onPress={() => {
              handleNewAddress();
              incrementUsageCount('receive_interaction');
            }}
            disabled={isGeneratingAddress}
            activeOpacity={0.8}
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
            ]}
            onPress={() => {
              handleCopy();
              incrementUsageCount('receive_interaction');
            }}
            disabled={!currentAddress || currentAddress.length === 0}
            activeOpacity={0.7}
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
            ]}
            onPress={() => {
              handleShare();
              incrementUsageCount('receive_interaction');
            }}
            disabled={!currentAddress || currentAddress.length === 0}
            activeOpacity={0.7}
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
    paddingHorizontal: platformStyles.spacing.xl,
    paddingTop: platformStyles.spacing.xl,
  },

  qrContainer: {
    marginBottom: platformStyles.spacing.xxxl,
    alignItems: 'center',
    alignSelf: 'center',
  },
  addressSection: {
    alignItems: 'center',
    marginBottom: platformStyles.spacing.xxxl,
    paddingHorizontal: platformStyles.spacing.xl,
  },
  addressLabel: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: platformStyles.spacing.md,
  },
  address: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  newAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: platformStyles.spacing.xxl,
    paddingVertical: platformStyles.spacing.md,
    borderRadius: platformStyles.borderRadius.large,
    marginBottom: platformStyles.spacing.xxxl,
    ...platformStyles.buttonShadow,
  },
  newAddressText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomActionButtons: {
    flexDirection: 'row',
    gap: platformStyles.spacing.lg,
    paddingHorizontal: platformStyles.spacing.xl,
    paddingBottom: Platform.OS === 'android' ? 120 : platformStyles.spacing.xl,
    paddingTop: platformStyles.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.large,
    ...platformStyles.shadow,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: platformStyles.spacing.huge,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: platformStyles.spacing.xxxl,
  },
  setupButton: {
    paddingHorizontal: platformStyles.spacing.xxxl,
    paddingVertical: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.large,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
  },
  qrPlaceholderText: {
    fontSize: 17,
    textAlign: 'center',
  },
});