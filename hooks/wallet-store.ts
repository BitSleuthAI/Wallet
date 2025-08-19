import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, Theme } from '@/types/wallet';
import { lightTheme, darkTheme } from '@/constants/themes';
import * as walletService from '@/services/wallet-service';
import * as bitcoinService from '@/services/bitcoin-service';

export const [WalletProvider, useWallet] = createContextHook(() => {
  const [currentWallet, setCurrentWallet] = useState<Wallet | null>(null);
  const [theme, setTheme] = useState<Theme>(lightTheme);
  const queryClient = useQueryClient();

  // Load wallet from storage
  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('wallet');
      return stored ? JSON.parse(stored) : null;
    },
  });

  // Load theme from storage
  const themeQuery = useQuery({
    queryKey: ['theme'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('theme');
      return stored === 'dark' ? darkTheme : lightTheme;
    },
  });

  // Bitcoin price query
  const priceQuery = useQuery({
    queryKey: ['bitcoin-price'],
    queryFn: bitcoinService.getBitcoinPrice,
    refetchInterval: 120000, // Refetch every 2 minutes (less aggressive)
    retry: 1, // Reduced retries
    retryDelay: 5000, // Fixed 5 second delay
    staleTime: 300000, // Consider data fresh for 5 minutes
    throwOnError: false, // Don't throw errors, handle them gracefully
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Only refetch on mount
  });

  // Wallet balance query
  const balanceQuery = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['wallet-balance', currentWallet?.id, JSON.stringify(currentWallet?.addresses)],
    queryFn: async () => {
      if (!currentWallet || !currentWallet.addresses.length) return 0;
      try {
        return await bitcoinService.getWalletBalance(currentWallet.addresses);
      } catch (error) {
        console.warn('Balance fetch failed, returning 0:', error);
        return 0; // Return 0 instead of throwing
      }
    },
    enabled: !!currentWallet && !!currentWallet.addresses?.length,
    refetchInterval: 60000, // Refetch every 60 seconds (less aggressive)
    retry: 1, // Reduced retries
    retryDelay: 10000, // Fixed 10 second delay
    staleTime: 120000, // Consider data fresh for 2 minutes
    throwOnError: false, // Don't throw errors, handle them gracefully
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Only refetch on mount
  });

  // Transaction history query
  const transactionsQuery = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['transactions', currentWallet?.id, JSON.stringify(currentWallet?.addresses)],
    queryFn: async () => {
      if (!currentWallet || !currentWallet.addresses.length) return [];
      try {
        return await bitcoinService.getTransactionHistory(currentWallet.addresses);
      } catch (error) {
        console.warn('Transaction history fetch failed, returning empty array:', error);
        return []; // Return empty array instead of throwing
      }
    },
    enabled: !!currentWallet && !!currentWallet.addresses?.length,
    refetchInterval: 90000, // Refetch every 90 seconds (less aggressive)
    retry: 1, // Reduced retries
    retryDelay: 15000, // Fixed 15 second delay
    staleTime: 180000, // Consider data fresh for 3 minutes
    throwOnError: false, // Don't throw errors, handle them gracefully
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Only refetch on mount
  });

  // Save wallet mutation
  const saveWalletMutation = useMutation({
    mutationFn: async (wallet: Wallet) => {
      await AsyncStorage.setItem('wallet', JSON.stringify(wallet));
      return wallet;
    },
    onSuccess: (wallet) => {
      setCurrentWallet(wallet);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
  const { mutate: saveWallet } = saveWalletMutation;

  // Save theme mutation
  const saveThemeMutation = useMutation({
    mutationFn: async (isDark: boolean) => {
      const newTheme = isDark ? darkTheme : lightTheme;
      await AsyncStorage.setItem('theme', isDark ? 'dark' : 'light');
      return newTheme;
    },
    onSuccess: (newTheme) => {
      setTheme(newTheme);
      queryClient.invalidateQueries({ queryKey: ['theme'] });
    },
  });
  const { mutate: saveTheme } = saveThemeMutation;

  useEffect(() => {
    if (walletQuery.data) {
      setCurrentWallet(walletQuery.data);
    }
  }, [walletQuery.data]);

  useEffect(() => {
    if (themeQuery.data) {
      setTheme(themeQuery.data);
    }
  }, [themeQuery.data]);

  const createWallet = useCallback(async (name: string, color?: string) => {
    try {
      const wallet = await walletService.createWallet(name, color);
      saveWallet(wallet);
      return wallet;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }, [saveWallet]);

  const importWallet = useCallback(async (name: string, mnemonic: string, color?: string) => {
    try {
      const wallet = await walletService.importWallet(name, mnemonic, color);
      saveWallet(wallet);
      return wallet;
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw error;
    }
  }, [saveWallet]);

  const generateNewAddress = useCallback(async () => {
    if (!currentWallet) return null;
    try {
      const updatedWallet = await walletService.generateNewAddress(currentWallet);
      saveWallet(updatedWallet);
      return updatedWallet.addresses[updatedWallet.addresses.length - 1];
    } catch (error) {
      console.error('Error generating new address:', error);
      throw error;
    }
  }, [currentWallet, saveWallet]);

  const toggleTheme = useCallback(() => {
    saveTheme(!theme.isDark);
  }, [theme.isDark, saveTheme]);

  const refreshData = useCallback(async () => {
    console.log('Refreshing wallet data...');
    try {
      // Invalidate queries to trigger fresh fetches
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bitcoin-price'] });
      
      console.log('✅ Wallet data refresh initiated');
    } catch (error) {
      console.warn('⚠️ Error during data refresh:', error);
    }
  }, [queryClient]);

  const logoutAndEraseWallet = useCallback(async () => {
    try {
      console.log('🔄 Starting wallet logout and erase process...');
      
      // Clear all wallet-related data from AsyncStorage
      const keysToRemove = [
        'wallet',
        'pin',
        'biometric_enabled',
        'wallet_setup_completed',
        'theme', // Reset theme to default
        'user_preferences',
        'app_settings',
        'cached_addresses',
        'transaction_cache',
        'price_cache',
        'last_sync_time'
      ];
      
      console.log('🗑️ Removing storage keys:', keysToRemove);
      await AsyncStorage.multiRemove(keysToRemove);
      
      // Reset local state
      console.log('🔄 Resetting local state...');
      setCurrentWallet(null);
      setTheme(lightTheme); // Reset to light theme
      
      // Clear all cached queries and reset query client
      console.log('🔄 Clearing query cache...');
      queryClient.clear();
      queryClient.resetQueries();
      queryClient.invalidateQueries();
      
      // Clear any global state that might persist
      if ((global as any).ecc) {
        console.log('🔄 Clearing global ECC state...');
        delete (global as any).ecc;
      }
      
      if ((global as any).__cryptoInitialized) {
        console.log('🔄 Resetting crypto initialization flag...');
        (global as any).__cryptoInitialized = false;
      }
      
      console.log('✅ Wallet data cleared successfully');
      console.log('🔄 App state has been completely reset');
    } catch (error) {
      console.error('❌ Error clearing wallet data:', error);
      throw new Error('Failed to clear wallet data. Please try again.');
    }
  }, [queryClient, setTheme]);

  return useMemo(() => ({
    // Wallet data
    currentWallet,
    isLoading: walletQuery.isLoading,
    
    // Balance and price data
    balance: balanceQuery.data || 0,
    balanceUSD: (balanceQuery.data || 0) * (priceQuery.data?.usd || 0),
    bitcoinPrice: priceQuery.data,
    
    // Error states (only show if there's actually an error and no data)
    priceError: priceQuery.error && !priceQuery.data ? priceQuery.error : null,
    balanceError: balanceQuery.error && balanceQuery.data === undefined ? balanceQuery.error : null,
    transactionsError: transactionsQuery.error && !transactionsQuery.data?.length ? transactionsQuery.error : null,
    
    // Transactions
    transactions: transactionsQuery.data || [],
    
    // Theme
    theme,
    
    // Actions
    createWallet,
    importWallet,
    generateNewAddress,
    toggleTheme,
    refreshData,
    logoutAndEraseWallet,
    
    // Loading states
    isCreatingWallet: saveWalletMutation.isPending,
    isLoadingBalance: balanceQuery.isLoading,
    isLoadingTransactions: transactionsQuery.isLoading,
    isLoadingPrice: priceQuery.isLoading,
    
    // Error states for loading (only show if there's actually an error and no data)
    hasBalanceError: !!balanceQuery.error && balanceQuery.data === undefined,
    hasTransactionsError: !!transactionsQuery.error && !transactionsQuery.data?.length,
    hasPriceError: !!priceQuery.error && !priceQuery.data,
  }), [
    currentWallet,
    walletQuery.isLoading,
    balanceQuery.data,
    balanceQuery.isLoading,
    priceQuery.data,
    priceQuery.isLoading,
    priceQuery.error,
    transactionsQuery.data,
    transactionsQuery.isLoading,
    transactionsQuery.error,
    balanceQuery.error,
    theme,
    createWallet,
    importWallet,
    generateNewAddress,
    toggleTheme,
    refreshData,
    logoutAndEraseWallet,
    saveWalletMutation.isPending,
  ]);
});