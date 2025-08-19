import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, Theme, FiatCurrency } from '@/types/wallet';
import { lightTheme, darkTheme } from '@/constants/themes';
import * as walletService from '@/services/wallet-service';
import * as bitcoinService from '@/services/bitcoin-service';

// Currency symbols and exchange rates
const CURRENCY_SYMBOLS: Record<FiatCurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const CURRENCY_NAMES: Record<FiatCurrency, string> = {
  USD: 'United States Dollar',
  EUR: 'Euro',
  GBP: 'British Pound Sterling',
};

export const [WalletProvider, useWallet] = createContextHook(() => {
  const [currentWallet, setCurrentWallet] = useState<Wallet | null>(null);
  const [theme, setTheme] = useState<Theme>(lightTheme);
  const [selectedCurrency, setSelectedCurrency] = useState<FiatCurrency>('USD');
  const [hideBalance, setHideBalance] = useState<boolean>(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(15);
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

  // Load currency from storage
  const currencyQuery = useQuery({
    queryKey: ['currency'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('currency');
      return (stored as FiatCurrency) || 'USD';
    },
  });

  // Load hide balance setting from storage
  const hideBalanceQuery = useQuery({
    queryKey: ['hideBalance'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('hideBalance');
      return stored === 'true';
    },
  });

  // Load auto-lock timeout from storage
  const autoLockQuery = useQuery({
    queryKey: ['autoLockTimeout'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('autoLockTimeout');
      return stored ? parseInt(stored, 10) : 15;
    },
  });

  // Bitcoin price query with multi-currency support
  const priceQuery = useQuery({
    queryKey: ['bitcoin-price', selectedCurrency],
    queryFn: async () => {
      const prices = await bitcoinService.getBitcoinPrice();
      // Convert USD price to selected currency if needed
      if (selectedCurrency === 'USD') {
        return prices;
      }
      
      // Fetch exchange rates for EUR and GBP
      try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
        const data = await response.json();
        const rate = data.rates[selectedCurrency] || 1;
        
        return {
          usd: prices.usd * rate,
          usd_24h_change: prices.usd_24h_change, // Keep the same percentage change
        };
      } catch (error) {
        console.warn('Failed to fetch exchange rates, using USD prices:', error);
        return prices;
      }
    },
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

  // Save currency mutation
  const saveCurrencyMutation = useMutation({
    mutationFn: async (currency: FiatCurrency) => {
      await AsyncStorage.setItem('currency', currency);
      return currency;
    },
    onSuccess: (currency) => {
      setSelectedCurrency(currency);
      queryClient.invalidateQueries({ queryKey: ['currency'] });
      queryClient.invalidateQueries({ queryKey: ['bitcoin-price'] });
    },
  });
  const { mutate: saveCurrency } = saveCurrencyMutation;

  // Save hide balance setting mutation
  const saveHideBalanceMutation = useMutation({
    mutationFn: async (hide: boolean) => {
      await AsyncStorage.setItem('hideBalance', hide.toString());
      return hide;
    },
    onSuccess: (hide) => {
      setHideBalance(hide);
      queryClient.invalidateQueries({ queryKey: ['hideBalance'] });
    },
  });
  const { mutate: saveHideBalance } = saveHideBalanceMutation;

  // Save auto-lock timeout mutation
  const saveAutoLockMutation = useMutation({
    mutationFn: async (timeout: number) => {
      await AsyncStorage.setItem('autoLockTimeout', timeout.toString());
      return timeout;
    },
    onSuccess: (timeout) => {
      setAutoLockTimeout(timeout);
      queryClient.invalidateQueries({ queryKey: ['autoLockTimeout'] });
    },
  });
  const { mutate: saveAutoLock } = saveAutoLockMutation;

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

  useEffect(() => {
    if (currencyQuery.data) {
      setSelectedCurrency(currencyQuery.data);
    }
  }, [currencyQuery.data]);

  useEffect(() => {
    if (hideBalanceQuery.data !== undefined) {
      setHideBalance(hideBalanceQuery.data);
    }
  }, [hideBalanceQuery.data]);

  useEffect(() => {
    if (autoLockQuery.data !== undefined) {
      setAutoLockTimeout(autoLockQuery.data);
    }
  }, [autoLockQuery.data]);

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

  const setCurrency = useCallback((currency: FiatCurrency) => {
    saveCurrency(currency);
  }, [saveCurrency]);

  const setHideBalanceSetting = useCallback((hide: boolean) => {
    saveHideBalance(hide);
  }, [saveHideBalance]);

  const setAutoLockTimeoutSetting = useCallback((timeout: number) => {
    saveAutoLock(timeout);
  }, [saveAutoLock]);

  const formatCurrency = useCallback((amount: number, showSymbol: boolean = true) => {
    const symbol = CURRENCY_SYMBOLS[selectedCurrency];
    const formatted = amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return showSymbol ? `${symbol}${formatted}` : formatted;
  }, [selectedCurrency]);

  const getCurrencySymbol = useCallback(() => {
    return CURRENCY_SYMBOLS[selectedCurrency];
  }, [selectedCurrency]);

  const getCurrencyName = useCallback((currency?: FiatCurrency) => {
    return CURRENCY_NAMES[currency || selectedCurrency];
  }, [selectedCurrency]);

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
        'currency', // Reset currency to default
        'hideBalance', // Reset hide balance setting
        'autoLockTimeout', // Reset auto-lock timeout
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
      setSelectedCurrency('USD'); // Reset to USD
      setHideBalance(false); // Reset hide balance setting
      setAutoLockTimeout(15); // Reset auto-lock timeout to default
      
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
    balanceError: balanceQuery.error && (balanceQuery.data === undefined || balanceQuery.data === null) ? balanceQuery.error : null,
    transactionsError: transactionsQuery.error && (!transactionsQuery.data || transactionsQuery.data.length === 0) ? transactionsQuery.error : null,
    
    // Transactions
    transactions: transactionsQuery.data || [],
    
    // Theme
    theme,
    
    // Currency
    selectedCurrency,
    setCurrency,
    formatCurrency,
    getCurrencySymbol,
    getCurrencyName,
    
    // Hide balance setting
    hideBalance,
    setHideBalanceSetting,
    
    // Auto-lock setting
    autoLockTimeout,
    setAutoLockTimeoutSetting,
    
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
    hasBalanceError: !!balanceQuery.error && (balanceQuery.data === undefined || balanceQuery.data === null),
    hasTransactionsError: !!transactionsQuery.error && (!transactionsQuery.data || transactionsQuery.data.length === 0),
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
    selectedCurrency,
    setCurrency,
    formatCurrency,
    getCurrencySymbol,
    getCurrencyName,
    hideBalance,
    setHideBalanceSetting,
    autoLockTimeout,
    setAutoLockTimeoutSetting,
  ]);
});