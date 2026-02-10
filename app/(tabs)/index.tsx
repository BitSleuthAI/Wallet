import FeedbackPopup from '@/components/FeedbackPopup';
import { GradientBackground, GradientCard } from '@/components/GradientBackground';
import { LiquidGlassView } from '@/components/LiquidGlassView';
import BalanceChart from '@/components/PriceChart';
import { HomeScreenSkeleton } from '@/components/SkeletonLoader';
import TransactionItem from '@/components/TransactionItem';
import WalletCard from '@/components/WalletCard';
import { createButtonStyle, platformStyles } from '@/constants/themes';
import { WALLET_COLOR_PALETTE } from '@/constants/wallet-colors';
import { useTabAnimation } from '@/hooks/use-tab-animation';
import { useWallet } from '@/hooks/wallet-store';
import { HapticService } from '@/services/haptic-service';
import { Wallet } from '@/types/wallet';
import { isIOS26OrHigher } from '@/utils/platform';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Check, Eye, EyeOff, Plus, TrendingUp, WifiOff, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type TimePeriod = '1D' | '1W' | '1M' | '1Y' | 'All';

type CarouselItem = 
  | { type: 'wallet'; wallet: Wallet }
  | { type: 'add' };

// Carousel constants
const WALLET_CARD_WIDTH = 340;
const WALLET_CARD_MARGIN = 16;
const CARD_SNAP_INTERVAL = WALLET_CARD_WIDTH + WALLET_CARD_MARGIN; // 356px

// Wrapper component that checks for context availability
export default function WalletScreen() {
  const walletContext = useWallet();
  
  // Safety check: if context is not available yet, show loading
  if (!walletContext) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    );
  }
  
  return <WalletScreenContent />;
}

