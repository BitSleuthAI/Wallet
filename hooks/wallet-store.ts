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
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  // Wallet balance query
  const balanceQuery = useQuery({
    queryKey: ['wallet-balance', currentWallet?.id, currentWallet?.addresses, currentWallet],
    queryFn: async () => {
      if (!currentWallet) return null;
      return bitcoinService.getWalletBalance(currentWallet.addresses);
    },
    enabled: !!currentWallet,
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Transaction history query
  const transactionsQuery = useQuery({
    queryKey: ['transactions', currentWallet?.id, currentWallet?.addresses, currentWallet],
    queryFn: async () => {
      if (!currentWallet) return [];
      return bitcoinService.getTransactionHistory(currentWallet.addresses);
    },
    enabled: !!currentWallet,
    refetchInterval: 15000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 60000, // Consider data fresh for 1 minute
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

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['bitcoin-price'] });
  }, [queryClient]);

  const logoutAndEraseWallet = useCallback(async () => {
    try {
      // Clear all wallet-related data from AsyncStorage
      await AsyncStorage.multiRemove([
        'wallet',
        'pin',
        'biometric_enabled',
        'wallet_setup_completed'
      ]);
      
      // Reset local state
      setCurrentWallet(null);
      
      // Clear all cached queries
      queryClient.clear();
      
      console.log('Wallet data cleared successfully');
    } catch (error) {
      console.error('Error clearing wallet data:', error);
      throw error;
    }
  }, [queryClient]);

  return useMemo(() => ({
    // Wallet data
    currentWallet,
    isLoading: walletQuery.isLoading,
    
    // Balance and price data
    balance: balanceQuery.data || 0,
    balanceUSD: (balanceQuery.data || 0) * (priceQuery.data?.usd || 0),
    bitcoinPrice: priceQuery.data,
    
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
  }), [
    currentWallet,
    walletQuery.isLoading,
    balanceQuery.data,
    balanceQuery.isLoading,
    priceQuery.data,
    priceQuery.isLoading,
    transactionsQuery.data,
    transactionsQuery.isLoading,
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