import { darkTheme, lightTheme } from '@/constants/themes';
import * as bitcoinService from '@/services/bitcoin-service';
import * as walletService from '@/services/wallet-service';
import { FiatCurrency, Theme, UTXO, Wallet } from '@/types/wallet';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [currentWalletId, setCurrentWalletId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(lightTheme);
  const [selectedCurrency, setSelectedCurrency] = useState<FiatCurrency>('USD');
  const [hideBalance, setHideBalance] = useState<boolean>(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(15);
  const queryClient = useQueryClient();
  const [coinControlSelected, setCoinControlSelectedState] = useState<Record<string, string[]>>({});
  const [coinControlFrozen, setCoinControlFrozenState] = useState<Record<string, string[]>>({});

  // Computed current wallet
  const currentWallet = wallets.find(w => w.id === currentWalletId) || wallets[0] || null;

  // Migration and initialization
  useEffect(() => {
    const initializeWallets = async () => {
      try {
        // Clear any potential mock/demo data on every initialization
        await AsyncStorage.multiRemove([
          'mock_data', 'test_data', 'sample_data', 'dummy_data', 
          'demo_balance', 'demo_transactions', 'mock_balance', 'mock_transactions',
          'sample_balance', 'sample_transactions', 'test_balance', 'test_transactions'
        ]);
        // console.log('🧹 Cleared any potential mock/demo data on initialization');
        
        // Check for old single wallet format and migrate
        const oldWallet = await AsyncStorage.getItem('wallet');
        const existingWallets = await AsyncStorage.getItem('wallets');
        
        if (oldWallet && !existingWallets) {
          // console.log('📦 Migrating from single wallet to multi-wallet format');
          const wallet = JSON.parse(oldWallet);
          const walletsArray = [wallet];
          
          // Save as new format
          await AsyncStorage.setItem('wallets', JSON.stringify(walletsArray));
          await AsyncStorage.setItem('currentWalletId', wallet.id);
          
          // Remove old format
          await AsyncStorage.removeItem('wallet');
          
          // console.log('✅ Migration completed successfully');
        }
      } catch (error) {
        // console.warn('⚠️ Error during wallet initialization:', error);
      }
    };
    initializeWallets();
  }, []);

  // Load wallets from storage
  const walletsQuery = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('wallets');
      return stored ? JSON.parse(stored) : [];
    },
  });

  // Load current wallet ID from storage
  const currentWalletQuery = useQuery({
    queryKey: ['currentWalletId'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('currentWalletId');
      return stored || null;
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

  // Load coin control selections
  const coinControlSelectedQuery = useQuery({
    queryKey: ['coinControlSelected'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('coinControlSelected');
      return stored ? JSON.parse(stored) as Record<string, string[]> : {};
    },
  });

  // Load coin control frozen list
  const coinControlFrozenQuery = useQuery({
    queryKey: ['coinControlFrozen'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('coinControlFrozen');
      return stored ? JSON.parse(stored) as Record<string, string[]> : {};
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
        // console.warn('Failed to fetch exchange rates, using USD prices:', error);
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
        // console.warn('Balance fetch failed, returning 0:', error);
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
        // console.warn('Transaction history fetch failed, returning empty array:', error);
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

  // Save wallets mutation
  const saveWalletsMutation = useMutation({
    mutationFn: async (walletsToSave: Wallet[]) => {
      await AsyncStorage.setItem('wallets', JSON.stringify(walletsToSave));
      return walletsToSave;
    },
    onSuccess: (walletsToSave) => {
      setWallets(walletsToSave);
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
  const { mutate: saveWallets } = saveWalletsMutation;

  // Save current wallet ID mutation
  const saveCurrentWalletIdMutation = useMutation({
    mutationFn: async (walletId: string) => {
      await AsyncStorage.setItem('currentWalletId', walletId);
      return walletId;
    },
    onSuccess: (walletId) => {
      setCurrentWalletId(walletId);
      queryClient.invalidateQueries({ queryKey: ['currentWalletId'] });
    },
  });
  const { mutate: saveCurrentWalletId } = saveCurrentWalletIdMutation;

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

  // Save coin control selections
  const saveCoinControlSelectedMutation = useMutation({
    mutationFn: async (map: Record<string, string[]>) => {
      await AsyncStorage.setItem('coinControlSelected', JSON.stringify(map));
      return map;
    },
    onSuccess: (map) => {
      setCoinControlSelectedState(map);
      queryClient.invalidateQueries({ queryKey: ['coinControlSelected'] });
    },
  });
  const { mutate: saveCoinControlSelected } = saveCoinControlSelectedMutation;

  // Save coin control frozen
  const saveCoinControlFrozenMutation = useMutation({
    mutationFn: async (map: Record<string, string[]>) => {
      await AsyncStorage.setItem('coinControlFrozen', JSON.stringify(map));
      return map;
    },
    onSuccess: (map) => {
      setCoinControlFrozenState(map);
      queryClient.invalidateQueries({ queryKey: ['coinControlFrozen'] });
    },
  });
  const { mutate: saveCoinControlFrozen } = saveCoinControlFrozenMutation;

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
    if (walletsQuery.data) {
      setWallets(walletsQuery.data);
      // If we have wallets but no current wallet ID, set the first one as current
      if (walletsQuery.data.length > 0 && !currentWalletId) {
        saveCurrentWalletId(walletsQuery.data[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsQuery.data, currentWalletId]);

  useEffect(() => {
    if (currentWalletQuery.data) {
      setCurrentWalletId(currentWalletQuery.data);
    }
  }, [currentWalletQuery.data]);

  useEffect(() => {
    if (themeQuery.data) {
      setTheme(themeQuery.data);
    }
  }, [themeQuery.data]);

  useEffect(() => {
    if (coinControlSelectedQuery.data) {
      setCoinControlSelectedState(coinControlSelectedQuery.data);
    }
  }, [coinControlSelectedQuery.data]);

  useEffect(() => {
    if (coinControlFrozenQuery.data) {
      setCoinControlFrozenState(coinControlFrozenQuery.data);
    }
  }, [coinControlFrozenQuery.data]);

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

  const createWallet = useCallback(async (name: string, color?: string): Promise<{ success: boolean; wallet?: any; error?: string }> => {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return { success: false, error: 'Wallet name cannot be empty or contain only whitespace.' };
      }
      if (trimmedName.length > 50) {
        return { success: false, error: 'Wallet name cannot exceed 50 characters.' };
      }
      // Check if a wallet with the same name already exists (case-insensitive)
      const existingWalletWithName = wallets.find(wallet =>
        wallet.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingWalletWithName) {
        return { success: false, error: `A wallet with the name "${trimmedName}" already exists. Please choose a different name.` };
      }
      const wallet = await walletService.createWallet(trimmedName, color);
      const updatedWallets = [...wallets, wallet];
      saveWallets(updatedWallets);
      saveCurrentWalletId(wallet.id);
      return { success: true, wallet };
    } catch (error) {
      // console.error('Error creating wallet:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create wallet' };
    }
  }, [wallets, saveWallets, saveCurrentWalletId]);

  const importWallet = useCallback(async (name: string, mnemonic: string, color?: string): Promise<{ success: boolean; wallet?: any; error?: string }> => {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return { success: false, error: 'Wallet name cannot be empty or contain only whitespace.' };
      }
      if (trimmedName.length > 50) {
        return { success: false, error: 'Wallet name cannot exceed 50 characters.' };
      }
      const trimmedMnemonic = mnemonic.trim();
      if (!trimmedMnemonic) {
        return { success: false, error: 'Recovery phrase cannot be empty or contain only whitespace.' };
      }
      // Check if a wallet with the same mnemonic already exists
      const existingWallet = wallets.find(wallet => wallet.mnemonic === trimmedMnemonic);
      if (existingWallet) {
        return { success: false, error: `Wallet "${existingWallet.name}" has already been imported with this recovery phrase.` };
      }
      // Check if a wallet with the same name already exists (case-insensitive)
      const existingWalletWithName = wallets.find(wallet =>
        wallet.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingWalletWithName) {
        return { success: false, error: `A wallet with the name "${trimmedName}" already exists. Please choose a different name.` };
      }
      const wallet = await walletService.importWallet(trimmedName, trimmedMnemonic, color);
      const updatedWallets = [...wallets, wallet];
      saveWallets(updatedWallets);
      saveCurrentWalletId(wallet.id);
      return { success: true, wallet };
    } catch (error) {
      // console.error('Error importing wallet:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to import wallet' };
    }
  }, [wallets, saveWallets, saveCurrentWalletId]);

  const generateNewAddress = useCallback(async (): Promise<{ success: boolean; address?: string; error?: string }> => {
    if (!currentWallet) return { success: false, error: 'No wallet selected' };
    try {
      const updatedWallet = await walletService.generateNewAddress(currentWallet);
      const updatedWallets = wallets.map(w => w.id === updatedWallet.id ? updatedWallet : w);
      saveWallets(updatedWallets);
      const newAddress = updatedWallet.addresses[updatedWallet.addresses.length - 1];
      return { success: true, address: newAddress };
    } catch (error) {
      // console.error('Error generating new address:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to generate new address' };
    }
  }, [currentWallet, wallets, saveWallets]);

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

  const setCoinControlSelected = useCallback((ids: string[]) => {
    if (!currentWallet) return;
    const map = { ...(coinControlSelected || {}) } as Record<string, string[]>;
    map[currentWallet.id] = ids;
    saveCoinControlSelected(map);
  }, [currentWallet, coinControlSelected, saveCoinControlSelected]);

  const clearCoinControlSelected = useCallback(() => {
    if (!currentWallet) return;
    const map = { ...(coinControlSelected || {}) } as Record<string, string[]>;
    map[currentWallet.id] = [];
    saveCoinControlSelected(map);
  }, [currentWallet, coinControlSelected, saveCoinControlSelected]);

  const toggleFreezeUtxo = useCallback((utxoId: string) => {
    if (!currentWallet) return;
    const map = { ...(coinControlFrozen || {}) } as Record<string, string[]>;
    const list = new Set(map[currentWallet.id] || []);
    if (list.has(utxoId)) list.delete(utxoId); else list.add(utxoId);
    map[currentWallet.id] = Array.from(list);
    saveCoinControlFrozen(map);
  }, [currentWallet, coinControlFrozen, saveCoinControlFrozen]);

  const isUtxoFrozen = useCallback((utxoId: string) => {
    if (!currentWallet) return false;
    const list = coinControlFrozen[currentWallet.id] || [];
    return list.includes(utxoId);
  }, [currentWallet, coinControlFrozen]);

  const getSelectedUtxoIds = useCallback(() => {
    if (!currentWallet) return [] as string[];
    return coinControlSelected[currentWallet.id] || [];
  }, [currentWallet, coinControlSelected]);

  const filterSelectedUtxos = useCallback((all: UTXO[]) => {
    const ids = new Set(getSelectedUtxoIds());
    return all.filter(u => ids.has(`${u.txid}:${u.vout}`));
  }, [getSelectedUtxoIds]);

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
    // console.log('Refreshing wallet data...');
    try {
      // Clear any potential cached mock/demo data
      await AsyncStorage.multiRemove([
        'mock_data', 'test_data', 'sample_data', 'dummy_data',
        'demo_balance', 'demo_transactions', 'mock_balance', 'mock_transactions',
        'sample_balance', 'sample_transactions', 'test_balance', 'test_transactions'
      ]);
      
      // Clear React Query cache completely to remove any cached mock/demo data
      queryClient.clear();
      
      // Invalidate queries to trigger fresh fetches
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bitcoin-price'] });
      
      // console.log('✅ Wallet data refresh initiated and cache cleared');
    } catch (error) {
      // console.warn('⚠️ Error during data refresh:', error);
    }
  }, [queryClient]);

  const switchWallet = useCallback((walletId: string) => {
    if (wallets.find(w => w.id === walletId)) {
      saveCurrentWalletId(walletId);
    }
  }, [wallets, saveCurrentWalletId]);

  const editWallet = useCallback(async (walletId: string, name: string, color?: string) => {
    try {
      const updatedWallets = wallets.map(w => 
        w.id === walletId 
          ? { ...w, name, color: color || w.color }
          : w
      );
      saveWallets(updatedWallets);
    } catch (error) {
      // console.error('Error editing wallet:', error);
      throw error;
    }
  }, [wallets, saveWallets]);

  const deleteWallet = useCallback(async (walletId: string) => {
    try {
      const updatedWallets = wallets.filter(w => w.id !== walletId);
      saveWallets(updatedWallets);
      
      // If we deleted the current wallet, switch to the first available wallet
      if (currentWalletId === walletId) {
        if (updatedWallets.length > 0) {
          saveCurrentWalletId(updatedWallets[0].id);
        } else {
          setCurrentWalletId(null);
          await AsyncStorage.removeItem('currentWalletId');
        }
      }
    } catch (error) {
      // console.error('Error deleting wallet:', error);
      throw error;
    }
  }, [wallets, currentWalletId, saveWallets, saveCurrentWalletId]);

  const logoutAndEraseWallet = useCallback(async () => {
    try {
      // console.log('🔄 Starting wallet logout and erase process...');
      
      // First, get all AsyncStorage keys to ensure we clear everything
      const allKeys = await AsyncStorage.getAllKeys();
      // console.log('📋 Found AsyncStorage keys:', allKeys);
      
      // Clear all AsyncStorage data completely
      // console.log('🗑️ Clearing all AsyncStorage data...');
      await AsyncStorage.clear();
      
      // Reset local state immediately
      // console.log('🔄 Resetting local state...');
      setWallets([]);
      setCurrentWalletId(null);
      setTheme(lightTheme); // Reset to light theme
      setSelectedCurrency('USD'); // Reset to USD
      setHideBalance(false); // Reset hide balance setting
      setAutoLockTimeout(15); // Reset auto-lock timeout to default
      
      // Clear all cached queries and reset query client
      // console.log('🔄 Clearing query cache...');
      queryClient.clear();
      queryClient.resetQueries();
      queryClient.invalidateQueries();
      
      // Clear any global state that might persist
      if (typeof global !== 'undefined') {
        if ((global as any).ecc) {
          // console.log('🔄 Clearing global ECC state...');
          delete (global as any).ecc;
        }
        
        if ((global as any).__cryptoInitialized) {
          // console.log('🔄 Resetting crypto initialization flag...');
          (global as any).__cryptoInitialized = false;
        }
        
        // Clear any other global wallet state
        if ((global as any).__walletState) {
          // console.log('🔄 Clearing global wallet state...');
          delete (global as any).__walletState;
        }
      }
      
      // console.log('✅ Wallet data cleared successfully');
      // console.log('🔄 App state has been completely reset');
      
      // Force a small delay to ensure all async operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      // console.error('❌ Error clearing wallet data:', error);
      throw new Error('Failed to clear wallet data. Please try again.');
    }
  }, [queryClient]);

  return useMemo(() => ({
    // Wallet data
    wallets,
    currentWallet,
    currentWalletId,
    isLoading: walletsQuery.isLoading || currentWalletQuery.isLoading,
    
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
    
    // Coin control
    coinControl: {
      getSelectedUtxoIds,
      setSelected: setCoinControlSelected,
      clearSelected: clearCoinControlSelected,
      toggleFreeze: toggleFreezeUtxo,
      isFrozen: isUtxoFrozen,
      filterSelectedUtxos,
    },
    
    // Actions
    createWallet,
    importWallet,
    generateNewAddress,
    switchWallet,
    editWallet,
    deleteWallet,
    toggleTheme,
    refreshData,
    logoutAndEraseWallet,
    
    // Loading states
    isCreatingWallet: saveWalletsMutation.isPending,
    isLoadingBalance: balanceQuery.isLoading,
    isLoadingTransactions: transactionsQuery.isLoading,
    isLoadingPrice: priceQuery.isLoading,
    
    // Error states for loading (only show if there's actually an error and no data)
    hasBalanceError: !!balanceQuery.error && (balanceQuery.data === undefined || balanceQuery.data === null),
    hasTransactionsError: !!transactionsQuery.error && (!transactionsQuery.data || transactionsQuery.data.length === 0),
    hasPriceError: !!priceQuery.error && !priceQuery.data,
  }), [
    wallets,
    currentWallet,
    currentWalletId,
    walletsQuery.isLoading,
    currentWalletQuery.isLoading,
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
    saveWalletsMutation.isPending,
    switchWallet,
    editWallet,
    deleteWallet,
    selectedCurrency,
    setCurrency,
    formatCurrency,
    getCurrencySymbol,
    getCurrencyName,
    hideBalance,
    setHideBalanceSetting,
    autoLockTimeout,
    setAutoLockTimeoutSetting,
    setCoinControlSelected,
    clearCoinControlSelected,
    toggleFreezeUtxo,
    isUtxoFrozen,
    filterSelectedUtxos,
    getSelectedUtxoIds,
  ]);
});