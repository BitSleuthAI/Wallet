import { ScreenLoading } from '@/components/ScreenLoading';
import { GradientBackground } from '@/components/GradientBackground';
import { toast } from '@/components/Toast';
import WalletSelector from '@/components/WalletSelector';
import { ADDRESS_GENERATION_COOLDOWN_MS, GAP_LIMIT_WARNING_THRESHOLD } from '@/constants/cache';
import { createButtonStyle, platformStyles } from '@/constants/themes';
import { useTabAnimation } from '@/hooks/use-tab-animation';
import { useWallet } from '@/hooks/wallet-store';
import { HapticService } from '@/services/haptic-service';
import { loadWalletService } from '@/utils/wallet-service-loader';
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

// Define Android-specific bottom padding for action buttons area
const ANDROID_BOTTOM_PADDING = 120;

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
    return <ScreenLoading />;
  }
  
  return <ReceiveScreenContent walletContext={walletContext} />;
}

// Main component with all hooks
function ReceiveScreenContent({ walletContext }: { walletContext: ReturnType<typeof useWallet> }) {
  const { animatedStyle } = useTabAnimation(2); // Receive tab = index 2
  const { currentWallet, generateNewAddress, theme, incrementUsageCount } = walletContext; // Context is guaranteed non-null by wrapper
  const spinValue = useRef(new Animated.Value(0)).current;
  
  // Initialize state hooks with empty string, will be loaded async
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [isGeneratingAddress, setIsGeneratingAddress] = useState<boolean>(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(true);
  const [lastGenTime, setLastGenTime] = useState<number>(0);

  // NOTE: Removed aggressive cache clearing on focus - this was causing slow load times
  // Cache TTL (2 minutes) provides sufficient freshness while maintaining performance
  // The address discovery service handles cache invalidation appropriately

  // Load receiving address when wallet changes
  // OPTIMIZED: Show wallet's last address immediately for instant UI, then verify in background
  // This eliminates the 5-15 second delay while still ensuring address freshness
  useEffect(() => {
    if (!currentWallet?.xpub) {
      setIsLoadingAddress(false);
      return;
    }

    // INSTANT: Use wallet's last address immediately (no API calls)
    // This ensures the QR code appears instantly when opening the Receive tab
    const lastAddress = currentWallet.addresses?.[currentWallet.addresses.length - 1] || '';
    if (lastAddress) {
      console.log('⚡ Showing wallet address instantly:', lastAddress.substring(0, 20) + '...');
      setCurrentAddress(lastAddress);
      setIsLoadingAddress(false);
    }

    // BACKGROUND: Verify/find first unused address (non-blocking)
    // This runs after the UI is already displayed
    const verifyAddressInBackground = async () => {
      try {
        console.log('🔍 Background: Verifying first unused receiving address...');

        const unusedAddress = walletService.getFirstUnusedReceivingAddress
          ? await walletService.getFirstUnusedReceivingAddress(currentWallet.xpub)
          : null;

        if (unusedAddress && unusedAddress !== lastAddress) {
          console.log('✅ Background: Found different unused address:', unusedAddress.substring(0, 20) + '...');
          setCurrentAddress(unusedAddress);
        } else {
          console.log('✅ Background: Current address is valid');
        }
      } catch (error) {
        console.error('⚠️ Background verification failed (keeping current address):', error);
        // Keep the current address on error - don't disrupt the UI
      }
    };

    // Only run background verification if we have an address to verify
    if (lastAddress) {
      verifyAddressInBackground();
    } else {
      // No addresses in wallet yet - need to wait for initial address generation
      setIsLoadingAddress(true);
      walletService.getFirstUnusedReceivingAddress?.(currentWallet.xpub)
        .then(unusedAddress => {
          if (unusedAddress) {
            setCurrentAddress(unusedAddress);
          }
        })
        .catch(error => {
          console.error('❌ Failed to load initial address:', error);
        })
        .finally(() => {
          setIsLoadingAddress(false);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWallet?.xpub, currentWallet?.addresses?.length]); // walletService and stable setters/callbacks are intentionally omitted to avoid unnecessary refetch loops

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

  const hasValidAddress = currentAddress.trim().length > 0 && currentAddress !== 'No address available';

  const handleNewAddress = async () => {
    if (isGeneratingAddress) return;
    HapticService.medium();
    
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
      console.log('🔄 Generating new address...');
      const result = await generateNewAddress(currentWallet);
      if (result.success && result.wallet) {
        // Get the newly generated address - this is guaranteed to be unused
        const newlyGeneratedAddress = result.wallet.addresses[result.wallet.addresses.length - 1];
        console.log('✅ New address generated:', newlyGeneratedAddress);

        // FIXED: Directly use the newly generated address instead of calling getFirstUnusedReceivingAddress
        // The previous approach used stale cache that didn't include the new address
        setCurrentAddress(newlyGeneratedAddress);

        // Clear the address metadata cache so future lookups get fresh data
        if (walletService.clearAddressCache) {
          walletService.clearAddressCache(currentWallet.xpub);
        }

        // Check if user has generated many unused addresses (gap limit warning)
        const addressCount = result.wallet.addresses.length;

        if (addressCount >= GAP_LIMIT_WARNING_THRESHOLD) {
          Alert.alert(
            'Address Limit Warning',
            `You have generated ${addressCount} addresses. For wallet recovery, Bitcoin wallets typically scan only the first 20 addresses without transactions. Consider using existing addresses or funding some addresses before generating more.`,
            [{ text: 'OK', style: 'default' }]
          );
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
      setLastGenTime(now); // Cooldown set after address generation attempt (regardless of success)
    }
  };

  const handleCopy = async () => {
    try {
      if (!hasValidAddress) {
        toast.error('No address available to copy');
        return;
      }

      await Clipboard.setStringAsync(currentAddress);
      toast.success('Copied!', 'Address copied to clipboard');
    } catch (error) {
      console.error('Error copying address:', error);
      toast.error('Copy failed', 'Could not copy address to clipboard');
    }
  };

  const handleShare = async () => {
    try {
      if (!hasValidAddress) {
        toast.error('No address available to share');
        return;
      }

      HapticService.light();
      await Share.share({
        message: `Bitcoin Address: ${currentAddress}`,
        title: 'Bitcoin Address',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      try {
        if (hasValidAddress) {
          await Clipboard.setStringAsync(currentAddress);
          toast.info('Copied instead', 'Address copied to clipboard');
        } else {
          toast.error('No address available');
        }
      } catch (clipboardError) {
        console.error('Clipboard error:', clipboardError);
        toast.error('Share failed', 'Unable to share or copy address');
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
            ) : hasValidAddress ? (
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
                  No address available
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
    paddingBottom: Platform.OS === 'android' ? ANDROID_BOTTOM_PADDING : platformStyles.spacing.xxl, // Increased from xl
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
