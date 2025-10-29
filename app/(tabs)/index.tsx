import FeedbackPopup from '@/components/FeedbackPopup';
import { GradientBackground, GradientCard } from '@/components/GradientBackground';
import { LiquidGlassView } from '@/components/LiquidGlassView';
import BalanceChart from '@/components/PriceChart';
import TransactionItem from '@/components/TransactionItem';
import WalletCard from '@/components/WalletCard';
import { createButtonStyle, platformStyles } from '@/constants/themes';
import { WALLET_COLOR_PALETTE } from '@/constants/wallet-colors';
import { useTabAnimation } from '@/hooks/use-tab-animation';
import { useWallet } from '@/hooks/wallet-store';
import { Wallet } from '@/types/wallet';
import { isIOS18OrHigher } from '@/utils/platform';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Check, Eye, EyeOff, Plus, TrendingUp, WifiOff, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export default function WalletScreen() {
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
    isLoadingBalance,
    isLoadingTransactions,
    isLoadingPrice,
    formatCurrency,
    getCurrencySymbol,
    selectedCurrency,
    hideBalance,
    setHideBalanceSetting,
    shouldShowFeedbackPrompt,
    markFeedbackPromptShown,
    markFeedbackPromptDismissed,
    markFeedbackSubmitted,
    incrementUsageCount,
  } = useWallet();

  const [refreshing, setRefreshing] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editColor, setEditColor] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
  const [showFeedbackPopup, setShowFeedbackPopup] = useState<boolean>(false);
  const carouselRef = useRef<FlatList<CarouselItem>>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
    // Track usage when user refreshes data
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

  // Show loading state while wallet is being loaded
  if (isLoading) {
    return (
      <GradientBackground theme={theme} variant="primary" direction="vertical">
        <SafeAreaView style={styles.container}>
          <Stack.Screen options={{ title: 'Wallet', headerShown: false }} />
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              Loading Wallet...
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Please wait while we load your wallet
            </Text>
          </View>
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
            snapToInterval={336} // 320 (card width) + 16 (margin)
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
                  const offset = info.index * 336; // 320 (card width) + 16 (margin)
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
            backgroundColor: '#FFFFFF',
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
            backgroundColor: '#FFFFFF',
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
            onPress={() => router.push('/(tabs)/send')}
          >
            <ArrowUpRight color="white" size={20} />
            <Text style={styles.actionButtonText}>Send</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              createButtonStyle(theme, 'secondary'),
              styles.receiveButton,
            ]}
            onPress={() => router.push('/(tabs)/receive')}
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
            backgroundColor: '#FFFFFF',
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
            transactions.slice(0, 5).map((transaction: any) => (
              <TransactionItem
                key={transaction.txid}
                transaction={transaction}
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
        {isIOS18OrHigher() ? (
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
                          editColor === colorOption.base && styles.selectedColor
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
                          editColor === colorOption.base && styles.selectedColor
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
    paddingBottom: Platform.OS === 'android' ? 100 : platformStyles.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: platformStyles.spacing.xl,
    paddingTop: platformStyles.spacing.xl,
    paddingBottom: platformStyles.spacing.md,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  bitcoinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bitcoinIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    ...platformStyles.shadow,
  },
  bitcoinSymbol: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bitcoinLabel: {
    fontSize: 13,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bitcoinPrice: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
  },
  priceChange: {
    fontSize: 13,
    fontWeight: '500',
  },
  balanceSection: {
    marginHorizontal: platformStyles.spacing.xl,
    marginTop: platformStyles.spacing.xl,
  },
  balanceContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  mainBalance: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 10,
    borderRadius: platformStyles.borderRadius.xl,
    zIndex: 1,
  },
  btcBalance: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 12,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  periodSelector: {
    marginHorizontal: platformStyles.spacing.xl,
    marginTop: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.xl,
    ...platformStyles.shadow,
  },
  periodButton: {
    flex: 1,
    paddingVertical: platformStyles.spacing.md,
    paddingHorizontal: platformStyles.spacing.sm,
    borderRadius: platformStyles.borderRadius.medium,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: platformStyles.spacing.xl,
    marginTop: platformStyles.spacing.xxl,
    gap: platformStyles.spacing.lg,
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.xl,
    ...platformStyles.buttonShadow,
  },
  receiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: platformStyles.spacing.lg,
    borderRadius: platformStyles.borderRadius.xl,
    ...platformStyles.shadow,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  receiveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  transactionsSection: {
    marginTop: platformStyles.spacing.xxxl,
    paddingBottom: platformStyles.spacing.xl,
    marginHorizontal: platformStyles.spacing.xl,
    padding: platformStyles.spacing.xl,
    borderRadius: platformStyles.borderRadius.xxl,
    ...platformStyles.cardShadow,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.xl,
  },
  transactionsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '500',
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
    width: 200,
    height: 140,
    borderRadius: platformStyles.borderRadius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: platformStyles.spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  addWalletIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: platformStyles.spacing.sm,
    ...platformStyles.shadow,
  },
  addWalletText: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: platformStyles.spacing.xl,
  },
  editModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: platformStyles.borderRadius.xxl,
    padding: 0,
    ...platformStyles.cardShadow,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: platformStyles.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  editModalTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  editModalContent: {
    padding: platformStyles.spacing.xl,
  },
  editLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: platformStyles.spacing.sm,
    marginTop: platformStyles.spacing.lg,
  },
  editInput: {
    borderWidth: 1.5,
    borderRadius: platformStyles.borderRadius.large,
    paddingHorizontal: platformStyles.spacing.lg,
    paddingVertical: platformStyles.spacing.md,
    fontSize: 17,
    borderColor: '#E5E7EB',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: platformStyles.spacing.md,
    marginTop: platformStyles.spacing.sm,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...platformStyles.shadow,
  },
  selectedColor: {
    borderColor: '#007AFF',
    borderWidth: 3,
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
    padding: platformStyles.spacing.xl,
    gap: platformStyles.spacing.md,
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: platformStyles.spacing.md,
    borderRadius: platformStyles.borderRadius.large,
    borderWidth: 1.5,
    alignItems: 'center',
    borderColor: '#E5E7EB',
  },
  editCancelText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#6B7280',
  },
  editSaveButton: {
    flex: 1,
    paddingVertical: platformStyles.spacing.md,
    borderRadius: platformStyles.borderRadius.large,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    ...platformStyles.buttonShadow,
  },
  editSaveText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
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