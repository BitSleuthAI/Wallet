import { GradientBackground } from '@/components/GradientBackground';
import WalletSelector from '@/components/WalletSelector';
import { ADDRESS_GENERATION_COOLDOWN_MS, GAP_LIMIT_WARNING_THRESHOLD } from '@/constants/cache';
import { createButtonStyle, platformStyles } from '@/constants/themes';
import { useTabAnimation } from '@/hooks/use-tab-animation';
import { useWallet } from '@/hooks/wallet-store';
import { loadWalletService } from '@/utils/wallet-service-loader';
import * as Clipboard from 'expo-clipboard';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Copy, RefreshCw, Share as ShareIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

// Load wallet service using shared utility
const walletService = loadWalletService([
  'getFirstUnusedReceivingAddress',
  'clearAddressCache',
]);

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
  
  // Initialize state hooks with empty string, will be loaded async
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [isGeneratingAddress, setIsGeneratingAddress] = useState<boolean>(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(true);
  const [lastGenTime, setLastGenTime] = useState<number>(0);

  // Clear address cache when screen becomes focused to ensure fresh data
  // This prevents showing used addresses after receiving funds
  useFocusEffect(
    useCallback(() => {
      if (currentWallet?.xpub) {
        console.log('🔄 Receive screen focused - clearing address cache for fresh data');
        walletService.clearAddressCache(currentWallet.xpub);
      }
    }, [currentWallet?.xpub])
  );

  // Load first unused address when wallet changes
  // Note: We track the xpub to detect wallet switches. The effect will also run when
  // addresses change, which is acceptable because the getFirstUnusedReceivingAddress
  // function uses cached discovery data, making subsequent calls efficient.
  useEffect(() => {
    const loadFirstUnusedAddress = async () => {
      if (!currentWallet?.xpub) {
        setIsLoadingAddress(false);
        return;
      }

      try {
        setIsLoadingAddress(true);
        console.log('🔍 Loading first unused receiving address...');
        
        // Get first unused address within gap limit
        const unusedAddress = await walletService.getFirstUnusedReceivingAddress(currentWallet.xpub);
        
        if (unusedAddress) {
          console.log('✅ Found first unused address:', unusedAddress.substring(0, 20) + '...');
          setCurrentAddress(unusedAddress);
        } else {
          // Fallback to last wallet address if no unused found
          console.log('⚠️ No unused address found, using last wallet address');
          const fallbackAddress = currentWallet.addresses?.[currentWallet.addresses.length - 1] || '';
          setCurrentAddress(fallbackAddress);
        }
      } catch (error) {
        console.error('❌ Failed to load first unused address:', error);
        // Use same fallback logic as above
        const fallbackAddress = currentWallet.addresses?.[currentWallet.addresses.length - 1] || '';
        setCurrentAddress(fallbackAddress);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    loadFirstUnusedAddress();
  }, [currentWallet]);

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

  const handleNewAddress = async () => {
    if (isGeneratingAddress) return; // Prevent multiple simultaneous requests
    
    // Rate limiting: Prevent spam and API abuse
    const now = Date.now();
    if (now - lastGenTime < ADDRESS_GENERATION_COOLDOWN_MS) {
      const waitTime = Math.ceil((ADDRESS_GENERATION_COOLDOWN_MS - (now - lastGenTime)) / 1000);
      Alert.alert(
        'Please Wait', 
        `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before generating another address.`
      );
      return;
    }
    
    if (!currentWallet) {
      console.error('❌ No current wallet available');
      Alert.alert('Error', 'No wallet selected');
      return;
    }
    
    try {
      setIsGeneratingAddress(true);
      setLastGenTime(now); // Update timestamp at start of generation
      console.log('🔄 Generating new address...');
      const result = await generateNewAddress(currentWallet);
      if (result.success && result.wallet) {
        console.log('✅ New address generated:', result.wallet.addresses[result.wallet.addresses.length - 1]);
        
        // Check if user has generated many unused addresses (gap limit warning)
        const addressCount = result.wallet.addresses.length;
        
        if (addressCount >= GAP_LIMIT_WARNING_THRESHOLD) {
          Alert.alert(
            'Address Limit Warning',
            `You have generated ${addressCount} addresses. For wallet recovery, Bitcoin wallets typically scan only the first 20 addresses without transactions. Consider using existing addresses or funding some addresses before generating more.`,
            [{ text: 'OK', style: 'default' }]
          );
        }
        
        // Fallback address in case first unused lookup fails
        const newlyGeneratedAddress = result.wallet.addresses[result.wallet.addresses.length - 1];
        
        // Reload the first unused address after generating a new one
        try {
          const unusedAddress = await walletService.getFirstUnusedReceivingAddress(currentWallet.xpub);
          setCurrentAddress(unusedAddress || newlyGeneratedAddress);
        } catch (error) {
          console.error('❌ Failed to reload first unused address:', error);
          setCurrentAddress(newlyGeneratedAddress);
        }
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
            {isLoadingAddress ? (
              <View style={styles.qrPlaceholder}>
                <Text style={[styles.qrPlaceholderText, { color: theme.colors.textSecondary }]}>
                  Loading address...
                </Text>
              </View>
            ) : currentAddress && currentAddress.length > 0 && currentAddress !== 'No address available' ? (
              <QRCode
                value={currentAddress}
                size={240}
                backgroundColor="white"
                color="black"
                logo={undefined}
                logoSize={0}
                logoBackgroundColor="transparent"
                logoMargin={0}
                logoBorderRadius={0}
                quietZone={16}
                enableLinearGradient={false}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={[styles.qrPlaceholderText, { color: theme.colors.textSecondary }]}>
                  {currentWallet ? 'No address available' : 'No wallet selected'}
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
    paddingTop: platformStyles.spacing.xxl, // Increased from xl
  },

  qrContainer: {
    marginBottom: platformStyles.spacing.huge, // Increased from xxxl
    alignItems: 'center',
    alignSelf: 'center',
    padding: platformStyles.spacing.xxl, // Added padding
    backgroundColor: 'white', // Ensure QR has white background
    borderRadius: platformStyles.borderRadius.xxl, // Rounded corners
    ...platformStyles.cardShadow, // Add shadow
  },
  addressSection: {
    alignItems: 'center',
    marginBottom: platformStyles.spacing.huge, // Increased from xxxl
    paddingHorizontal: platformStyles.spacing.xxl, // Increased from xl
  },
  addressLabel: {
    fontSize: 18, // Increased from 17
    fontWeight: '600', // Increased from 500
    marginBottom: platformStyles.spacing.lg, // Increased from md
    letterSpacing: 0.2,
  },
  address: {
    fontSize: 16, // Increased from 15
    textAlign: 'center',
    lineHeight: 24, // Increased from 22
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  newAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: platformStyles.spacing.xxxl, // Increased from xxl
    paddingVertical: platformStyles.spacing.lg, // Increased from md
    borderRadius: platformStyles.borderRadius.xxl, // Increased from large
    marginBottom: platformStyles.spacing.xxxl,
    ...platformStyles.buttonShadow,
  },
  newAddressText: {
    color: 'white',
    fontSize: 18, // Increased from 17
    fontWeight: '700', // Increased from 600
    marginLeft: 10, // Increased from 8
    letterSpacing: 0.3,
  },
  bottomActionButtons: {
    flexDirection: 'row',
    gap: platformStyles.spacing.lg,
    paddingHorizontal: platformStyles.spacing.xl,
    paddingBottom: Platform.OS === 'android' ? 120 : platformStyles.spacing.xxl, // Increased from xl
    paddingTop: platformStyles.spacing.lg, // Increased from md
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.lg + 2, // Increased
    borderRadius: platformStyles.borderRadius.xl, // Increased from large
    ...platformStyles.shadow,
  },
  actionButtonText: {
    fontSize: 18, // Increased from 17
    fontWeight: '700', // Increased from 600
    marginLeft: 10, // Increased from 8
    letterSpacing: 0.2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: platformStyles.spacing.huge,
  },
  emptyTitle: {
    fontSize: 30, // Increased from 26
    fontWeight: '800', // Increased weight
    marginBottom: 12, // Increased from 10
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 18, // Increased from 17
    textAlign: 'center',
    lineHeight: 28, // Increased from 26
    marginBottom: platformStyles.spacing.huge, // Increased from xxxl
    letterSpacing: 0.2,
  },
  setupButton: {
    paddingHorizontal: platformStyles.spacing.huge, // Increased from xxxl
    paddingVertical: platformStyles.spacing.lg + 4, // Increased
    borderRadius: platformStyles.borderRadius.xxl, // Increased from large
  },
  setupButtonText: {
    color: 'white',
    fontSize: 18, // Increased from 17
    fontWeight: '700', // Increased from 600
    letterSpacing: 0.3,
  },
  qrPlaceholder: {
    width: 240, // Increased from 220
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: platformStyles.borderRadius.xl, // Increased from 8
  },
  qrPlaceholderText: {
    fontSize: 18, // Increased from 17
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});