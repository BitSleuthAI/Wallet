import MonzoButton from '@/components/MonzoButton';
import MonzoCard from '@/components/MonzoCard';
import BalanceChart from '@/components/PriceChart';
import TransactionItem from '@/components/TransactionItem';
import WalletCard from '@/components/WalletCard';
import { platformStyles } from '@/constants/themes';
import { useTabAnimation } from '@/hooks/use-tab-animation';
import { useWallet } from '@/hooks/wallet-store';
import HapticService from '@/services/haptic-service';
import { Wallet } from '@/types/wallet';
import { Stack, router } from 'expo-router';
import { Eye, EyeOff, TrendingUp, WifiOff, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
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
  } = useWallet();

  const [refreshing, setRefreshing] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editColor, setEditColor] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');

  // Enhanced refresh with haptics
  const onRefresh = async () => {
    HapticService.medium();
    setRefreshing(true);
    try {
      await Promise.all([
        refreshData(),
      ]);
      HapticService.success();
    } catch (error) {
      HapticService.error();
    } finally {
      setRefreshing(false);
    }
  };

  // Enhanced wallet switching with haptics
  const handleWalletSwitch = (wallet: Wallet) => {
    HapticService.tabChange();
    if (currentWalletId !== wallet.id) {
      switchWallet(wallet.id);
    }
  };

  // Enhanced add wallet with haptics
  const handleAddWallet = () => {
    HapticService.medium();
    router.push('/wallet-setup');
  };

  const handleEditWallet = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setEditName(wallet.name);
    setEditColor(wallet.color);
  };

  const handleSaveEdit = async () => {
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
  };

  const handleCancelEdit = () => {
    setEditingWallet(null);
    setEditName('');
    setEditColor('');
  };

  const walletColors = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5A2B', '#6366F1'];

  const formatPriceChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // Show loading state while wallet is being loaded
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
    );
  }

  // Show empty state only if not loading and no wallet found
  if (!currentWallet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
    );
  }

  const carouselItems: CarouselItem[] = [...wallets.map(wallet => ({ type: 'wallet' as const, wallet })), { type: 'add' as const }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Wallet',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
        }}
      />
      
      <Animated.View style={[styles.animatedContainer, animatedStyle]}>
        <ScrollView
          style={styles.scrollView}
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Your Wallets 💼
          </Text>
          
          <FlatList
            data={carouselItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            renderItem={({ item }) => {
              if (item.type === 'add') {
                return (
                  <MonzoCard
                    variant="fun"
                    color="purple"
                    onPress={handleAddWallet}
                    style={styles.addWalletCard}
                    hapticFeedback={true}
                  >
                    <View style={styles.addWalletContent}>
                      <Text style={styles.addWalletEmoji}>➕</Text>
                      <Text style={styles.addWalletText}>Add New Wallet</Text>
                    </View>
                  </MonzoCard>
                );
              }

              const wallet = item.wallet;
              const isActive = currentWallet?.id === wallet.id;
              const walletBalance = balance || 0;
              const walletBalanceUSD = balanceUSD || 0;
              const priceChange = bitcoinPrice?.usd_24h_change || 0;

              return (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  isActive={isActive}
                  onPress={() => handleWalletSwitch(wallet)}
                  onMenuPress={() => setEditingWallet(wallet)}
                  balance={walletBalance}
                  balanceUSD={walletBalanceUSD}
                  priceChange={priceChange}
                />
              );
            }}
            keyExtractor={(item) => 
              item.type === 'add' ? 'add' : item.wallet.id
            }
          />
        </View>

        {/* Balance Display */}
        <View style={[styles.balanceSection, { backgroundColor: theme.colors.surface }]}>
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
              <View style={styles.balanceRow}>
                <Text style={[styles.mainBalance, { color: theme.colors.text }]}>
                  {hideBalance ? '••••••••' : (hasPriceError ? `${balance.toFixed(8)} BTC` : formatCurrency(balanceUSD))}
                </Text>
                <TouchableOpacity 
                  style={[styles.eyeButton, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setHideBalanceSetting(!hideBalance)}
                >
                  {hideBalance ? (
                    <EyeOff color={theme.colors.textSecondary} size={20} />
                  ) : (
                    <Eye color={theme.colors.textSecondary} size={20} />
                  )}
                </TouchableOpacity>
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
        </View>

        {/* Time Period Selector */}
        <View style={[styles.periodSelector, { backgroundColor: theme.colors.surface }]}>
          {(['1D', '1W', '1M', '1Y', 'All'] as TimePeriod[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && { 
                  backgroundColor: theme.colors.primary,
                  transform: [{ scale: 1.05 }],
                },
              ]}
              onPress={() => setSelectedPeriod(period)}
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

        {/* Balance Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
          <BalanceChart selectedPeriod={selectedPeriod} />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <MonzoButton
            title="Send"
            emoji="📤"
            onPress={() => {
              HapticService.buttonPress();
              router.push('/send');
            }}
            variant="primary"
            size="large"
            hapticType="medium"
            style={styles.actionButton}
          />
          
          <MonzoButton
            title="Receive"
            emoji="📥"
            onPress={() => {
              HapticService.buttonPress();
              router.push('/receive');
            }}
            variant="secondary"
            size="large"
            hapticType="medium"
            style={styles.actionButton}
          />
        </View>

        {/* Recent Transactions */}
        <View style={[styles.transactionsSection, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.transactionsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Transactions
            </Text>
            <TouchableOpacity onPress={() => router.push('/transaction-history')}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                View All
              </Text>
            </TouchableOpacity>
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
            transactions.slice(0, 5).map((transaction) => (
              <TransactionItem
                key={transaction.txid}
                transaction={transaction}
              />
            ))
          )}
        </View>
        </ScrollView>
      </Animated.View>
      
      {/* Edit Wallet Modal */}
      <Modal
        visible={!!editingWallet}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
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
              />
              
              <Text style={[styles.editLabel, { color: theme.colors.text }]}>Color</Text>
              <View style={styles.colorPicker}>
                {walletColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      editColor === color && styles.selectedColor
                    ]}
                    onPress={() => setEditColor(color)}
                  />
                ))}
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
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  bitcoinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bitcoinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bitcoinSymbol: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bitcoinLabel: {
    fontSize: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bitcoinPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  balanceSection: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 24,
    borderRadius: 20,
    ...platformStyles.ios,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainBalance: {
    fontSize: 32,
    fontWeight: '800',
    flex: 1,
  },
  eyeButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  btcBalance: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    ...theme.shadows.small,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 24,
    gap: 16,
  },
  actionButton: {
    flex: 1,
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    ...platformStyles.buttonShadow,
  },
  receiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    ...platformStyles.buttonShadow,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  receiveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  transactionsSection: {
    marginTop: 30,
    paddingBottom: 20,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    ...platformStyles.cardShadow,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  balanceErrorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  transactionsErrorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    ...platformStyles.buttonShadow,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTransactionsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTransactionsText: {
    fontSize: 16,
  },
  walletCarousel: {
    marginVertical: 20,
  },
  carouselContent: {
    paddingHorizontal: 20,
  },
  walletCardContainer: {
    marginRight: 16,
  },
  addWalletCard: {
    width: 200,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  addWalletContent: {
    alignItems: 'center',
  },
  addWalletEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  addWalletText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 0,
    ...platformStyles.cardShadow,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editModalContent: {
    padding: 20,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderColor: '#E5E7EB',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    ...platformStyles.shadow,
  },
  selectedColor: {
    borderColor: '#000',
    borderWidth: 3,
  },
  editModalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    borderColor: '#E5E7EB',
  },
  editCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  editSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    ...platformStyles.buttonShadow,
  },
  editSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  chartContainer: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    ...platformStyles.cardShadow,
  },
  animatedContainer: {
    flex: 1,
  },
});