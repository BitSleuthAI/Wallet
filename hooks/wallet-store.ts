import { darkTheme, lightTheme } from '@/constants/themes';
import { getBTCPrice } from '@/services/esplora-service';
import { getWalletData } from '@/services/wallet-service';
import { FiatCurrency, Theme, UTXO, Wallet } from '@/types/wallet';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Wallet service imports with platform detection
let walletService: any;
try {
  console.log('📦 Loading wallet service in wallet store for platform:', Platform.OS);
  const importedService = require('@/services/wallet-service');
  
  console.log('📦 Wallet store imported service keys:', Object.keys(importedService));
  
  // Ensure functions are properly bound and accessible
  walletService = {
    generateMnemonic: importedService.generateMnemonic,
    validateMnemonic: importedService.validateMnemonic,
    createWallet: importedService.createWallet,
    importWallet: importedService.importWallet,
    generateAddressFromXpub: importedService.generateAddressFromXpub,
    generateNewAddress: importedService.generateNewAddress,
    getPrivateKey: importedService.getPrivateKey,
    findNextUnusedAddressIndexWithCycling: importedService.findNextUnusedAddressIndexWithCycling,
    generateAddressBatchForView: importedService.generateAddressBatchForView,
    generateAddressesForView: importedService.generateAddressesForView,
    isAddressInWallet: importedService.isAddressInWallet,
    discoverUsedAddresses: importedService.discoverUsedAddresses,
    getWalletData: importedService.getWalletData
  };
  
  // Verify all required functions are available
  const requiredFunctions = ['generateMnemonic', 'validateMnemonic', 'createWallet', 'importWallet', 'generateAddressFromXpub', 'generateNewAddress', 'getPrivateKey', 'findNextUnusedAddressIndexWithCycling', 'generateAddressBatchForView', 'generateAddressesForView', 'isAddressInWallet', 'discoverUsedAddresses', 'getWalletData'];
  const missingFunctions = requiredFunctions.filter(func => typeof walletService[func] !== 'function');
  
  if (missingFunctions.length > 0) {
    throw new Error(`Missing wallet service functions in store: ${missingFunctions.join(', ')}`);
  }
  
  console.log('✅ Wallet service loaded successfully in wallet store for', Platform.OS);
} catch (error) {
  console.error('❌ Failed to load wallet service in wallet store for', Platform.OS, ':', error);
  // Provide a minimal fallback
  walletService = {
    generateMnemonic: async () => 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    validateMnemonic: () => true,
    createWallet: async () => { throw new Error('Wallet service not available'); },
    importWallet: async () => { throw new Error('Wallet service not available'); },
    generateAddressFromXpub: async () => { throw new Error('Wallet service not available'); },
    generateNewAddress: async () => { throw new Error('Wallet service not available'); },
    getPrivateKey: async () => { throw new Error('Wallet service not available'); },
    findNextUnusedAddressIndexWithCycling: async () => { throw new Error('Wallet service not available'); },
    generateAddressBatchForView: async () => { throw new Error('Wallet service not available'); },
    generateAddressesForView: async () => { throw new Error('Wallet service not available'); },
    isAddressInWallet: async () => { throw new Error('Wallet service not available'); },
    discoverUsedAddresses: async () => { throw new Error('Wallet service not available'); },
    getWalletData: async () => { throw new Error('Wallet service not available'); }
  };
}

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
  const hasSetInitialWallet = useRef(false);
  const currentWalletIdRef = useRef<string | null>(null);
  const [feedbackPromptShown, setFeedbackPromptShown] = useState<boolean>(false);
  const [cryptoReady, setCryptoReady] = useState(false);
  const cryptoReadyRef = useRef(false);
  const [feeSettings, setFeeSettingsState] = useState({
    defaultPreset: 'economy' as 'economy' | 'standard' | 'priority' | 'custom',
    customFeeRate: 10,
    enableRBF: true,
    enableCPFP: false,
    autoAdjustFees: true,
    maxFeeRate: 100,
    dustThreshold: 546,
  });

  // Computed current wallet
  const currentWallet = wallets.find(w => w.id === currentWalletId) || wallets[0] || null;

  // Monitor crypto initialization
  useEffect(() => {
    const checkCryptoReady = () => {
      const isReady = !!(global as any).__cryptoInitialized;
      if (isReady && !cryptoReadyRef.current) {
        console.log('🔧 Crypto is ready, enabling queries...');
        cryptoReadyRef.current = true;
        setCryptoReady(true);
        // Invalidate queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['bitcoin-price'] });
      }
    };

    // Check immediately
    checkCryptoReady();

    // Only set up interval if crypto is not ready yet
    let interval: ReturnType<typeof setInterval> | null = null;
    if (!cryptoReadyRef.current) {
      interval = setInterval(checkCryptoReady, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [queryClient]);

  // Keep ref in sync with state
  useEffect(() => {
    cryptoReadyRef.current = cryptoReady;
  }, [cryptoReady]);

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
        
        // Migrate wallet type from 'hd' to 'segwit-native' for existing wallets
        const walletsData = await AsyncStorage.getItem('wallets');
        if (walletsData) {
          const wallets = JSON.parse(walletsData);
          let needsUpdate = false;
          
          const updatedWallets = wallets.map((wallet: any) => {
            if (wallet.type === 'hd' && wallet.addressType === 'p2wpkh') {
              needsUpdate = true;
              return { ...wallet, type: 'segwit-native' };
            }
            return wallet;
          });
          
          if (needsUpdate) {
            await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
            console.log('✅ Migrated wallet types from hd to segwit-native');
          }
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
    staleTime: Infinity, // Wallets data is always fresh from AsyncStorage
    gcTime: Infinity, // Keep wallets in cache indefinitely
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

  // Load feedback tracking data
  const feedbackTrackingQuery = useQuery({
    queryKey: ['feedbackTracking'],
    queryFn: async () => {
      const firstUsed = await AsyncStorage.getItem('appFirstUsed');
      const feedbackShown = await AsyncStorage.getItem('feedbackPromptShown');
      const feedbackDismissed = await AsyncStorage.getItem('feedbackPromptDismissed');
      
      return {
        firstUsed: firstUsed ? parseInt(firstUsed, 10) : null,
        feedbackShown: feedbackShown === 'true',
        feedbackDismissed: feedbackDismissed === 'true',
      };
    },
  });

  // Load fee settings from storage
  const feeSettingsQuery = useQuery({
    queryKey: ['feeSettings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('feeSettings');
      return stored ? JSON.parse(stored) : {
        defaultPreset: 'economy',
        customFeeRate: 10,
        enableRBF: true,
        enableCPFP: false,
        autoAdjustFees: true,
        maxFeeRate: 100,
        dustThreshold: 546,
      };
    },
  });

  // Bitcoin price query using Esplora service
  const priceQuery = useQuery({
    queryKey: ['bitcoin-price-improved', selectedCurrency],
    queryFn: async () => {
      console.log('💲 Fetching BTC price using Esplora service...');
      const priceResult = await getBTCPrice();
      
      if (priceResult.error || !priceResult.data) {
        console.warn('❌ BTC price fetch failed:', priceResult.error);
        return {
          usd: 0,
          usd_24h_change: 0,
          USD: { last: 0 }
        };
      }
      
      const { price: usdPrice, change24h } = priceResult.data;
      console.log('✅ BTC price fetched:', usdPrice, 'USD, 24h change:', change24h);
      
      // Return in the format expected by the UI
      const priceData = {
        usd: usdPrice,
        usd_24h_change: change24h,
        USD: { last: usdPrice }
      };
      
      // Convert USD price to selected currency if needed
      if (selectedCurrency === 'USD') {
        return priceData;
      }
      
      // Fetch exchange rates for EUR and GBP using XMLHttpRequest
      try {
        const data = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.timeout = 10000;
          
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                try {
                  const data = JSON.parse(xhr.responseText);
                  resolve(data);
                } catch (parseError) {
                  reject(new Error('Failed to parse exchange rate data'));
                }
              } else {
                reject(new Error(`Exchange rate fetch failed: ${xhr.status}`));
              }
            }
          };
          
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.ontimeout = () => reject(new Error('Request timeout'));
          
          xhr.open('GET', `https://api.exchangerate-api.com/v4/latest/USD`, true);
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();
        });
        
        const rate = (data as any).rates[selectedCurrency] || 1;
        
        return {
          usd: usdPrice * rate,
          usd_24h_change: change24h, // Keep the same percentage change
          USD: { last: usdPrice * rate },
          [selectedCurrency]: { last: usdPrice * rate }
        };
      } catch (error) {
        console.warn('❌ Failed to fetch exchange rates, using USD prices:', error);
        return {
          usd: usdPrice,
          usd_24h_change: change24h,
          USD: { last: usdPrice }
        };
      }
    },
    enabled: cryptoReady,
    refetchInterval: 120000, // Refetch every 2 minutes (less aggressive)
    retry: 1, // Reduced retries
    retryDelay: 5000, // Fixed 5 second delay
    staleTime: 300000, // Consider data fresh for 5 minutes
    throwOnError: false, // Don't throw errors, handle them gracefully
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Only refetch on mount
  });

  // Wallet balance query using improved service
  const balanceQuery = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['wallet-balance-improved', currentWallet?.id, currentWallet?.xpub],
    queryFn: async () => {
      // Guard against undefined wallet during state transitions
      if (!currentWallet || !currentWallet.xpub) {
        console.log('⏸️ Skipping balance fetch - no current wallet');
        return 0;
      }
      try {
        console.log('💰 Fetching wallet balance using improved service...');
        const result = await getWalletData(currentWallet.xpub);
        
        if (result.error) {
          console.warn('❌ Wallet balance fetch failed:', result.error);
          return 0;
        }
        
        if (!result.data) {
          console.log('ℹ️ No wallet data returned for balance');
          return 0;
        }
        
        console.log('✅ Wallet balance fetched:', result.data.balanceBTC, 'BTC');
        return result.data.balanceBTC || 0;
      } catch (error) {
        console.warn('❌ Improved balance fetch failed:', error);
        return 0; // Return 0 instead of throwing
      }
    },
    enabled: !!currentWallet && !!currentWallet.xpub && cryptoReady,
    refetchInterval: 120000, // Refetch every 2 minutes
    retry: 2, // Allow retries for network issues
    retryDelay: 10000, // 10 second delay between retries
    staleTime: 300000, // Consider data fresh for 5 minutes
    throwOnError: false, // Don't throw errors, handle them gracefully
    refetchOnWindowFocus: false, // Don't refetch on window focus
    gcTime: 300000, // Keep cached data for 5 minutes even when query is disabled (wallet switching)
  });

  // Transaction history query
  const transactionsQuery = useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['transactions-improved', currentWallet?.id, currentWallet?.xpub],
    queryFn: async () => {
      // Guard against undefined wallet during state transitions
      if (!currentWallet || !currentWallet.xpub) {
        console.log('⏸️ Skipping transaction fetch - no current wallet');
        return [];
      }
      
      console.log('🔍 Wallet store: Fetching transactions using address discovery for wallet:', currentWallet.name);
      
      try {
        const result = await getWalletData(currentWallet.xpub);
        
        if (result.error) {
          console.warn('❌ Wallet data fetch failed:', result.error);
          return [];
        }
        
        if (!result.data) {
          console.log('ℹ️ No wallet data returned');
          return [];
        }
        
        console.log('📊 Wallet store: Received improved transactions:', result.data.transactions?.length || 0);
        return result.data.transactions || [];
      } catch (error) {
        console.warn('❌ Improved transaction history fetch failed:', error);
        return []; // Return empty array instead of throwing
      }
    },
    enabled: !!currentWallet && !!currentWallet.xpub && cryptoReady,
    refetchInterval: 120000, // Refetch every 2 minutes
    retry: 1, // Reduced retries
    retryDelay: 15000, // Fixed 15 second delay
    staleTime: 180000, // Consider data fresh for 3 minutes
    throwOnError: false, // Don't throw errors, handle them gracefully
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Only refetch on mount
    gcTime: 300000, // Keep cached data for 5 minutes even when query is disabled (wallet switching)
  });

  // Save wallets mutation
  const saveWalletsMutation = useMutation({
    mutationFn: async (walletsToSave: Wallet[]) => {
      await AsyncStorage.setItem('wallets', JSON.stringify(walletsToSave));
      return walletsToSave;
    },
    onSuccess: (walletsToSave) => {
      setWallets(walletsToSave);
      // Don't invalidate immediately - let the state settle first
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
      }, 100);
    },
  });
  const { mutate: saveWallets } = saveWalletsMutation;

  // Save current wallet ID mutation
  const saveCurrentWalletIdMutation = useMutation({
    mutationFn: async (walletId: string) => {
      await AsyncStorage.setItem('currentWalletId', walletId);
      return walletId;
    },
    onMutate: async (newWalletId: string) => {
      // Capture the old wallet ID and wallet object BEFORE the mutation runs
      const oldWalletId = currentWalletIdRef.current;
      const oldWallet = oldWalletId ? wallets.find(w => w.id === oldWalletId) : null;
      const newWallet = wallets.find(w => w.id === newWalletId);
      
      // Return context with old and new wallet info
      return { oldWalletId, oldWallet, newWallet };
    },
    onSuccess: (walletId, _variables, context) => {
      setCurrentWalletId(walletId);
      
      // Invalidate dependent queries after state updates
      // Use proper query key structure that matches the actual query keys
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['currentWalletId'] });
        
        // Invalidate old wallet queries with full key structure
        if (context?.oldWallet) {
          queryClient.invalidateQueries({ 
            queryKey: ['wallet-balance-improved', context.oldWallet.id, context.oldWallet.xpub] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['transactions-improved', context.oldWallet.id, context.oldWallet.xpub] 
          });
        }
        
        // Invalidate new wallet queries with full key structure to force fresh fetch
        if (context?.newWallet) {
          queryClient.invalidateQueries({ 
            queryKey: ['wallet-balance-improved', context.newWallet.id, context.newWallet.xpub] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['transactions-improved', context.newWallet.id, context.newWallet.xpub] 
          });
        }
      }, 150);
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

  // Save fee settings mutation
  const saveFeeSettingsMutation = useMutation({
    mutationFn: async (settings: typeof feeSettings) => {
      await AsyncStorage.setItem('feeSettings', JSON.stringify(settings));
      return settings;
    },
    onSuccess: (settings) => {
      setFeeSettingsState(settings);
      queryClient.invalidateQueries({ queryKey: ['feeSettings'] });
    },
  });
  const { mutate: saveFeeSettings } = saveFeeSettingsMutation;

  // Track first app usage and feedback prompt
  useEffect(() => {
    const trackFirstUsage = async () => {
      const firstUsed = await AsyncStorage.getItem('appFirstUsed');
      if (!firstUsed) {
        const now = Date.now();
        await AsyncStorage.setItem('appFirstUsed', now.toString());
        queryClient.invalidateQueries({ queryKey: ['feedbackTracking'] });
      }
    };
    trackFirstUsage();
  }, [queryClient]);

  // Mark feedback prompt as shown
  const markFeedbackPromptShown = useCallback(async () => {
    await AsyncStorage.setItem('feedbackPromptShown', 'true');
    setFeedbackPromptShown(true);
    queryClient.invalidateQueries({ queryKey: ['feedbackTracking'] });
  }, [queryClient]);

  // Mark feedback prompt as dismissed
  const markFeedbackPromptDismissed = useCallback(async () => {
    await AsyncStorage.setItem('feedbackPromptDismissed', 'true');
    queryClient.invalidateQueries({ queryKey: ['feedbackTracking'] });
  }, [queryClient]);

  // Check if feedback prompt should be shown (after 3 weeks of usage)
  const shouldShowFeedbackPrompt = useMemo(() => {
    if (!feedbackTrackingQuery.data) return false;
    
    const { firstUsed, feedbackShown, feedbackDismissed } = feedbackTrackingQuery.data;
    
    // Don't show if already shown or dismissed
    if (feedbackShown || feedbackDismissed) return false;
    
    // Don't show if first usage not tracked
    if (!firstUsed) return false;
    
    // Show after 3 weeks (21 days) of usage
    const threeWeeksInMs = 21 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    return (now - firstUsed) >= threeWeeksInMs;
  }, [feedbackTrackingQuery.data]);

  useEffect(() => {
    if (walletsQuery.data) {
      setWallets(walletsQuery.data);
    }
  }, [walletsQuery.data]);

  // Update ref when currentWalletId changes
  useEffect(() => {
    currentWalletIdRef.current = currentWalletId;
  }, [currentWalletId]);

  // Separate effect to handle setting initial wallet ID
  useEffect(() => {
    if (walletsQuery.data && walletsQuery.data.length > 0 && !currentWalletIdRef.current && !currentWalletQuery.isLoading && !hasSetInitialWallet.current) {
      hasSetInitialWallet.current = true;
      // Use direct AsyncStorage call to avoid mutation cycle
      AsyncStorage.setItem('currentWalletId', walletsQuery.data[0].id).then(() => {
        setCurrentWalletId(walletsQuery.data[0].id);
      });
    }
  }, [walletsQuery.data, currentWalletQuery.isLoading]);

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

  useEffect(() => {
    if (feeSettingsQuery.data) {
      setFeeSettingsState(feeSettingsQuery.data);
    }
  }, [feeSettingsQuery.data]);

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
      
      console.log('💼 Creating new wallet:', trimmedName);
      const wallet = await walletService.createWallet(trimmedName, color);
      const updatedWallets = [...wallets, wallet];
      
      // Update state and storage synchronously
      await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
      await AsyncStorage.setItem('currentWalletId', wallet.id);
      
      setWallets(updatedWallets);
      setCurrentWalletId(wallet.id);
      
      // Wait for state to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['currentWalletId'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance-improved'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-improved'] });
      
      console.log('✅ Wallet created successfully');
      return { success: true, wallet };
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create wallet' };
    }
  }, [wallets, queryClient]);

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
      
      console.log('📥 Importing wallet:', trimmedName);
      const wallet = await walletService.importWallet(trimmedName, trimmedMnemonic, color);
      const updatedWallets = [...wallets, wallet];
      
      // Update state and storage synchronously
      await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
      await AsyncStorage.setItem('currentWalletId', wallet.id);
      
      setWallets(updatedWallets);
      setCurrentWalletId(wallet.id);
      
      // Wait for state to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['currentWalletId'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance-improved'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-improved'] });
      
      console.log('✅ Wallet imported successfully');
      return { success: true, wallet };
    } catch (error) {
      console.error('❌ Error importing wallet:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to import wallet' };
    }
  }, [wallets, queryClient]);

  const generateNewAddress = useCallback(async (): Promise<{ success: boolean; address?: string; error?: string }> => {
    if (!currentWallet) return { success: false, error: 'No wallet selected' };
    try {
      console.log('🚀 Fast address generation starting...');
      const startTime = Date.now();
      
      const updatedWallet = await walletService.generateNewAddress(currentWallet);
      const updatedWallets = wallets.map(w => w.id === updatedWallet.id ? updatedWallet : w);
      saveWallets(updatedWallets);
      
      // Validate that the wallet has addresses before accessing
      if (!updatedWallet.addresses || updatedWallet.addresses.length === 0) {
        return { success: false, error: 'No addresses available in updated wallet' };
      }
      
      const newAddress = updatedWallet.addresses[updatedWallet.addresses.length - 1];
      const endTime = Date.now();
      console.log(`✅ Fast address generation completed in ${endTime - startTime}ms`);
      
      return { success: true, address: newAddress };
    } catch (error) {
      console.error('Error generating new address:', error);
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

  const setFeeSettings = useCallback((settings: typeof feeSettings) => {
    saveFeeSettings(settings);
  }, [saveFeeSettings]);

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
      
      // Don't clear entire cache - preserve transaction history for other wallets
      // Only invalidate queries to trigger fresh fetches for current data
      queryClient.invalidateQueries({ queryKey: ['wallet-balance-improved'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-improved'] });
      queryClient.invalidateQueries({ queryKey: ['bitcoin-price-improved'] });
      
      // console.log('✅ Wallet data refresh initiated');
    } catch (error) {
      // console.warn('⚠️ Error during data refresh:', error);
    }
  }, [queryClient]);

  const debugTransactionFetching = useCallback(async () => {
    if (!currentWallet || !currentWallet.addresses.length) {
      console.log('🚫 No current wallet or addresses available for debugging');
      return;
    }
    
    console.log('🔧 Starting debug transaction fetching...');
    const { esploraGet, getAddressTransactions, testProviderConnectivity } = await import('@/services/esplora-service');
    
    // First test provider connectivity
    console.log('🧪 Testing provider connectivity...');
    const connectivityResult = await testProviderConnectivity();
    console.log('🔧 Provider connectivity:', connectivityResult.data ? '✅ Connected' : '❌ Failed', connectivityResult.error || '');
    
    // Test with a known address that has transactions (Bitcoin Genesis block address)
    console.log('🧪 Testing with known address (Genesis block)...');
    try {
      const genesisAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const genesisResult = await getAddressTransactions(genesisAddress);
      console.log('🔧 Genesis address test:', genesisResult.data ? `✅ Found ${genesisResult.data.length} transactions` : '❌ Failed', genesisResult.error || '');
    } catch (error) {
      console.log('🔧 Genesis address test failed:', error);
    }
    
    // Test raw esploraGet with a simple endpoint
    console.log('🧪 Testing raw esploraGet...');
    try {
      const blockHeight = await esploraGet('/blocks/tip/height');
      console.log('🔧 Raw esploraGet test:', `✅ Block height: ${blockHeight}`);
    } catch (error) {
      console.log('🔧 Raw esploraGet test failed:', error);
    }
    
    console.log('🔧 Now testing your wallet addresses...');
    for (const address of currentWallet.addresses) {
      console.log(`🔧 Testing address: ${address}`);
      try {
        const result = await getAddressTransactions(address);
        console.log(`🔧 Address ${address}:`, result.data ? `✅ Found ${result.data.length} transactions` : '❌ Failed', result.error || '');
      } catch (error) {
        console.log(`🔧 Address ${address} test failed:`, error);
      }
    }
  }, [currentWallet]);

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
      console.log('🗑️ Starting wallet deletion for ID:', walletId);
      
      // Get wallet references before filtering
      const deletedWallet = wallets.find(w => w.id === walletId);
      const updatedWallets = wallets.filter(w => w.id !== walletId);
      
      // Determine if we need to switch the current wallet
      const isDeletingCurrentWallet = currentWalletId === walletId;
      
      // Update all state and storage together
      await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
      setWallets(updatedWallets);
      
      // Handle current wallet ID updates
      if (isDeletingCurrentWallet) {
        if (updatedWallets.length > 0) {
          // Switch to the first remaining wallet
          const newCurrentWalletId = updatedWallets[0].id;
          await AsyncStorage.setItem('currentWalletId', newCurrentWalletId);
          setCurrentWalletId(newCurrentWalletId);
        } else {
          // No wallets left, clear current wallet ID
          await AsyncStorage.removeItem('currentWalletId');
          setCurrentWalletId(null);
        }
      }
      
      // Cancel any pending queries for the deleted wallet using full key structure
      if (deletedWallet) {
        queryClient.cancelQueries({ 
          queryKey: ['wallet-balance-improved', deletedWallet.id, deletedWallet.xpub] 
        });
        queryClient.cancelQueries({ 
          queryKey: ['transactions-improved', deletedWallet.id, deletedWallet.xpub] 
        });
      }
      
      // Wait for state to settle before invalidating queries
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Now invalidate queries for the new current wallet
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['currentWalletId'] });
      
      // Invalidate new current wallet queries with full key structure
      if (isDeletingCurrentWallet && updatedWallets.length > 0) {
        const newCurrentWallet = updatedWallets[0];
        queryClient.invalidateQueries({ 
          queryKey: ['wallet-balance-improved', newCurrentWallet.id, newCurrentWallet.xpub] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['transactions-improved', newCurrentWallet.id, newCurrentWallet.xpub] 
        });
      }
      
      console.log('✅ Wallet deletion completed successfully');
    } catch (error) {
      console.error('❌ Error deleting wallet:', error);
      throw error;
    }
  }, [wallets, currentWalletId, queryClient]);

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

  // Split the large useMemo into smaller, more focused ones to reduce re-renders
  const walletData = useMemo(() => ({
    wallets,
    currentWallet,
    currentWalletId,
    isLoading: walletsQuery.isLoading || currentWalletQuery.isLoading,
  }), [wallets, currentWallet, currentWalletId, walletsQuery.isLoading, currentWalletQuery.isLoading]);

  const balanceData = useMemo(() => ({
    balance: balanceQuery.data || 0,
    balanceUSD: (balanceQuery.data || 0) * (priceQuery.data?.usd || 0),
    bitcoinPrice: priceQuery.data,
    isLoadingBalance: balanceQuery.isLoading,
    isLoadingPrice: priceQuery.isLoading,
    hasBalanceError: !!balanceQuery.error && (balanceQuery.data === undefined || balanceQuery.data === null),
    hasPriceError: !!priceQuery.error && !priceQuery.data,
    balanceError: balanceQuery.error,
    priceError: priceQuery.error,
  }), [balanceQuery.data, balanceQuery.isLoading, balanceQuery.error, priceQuery.data, priceQuery.isLoading, priceQuery.error]);

  const transactionData = useMemo(() => ({
    transactions: transactionsQuery.data || [],
    isLoadingTransactions: transactionsQuery.isLoading,
    hasTransactionsError: !!transactionsQuery.error && (!transactionsQuery.data || transactionsQuery.data.length === 0),
    transactionsError: transactionsQuery.error,
  }), [transactionsQuery.data, transactionsQuery.isLoading, transactionsQuery.error]);

  const settingsData = useMemo(() => ({
    theme,
    selectedCurrency,
    hideBalance,
    autoLockTimeout,
    feeSettings,
    feeSettingsLoading: feeSettingsQuery.isLoading,
  }), [theme, selectedCurrency, hideBalance, autoLockTimeout, feeSettings, feeSettingsQuery.isLoading]);

  const actionsData = useMemo(() => ({
    createWallet,
    importWallet,
    generateNewAddress,
    switchWallet,
    editWallet,
    deleteWallet,
    toggleTheme,
    refreshData,
    logoutAndEraseWallet,
    setCurrency,
    formatCurrency,
    getCurrencySymbol,
    getCurrencyName,
    setHideBalanceSetting,
    setAutoLockTimeoutSetting,
    setFeeSettings,
  }), [
    createWallet,
    importWallet,
    generateNewAddress,
    switchWallet,
    editWallet,
    deleteWallet,
    toggleTheme,
    refreshData,
    logoutAndEraseWallet,
    setCurrency,
    formatCurrency,
    getCurrencySymbol,
    getCurrencyName,
    setHideBalanceSetting,
    setAutoLockTimeoutSetting,
    setFeeSettings,
  ]);

  const coinControlData = useMemo(() => ({
    getSelectedUtxoIds,
    setSelected: setCoinControlSelected,
    clearSelected: clearCoinControlSelected,
    toggleFreeze: toggleFreezeUtxo,
    isFrozen: isUtxoFrozen,
    filterSelectedUtxos,
  }), [
    getSelectedUtxoIds,
    setCoinControlSelected,
    clearCoinControlSelected,
    toggleFreezeUtxo,
    isUtxoFrozen,
    filterSelectedUtxos,
  ]);

  const feedbackData = useMemo(() => ({
    shouldShowFeedbackPrompt,
    markFeedbackPromptShown,
    markFeedbackPromptDismissed,
  }), [shouldShowFeedbackPrompt, markFeedbackPromptShown, markFeedbackPromptDismissed]);

  // Memoize the final returned object to prevent unnecessary re-renders
  const walletStoreData = useMemo(() => ({
    ...walletData,
    ...balanceData,
    ...transactionData,
    ...settingsData,
    ...actionsData,
    coinControl: coinControlData,
    ...feedbackData,
    isCreatingWallet: saveWalletsMutation.isPending,
  }), [
    walletData,
    balanceData,
    transactionData,
    settingsData,
    actionsData,
    coinControlData,
    feedbackData,
    saveWalletsMutation.isPending,
  ]);

  return walletStoreData;
});