// Main component with all hooks
function WalletScreenContent() {
  const { animatedStyle } = useTabAnimation(0); // Wallet tab = index 0
  const {
    wallets,
    currentWallet,
    currentWalletId,
    switchWallet,
    editWallet,
    balance,
    balanceUSD,
    bitcoinPrice,
    transactions,
    theme,
    refreshData,
    hasBalanceError,
    hasTransactionsError,
    hasPriceError,
    isLoading,
    formatCurrency,
    hideBalance,
    setHideBalanceSetting,
    shouldShowFeedbackPrompt,
    markFeedbackPromptShown,
    markFeedbackPromptDismissed,
    markFeedbackSubmitted,
    incrementUsageCount,
  } = useWallet()!; // Non-null assertion is safe here because wrapper checked
  
  // Initialize all state hooks
  const [refreshing, setRefreshing] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editColor, setEditColor] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
  const [showFeedbackPopup, setShowFeedbackPopup] = useState<boolean>(false);
  const carouselRef = useRef<FlatList<CarouselItem>>(null);

  const onRefresh = useCallback(async () => {
    HapticService.medium();
    setRefreshing(true);
    await refreshData();
    HapticService.success();
    setRefreshing(false);
    incrementUsageCount('data_refresh');
  }, [refreshData, incrementUsageCount]);

  const handleEditWallet = useCallback((wallet: Wallet) => {
    setEditingWallet(wallet);
    setEditName(wallet.name);
    setEditColor(wallet.color);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingWallet || !editName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }

    try {
      await editWallet(editingWallet.id, editName.trim(), editColor);
      setEditingWallet(null);
      setEditName('');
      setEditColor('');
    } catch (error) {
      console.error('Failed to update wallet:', error);
      Alert.alert('Error', 'Failed to update wallet');
    }
  }, [editingWallet, editName, editColor, editWallet]);

  const handleCancelEdit = useCallback(() => {
    setEditingWallet(null);
    setEditName('');
    setEditColor('');
  }, []);



  const formatPriceChange = useCallback((change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }, []);

  // Handle feedback prompt display
  useEffect(() => {
    if (shouldShowFeedbackPrompt && !showFeedbackPopup) {
      // Show feedback popup after a longer delay to ensure user has had time to use the app
      const timer = setTimeout(() => {
        setShowFeedbackPopup(true);
        markFeedbackPromptShown();
      }, 5000); // Increased delay to 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [shouldShowFeedbackPrompt, showFeedbackPopup, markFeedbackPromptShown]);

  const handleFeedbackDismiss = useCallback(() => {
    setShowFeedbackPopup(false);
    markFeedbackPromptDismissed();
  }, [markFeedbackPromptDismissed]);

  const handleFeedbackSubmit = useCallback(() => {
    setShowFeedbackPopup(false);
    markFeedbackSubmitted();
  }, [markFeedbackSubmitted]);

  // Auto-scroll to active wallet when it changes
  useEffect(() => {
    if (currentWalletId && Array.isArray(wallets) && wallets.length > 0 && carouselRef.current) {
      const walletIndex = wallets.findIndex(w => w.id === currentWalletId);
      if (walletIndex !== -1) {
        // Use requestAnimationFrame to ensure the FlatList has completed rendering
        requestAnimationFrame(() => {
          setTimeout(() => {
            carouselRef.current?.scrollToIndex({
              index: walletIndex, // walletIndex matches the data array since wallets come before "add" item
              animated: true,
              viewPosition: 0.5, // Center the item in the viewport
            });
          }, 100); // Reduced timeout for better responsiveness
        });
      }
    }
  }, [currentWalletId, wallets]); // Include wallets to prevent stale closure

  // Memoize wallet data early to ensure consistent hook order
  const walletDataForList = useMemo(() => {
    if (!wallets || !Array.isArray(wallets)) {
      return [{ type: 'add' as const }];
    }
    return [...wallets.map(wallet => ({ type: 'wallet' as const, wallet })), { type: 'add' as const }];
  }, [wallets]);

  // Define renderItem at component level to avoid hooks violation
  const renderCarouselItem = useCallback(({ item }: { item: CarouselItem }) => {
    if (item.type === 'add') {
      return (
        <TouchableOpacity 
          style={[
            styles.addWalletCard, 
            { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.primary,
              borderWidth: 2,
              borderStyle: 'dashed',
            }
          ]}
          onPress={() => router.push('/wallet-setup')}
          activeOpacity={0.7}
        >
          <View style={[styles.addWalletIcon, { backgroundColor: theme.colors.primary }]}>
            <Plus color="white" size={24} />
          </View>
          <Text style={[styles.addWalletText, { color: theme.colors.primary }]}>Add new wallet</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.walletCardContainer}>
        <WalletCard 
          wallet={item.wallet} 
          isActive={item.wallet.id === currentWalletId}
          onPress={() => {
            if (item.wallet.id !== currentWalletId) {
              switchWallet(item.wallet.id);
              // Track usage when user switches wallets
              incrementUsageCount('wallet_switch');
              // Scroll will be handled automatically by useEffect
            }
          }}
          onEdit={handleEditWallet}
        />
      </View>
    );
  }, [theme.colors.surface, theme.colors.primary, currentWalletId, switchWallet, handleEditWallet, incrementUsageCount]);

  // Show skeleton loading state while wallet is being loaded
  if (isLoading) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ title: 'Wallet', headerShown: false }} />
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <HomeScreenSkeleton />
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Show empty state only if not loading and no wallet found
  if (!currentWallet) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ title: 'Wallet', headerShown: false }} />
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Wallet Found
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Create or import a wallet to get started
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
            title: 'Wallet',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: theme.colors.text,
          }}
        />
        
        <Animated.View style={[styles.animatedContainer, animatedStyle]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: theme.colors.text }]}>
                {currentWallet.name}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Wallet balance
              </Text>
            </View>
            
            <View style={styles.priceContainer}>
              <View style={styles.bitcoinInfo}>
                <View style={styles.bitcoinIcon}>
                  <Text style={styles.bitcoinSymbol}>₿</Text>
                </View>
                <View>
                  <Text style={[styles.bitcoinLabel, { color: theme.colors.textSecondary }]}>
                    BTC Bitcoin
                  </Text>
                  <View style={styles.priceRow}>
                    {hasPriceError ? (
                      <View style={styles.errorContainer}>
                        <WifiOff color={theme.colors.textSecondary} size={14} />
                        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
                          Price loading...
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text style={[styles.bitcoinPrice, { color: theme.colors.text }]}>
                          {formatCurrency(bitcoinPrice?.usd || 0)}
                        </Text>
                        <Text style={[
                          styles.priceChange,
                          { color: (bitcoinPrice?.usd_24h_change || 0) >= 0 ? theme.colors.success : theme.colors.error }
                        ]}>
                          {formatPriceChange(bitcoinPrice?.usd_24h_change || 0)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>

        {/* Wallet Carousel */}
        <View style={styles.walletCarousel}>
          <FlatList<CarouselItem>
            ref={carouselRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled={false}
            decelerationRate="fast"
            snapToInterval={CARD_SNAP_INTERVAL}
            snapToAlignment="start"
            data={walletDataForList}
            keyExtractor={(item, index) => `${item.type}-${index}`}
            renderItem={renderCarouselItem}
            contentContainerStyle={styles.carouselContent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={3}
            windowSize={5}
            initialNumToRender={3}
            onScrollToIndexFailed={(info) => {
              // Handle scroll failure by waiting and retrying
              const wait = new Promise(resolve => setTimeout(resolve, 500));
              wait.then(() => {
                try {
                  carouselRef.current?.scrollToIndex({ 
                    index: info.index, 
                    animated: true,
                    viewPosition: 0.5 
                  });
                } catch (error) {
                  // If retry fails, fall back to scrollToOffset for more reliable positioning
                  console.warn('Failed to scroll to wallet index after retry:', error);
                  const offset = info.index * CARD_SNAP_INTERVAL;
                  carouselRef.current?.scrollToOffset({ offset, animated: true });
                }
              });
            }}
          />
        </View>

        {/* Balance Display */}
        <View style={styles.balanceSection}>
          <GradientCard theme={theme} style={styles.balanceCardInner} variant={theme.isDark ? 'glow' : 'primary'}>
            {hasBalanceError ? (
              <View style={styles.balanceErrorContainer}>
                <WifiOff color={theme.colors.textSecondary} size={24} />
                <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
                  Balance Loading...
                </Text>
                <Text style={[styles.errorSubtitle, { color: theme.colors.textSecondary }]}>
                  Bitcoin APIs are temporarily unavailable. Your wallet is safe.
                </Text>
                <TouchableOpacity 
                  style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={refreshData}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.balanceContainer}>
                  <TouchableOpacity
                    style={[styles.eyeButton, { backgroundColor: theme.colors.background }]}
                    onPress={() => {
                      HapticService.light();
                      setHideBalanceSetting(!hideBalance);
                      incrementUsageCount('settings_interaction');
                    }}
                  >
                    {hideBalance ? (
                      <EyeOff color={theme.colors.textSecondary} size={20} />
                    ) : (
                      <Eye color={theme.colors.textSecondary} size={20} />
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.mainBalance, { color: theme.colors.text }]}>
                    {hideBalance ? '••••••••' : (hasPriceError ? `${balance.toFixed(8)} BTC` : formatCurrency(balanceUSD))}
                  </Text>
                </View>
                <Text style={[styles.btcBalance, { color: theme.colors.textSecondary }]}>
                  {hideBalance ? 'Balance hidden' : (hasPriceError ? 'USD value unavailable' : `${balance.toFixed(8)} BTC`)}
                </Text>
                {!hideBalance && !hasPriceError && balanceUSD > 0 && bitcoinPrice?.usd_24h_change !== undefined && (
                  <View style={styles.changeContainer}>
                    <TrendingUp color={bitcoinPrice.usd_24h_change >= 0 ? theme.colors.success : theme.colors.error} size={16} />
                    <Text style={[styles.changeText, { color: bitcoinPrice.usd_24h_change >= 0 ? theme.colors.success : theme.colors.error }]}>
                      {bitcoinPrice.usd_24h_change >= 0 ? '+' : ''}{formatCurrency((balanceUSD * bitcoinPrice.usd_24h_change) / 100)} ({bitcoinPrice.usd_24h_change >= 0 ? '+' : ''}{bitcoinPrice.usd_24h_change.toFixed(2)}%) 24h
                    </Text>
                  </View>
                )}
              </>
            )}
          </GradientCard>
        </View>

        {/* Time Period Selector */}
        <LiquidGlassView variant="thin" intensity={75} style={[
          styles.periodSelector, 
          styles.glassCard,
          Platform.OS === 'android' && {
            backgroundColor: theme.colors.surface,
          }
        ]}>
          <View style={styles.periodSelectorInner}>
            {(['1D', '1W', '1M', '1Y', 'All'] as TimePeriod[]).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod !== period && { 
                    backgroundColor: theme.isDark 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                  selectedPeriod === period && { 
                    backgroundColor: theme.colors.primary,
                    transform: [{ scale: 1.05 }],
                    shadowOpacity: 0.15,
                    elevation: 3,
                  },
                ]}
                onPress={() => {
                  HapticService.light();
                  setSelectedPeriod(period);
                  incrementUsageCount('settings_interaction');
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.periodText,
                  { color: selectedPeriod === period ? 'white' : theme.colors.textSecondary }
                ]}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LiquidGlassView>

        {/* Balance Chart */}
        <LiquidGlassView variant="thin" intensity={80} style={[
          styles.chartContainer, 
          styles.glassCard,
          Platform.OS === 'android' && {
            backgroundColor: theme.colors.surface,
          }
        ]}>
          <BalanceChart selectedPeriod={selectedPeriod} />
        </LiquidGlassView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              createButtonStyle(theme, 'primary'),
              styles.sendButton,
            ]}
            onPress={() => {
              HapticService.medium();
              router.push('/(tabs)/send');
            }}
            activeOpacity={0.85}
          >
            <ArrowUpRight color="white" size={20} />
            <Text style={styles.actionButtonText}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              createButtonStyle(theme, 'secondary'),
              styles.receiveButton,
            ]}
            onPress={() => {
              HapticService.medium();
              router.push('/(tabs)/receive');
            }}
            activeOpacity={0.85}
          >
            <ArrowDownLeft color={theme.colors.text} size={20} />
            <Text style={[styles.receiveButtonText, { color: theme.colors.text }]}>Receive</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <LiquidGlassView variant="thin" intensity={80} style={[
          styles.transactionsSection, 
          styles.glassCard,
          Platform.OS === 'android' && {
            backgroundColor: theme.colors.surface,
          }
        ]}>
          <View style={styles.transactionsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Transactions
            </Text>
            <View style={styles.transactionsHeaderActions}>
              <TouchableOpacity onPress={() => router.push('/transaction-history')}>
                <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {hasTransactionsError ? (
            <View style={styles.transactionsErrorContainer}>
              <WifiOff color={theme.colors.textSecondary} size={32} />
              <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
                Loading Transactions...
              </Text>
              <Text style={[styles.errorSubtitle, { color: theme.colors.textSecondary }]}>
                Bitcoin APIs are temporarily unavailable. Your transactions are safe.
              </Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                onPress={refreshData}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyTransactionsContainer}>
              <Text style={[styles.emptyTransactionsText, { color: theme.colors.textSecondary }]}>
                No transactions yet
              </Text>
            </View>
          ) : (
            transactions.slice(0, 5).map((transaction: any, idx: number) => (
              <TransactionItem
                key={transaction.txid}
                transaction={transaction}
                index={idx}
              />
            ))
          )}
        </LiquidGlassView>
        </ScrollView>
      </Animated.View>
      
      {/* Edit Wallet Modal */}
      <Modal
        visible={!!editingWallet}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        {isIOS26OrHigher() ? (
          <LiquidGlassView variant="ultraThin" intensity={95} style={styles.modalOverlay}>
            <View style={[styles.editModal, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: theme.colors.text }]}>Edit Wallet</Text>
                <TouchableOpacity onPress={handleCancelEdit}>
                  <X color={theme.colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.editModalContent}>
                <Text style={[styles.editLabel, { color: theme.colors.text }]}>Wallet Name</Text>
                <TextInput
                  style={[styles.editInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter wallet name"
                  placeholderTextColor={theme.colors.textSecondary}
                  underlineColorAndroid="transparent"
                />
                
                <Text style={[styles.editLabel, { color: theme.colors.text }]}>Color</Text>
                <View style={styles.colorPicker}>
                  {WALLET_COLOR_PALETTE.map((colorOption) => {
                    const gradientColors = colorOption.gradient;
                    return (
                      <TouchableOpacity
                        key={colorOption.id}
                        style={[
                          styles.colorOption,
                          editColor === colorOption.base && { ...styles.selectedColor, borderColor: theme.colors.primary }
                        ]}
                        onPress={() => setEditColor(colorOption.base)}
                      >
                        <LinearGradient
                          colors={gradientColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.colorGradient}
                        />
                        {editColor === colorOption.base && (
                          <View style={styles.colorCheckmark}>
                            <Check color="white" size={16} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              
              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={[styles.editCancelButton, { borderColor: theme.colors.border }]}
                  onPress={handleCancelEdit}
                >
                  <Text style={[styles.editCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.editSaveButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.editSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LiquidGlassView>
        ) : (
          <View style={styles.modalOverlay}>
            <View style={[styles.editModal, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: theme.colors.text }]}>Edit Wallet</Text>
                <TouchableOpacity onPress={handleCancelEdit}>
                  <X color={theme.colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.editModalContent}>
                <Text style={[styles.editLabel, { color: theme.colors.text }]}>Wallet Name</Text>
                <TextInput
                  style={[styles.editInput, { 
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter wallet name"
                  placeholderTextColor={theme.colors.textSecondary}
                  underlineColorAndroid="transparent"
                />
                
                <Text style={[styles.editLabel, { color: theme.colors.text }]}>Color</Text>
                <View style={styles.colorPicker}>
                  {WALLET_COLOR_PALETTE.map((colorOption) => {
                    const gradientColors = colorOption.gradient;
                    return (
                      <TouchableOpacity
                        key={colorOption.id}
                        style={[
                          styles.colorOption,
                          editColor === colorOption.base && { ...styles.selectedColor, borderColor: theme.colors.primary }
                        ]}
                        onPress={() => setEditColor(colorOption.base)}
                      >
                        <LinearGradient
                          colors={gradientColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.colorGradient}
                        />
                        {editColor === colorOption.base && (
                          <View style={styles.colorCheckmark}>
                            <Check color="white" size={16} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              
              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={[styles.editCancelButton, { borderColor: theme.colors.border }]}
                  onPress={handleCancelEdit}
                >
                  <Text style={[styles.editCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.editSaveButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.editSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
      
      {/* Feedback Popup */}
      <FeedbackPopup 
        visible={showFeedbackPopup} 
        onDismiss={handleFeedbackDismiss}
        onSubmitFeedback={handleFeedbackSubmit}
      />
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // Add sufficient bottom padding to prevent content from going under tab bar
    paddingBottom: platformStyles.tabBarBottomPadding,
    // Add top padding for content breathing room
    paddingTop: platformStyles.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: platformStyles.spacing.xl,
    paddingTop: platformStyles.spacing.xl, // Balanced top padding
    paddingBottom: platformStyles.spacing.xl,
    marginBottom: platformStyles.spacing.md,
  },
  greeting: {
    fontSize: platformStyles.typography.heading.fontSize, // Use uniform typography
    fontWeight: platformStyles.typography.heading.fontWeight,
    letterSpacing: platformStyles.typography.heading.letterSpacing,
    lineHeight: platformStyles.typography.heading.lineHeight,
  },
  subtitle: {
    fontSize: platformStyles.typography.bodyLarge.fontSize,
    lineHeight: platformStyles.typography.bodyLarge.lineHeight,
    letterSpacing: platformStyles.typography.bodyLarge.letterSpacing,
    marginTop: 4,
    opacity: 0.8, // Subtle fade for subtitle
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  bitcoinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bitcoinIcon: {
    width: 40, // Increased from 36 for better visibility
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12, // Increased from 10
    ...platformStyles.shadow,
  },
  bitcoinSymbol: {
    color: 'white',
    fontSize: 20, // Increased from 18
    fontWeight: '700', // More specific weight
  },
  bitcoinLabel: {
    fontSize: 15,
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bitcoinPrice: {
    fontSize: 16, // Increased from 15
    fontWeight: '600',
    marginRight: 6, // Increased from 4
    letterSpacing: 0.1,
  },
  priceChange: {
    fontSize: 14, // Increased from 13
    fontWeight: '600', // Increased from 500
    letterSpacing: 0.1,
  },
  balanceSection: {
    marginHorizontal: platformStyles.spacing.xl,
    marginTop: platformStyles.spacing.xl,
    marginBottom: platformStyles.spacing.xxl, // Add space below balance
  },
  balanceContainer: {
    position: 'relative',
    marginBottom: platformStyles.spacing.md,
    justifyContent: 'center',
    alignItems: 'center', // Center align balance
  },
  mainBalance: {
    fontSize: platformStyles.typography.display.fontSize, 
    fontWeight: platformStyles.typography.display.fontWeight,
    textAlign: 'center',
    letterSpacing: platformStyles.typography.display.letterSpacing,
    lineHeight: platformStyles.typography.display.lineHeight,
    paddingHorizontal: 20, // Add padding instead of fixed paddingRight
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: '50%', // Center vertically relative to balance
    transform: [{ translateY: -20 }], // Adjust for icon size/padding
    padding: 12,
    borderRadius: platformStyles.borderRadius.round, // Fully rounded
    zIndex: 1,
  },
  btcBalance: {
    fontSize: platformStyles.typography.bodyLarge.fontSize,
    fontWeight: platformStyles.typography.bodyLarge.fontWeight,
    marginBottom: platformStyles.spacing.lg,
    letterSpacing: platformStyles.typography.bodyLarge.letterSpacing,
    textAlign: 'center', // Center align
    opacity: 0.9,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Increased from 6
  },
  changeText: {
    fontSize: 16, // Increased from 15
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  periodSelector: {
    marginHorizontal: platformStyles.spacing.xl,
    marginTop: platformStyles.spacing.xxl, // Increased from xl
    borderRadius: platformStyles.borderRadius.xxl, // Increased from xl
    ...platformStyles.shadow,
  },
  periodButton: {
    flex: 1,
    paddingVertical: platformStyles.spacing.md + 2, // Increased from md
    paddingHorizontal: platformStyles.spacing.sm + 2, // Increased from sm
    borderRadius: platformStyles.borderRadius.large, // Increased from medium
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  periodText: {
    fontSize: 16, // Increased from 15
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: platformStyles.spacing.xl,
    marginTop: platformStyles.spacing.xxxl, // Increased from xxl
    gap: platformStyles.spacing.lg,
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.lg + 2, // Increased
    borderRadius: platformStyles.borderRadius.xxl, // Increased from xl
    ...platformStyles.buttonShadow,
  },
  receiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.lg + 2, // Increased
    borderRadius: platformStyles.borderRadius.xxl, // Increased from xl
    ...platformStyles.shadow,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18, // Increased from 17
    fontWeight: '700', // Increased from 600
    marginLeft: 10, // Increased from 8
    letterSpacing: 0.2,
  },
  receiveButtonText: {
    fontSize: 18, // Increased from 17
    fontWeight: '700', // Increased from 600
    marginLeft: 10, // Increased from 8
    letterSpacing: 0.2,
  },
  transactionsSection: {
    marginTop: platformStyles.spacing.xl,
    marginHorizontal: platformStyles.spacing.xl,
    padding: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.xxl,
    ...platformStyles.cardShadow, // Consistent shadow
    overflow: 'hidden', // Ensure glass effect is contained
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.xxl, // Increased from xl
  },
  transactionsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 24, // Increased from 22
    fontWeight: '700', // More specific weight
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: 16, // Increased from 15
    fontWeight: '600', // Increased from 500
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  balanceErrorContainer: {
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.xl,
  },
  transactionsErrorContainer: {
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.huge,
    paddingHorizontal: platformStyles.spacing.xl,
  },
  errorTitle: {
    fontSize: 19,
    fontWeight: '600',
    marginTop: platformStyles.spacing.md,
    marginBottom: platformStyles.spacing.sm,
  },
  errorSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: platformStyles.spacing.xl,
  },
  retryButton: {
    paddingHorizontal: platformStyles.spacing.xxl,
    paddingVertical: platformStyles.spacing.md,
    borderRadius: platformStyles.borderRadius.large,
    ...platformStyles.buttonShadow,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyTransactionsContainer: {
    alignItems: 'center',
    paddingVertical: platformStyles.spacing.huge,
  },
  emptyTransactionsText: {
    fontSize: 17,
  },
  walletCarousel: {
    marginVertical: platformStyles.spacing.xl,
  },
  carouselContent: {
    paddingHorizontal: platformStyles.spacing.xl,
  },
  walletCardContainer: {
    marginRight: platformStyles.spacing.lg,
  },
  addWalletCard: {
    width: 220, // Increased from 200
    height: 160, // Increased from 140
    borderRadius: platformStyles.borderRadius.xxl, // Increased from xl
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  addWalletIcon: {
    width: 56, // Increased from 52
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.md, // Increased from sm
    ...platformStyles.shadow,
  },
  addWalletText: {
    fontSize: 16, // Increased from 15
    fontWeight: '600', // Increased from 500
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Increased opacity from 0.5 for better focus
    justifyContent: 'center',
    alignItems: 'center',
    padding: platformStyles.spacing.xxl, // Increased from xl
  },
  editModal: {
    width: '100%',
    maxWidth: 420, // Increased from 400
    borderRadius: platformStyles.borderRadius.xxxl, // Increased from xxl
    padding: 0,
    ...platformStyles.cardShadow,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: platformStyles.spacing.xxl, // Increased from xl
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  editModalTitle: {
    fontSize: 22, // Increased from 19
    fontWeight: '700', // Increased from 600
    letterSpacing: -0.2,
  },
  editModalContent: {
    padding: platformStyles.spacing.xxl, // Increased from xl
  },
  editLabel: {
    fontSize: 16, // Increased from 15
    fontWeight: '600', // Increased from 500
    marginBottom: platformStyles.spacing.md, // Increased from sm
    marginTop: platformStyles.spacing.xl, // Increased from lg
    letterSpacing: 0.2,
  },
  editInput: {
    borderWidth: 2, // Increased from 1.5
    borderRadius: platformStyles.borderRadius.xl, // Increased from large
    paddingHorizontal: platformStyles.spacing.lg + 4, // Increased
    paddingVertical: platformStyles.spacing.md + 4, // Increased
    fontSize: 18, // Increased from 17
    letterSpacing: 0.2,
    // borderColor will be set dynamically via theme.colors.border
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: platformStyles.spacing.lg, // Increased from md
    marginTop: platformStyles.spacing.md, // Increased from sm
  },
  colorOption: {
    width: 52, // Increased from 48
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...platformStyles.shadow,
  },
  selectedColor: {
    // borderColor will be set dynamically via theme.colors.primary
    borderWidth: 4, // Increased from 3 for better visibility
  },
  colorGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  colorCheckmark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: platformStyles.borderRadius.medium,
    padding: 3,
  },
  editModalActions: {
    flexDirection: 'row',
    padding: platformStyles.spacing.xxl, // Increased from xl
    gap: platformStyles.spacing.lg, // Increased from md
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: platformStyles.spacing.md + 4, // Increased
    borderRadius: platformStyles.borderRadius.xl, // Increased from large
    borderWidth: 2, // Increased from 1.5
    alignItems: 'center',
    // borderColor will be set dynamically via theme.colors.border
  },
  editCancelText: {
    fontSize: 18, // Increased from 17
    fontWeight: '600', // Increased from 500
    letterSpacing: 0.2,
    // color will be set dynamically via theme.colors.textSecondary
  },
  editSaveButton: {
    flex: 1,
    paddingVertical: platformStyles.spacing.md + 4, // Increased
    borderRadius: platformStyles.borderRadius.xl, // Increased from large
    // backgroundColor will be set dynamically via theme.colors.primary
    alignItems: 'center',
    ...platformStyles.buttonShadow,
  },
  editSaveText: {
    fontSize: 18, // Increased from 17
    fontWeight: '700', // Increased from 600
    color: 'white',
    letterSpacing: 0.3,
  },
  chartContainer: {
    marginTop: platformStyles.spacing.xl,
    marginHorizontal: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.xxl,
    overflow: 'hidden',
    ...platformStyles.cardShadow,
  },
  animatedContainer: {
    flex: 1,
  },
  glassCard: {
    borderRadius: platformStyles.borderRadius.xxl,
    overflow: 'hidden',
  },
  balanceCardInner: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  periodSelectorInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: platformStyles.spacing.lg,
  },
});