import { darkTheme, lightTheme } from '@/constants/themes';
import { clearCacheForWalletXpub } from '@/services/address-cache-service';
import { getBTCPrice } from '@/services/esplora-service';
import { getWalletData } from '@/services/wallet-service';
import { FeeSettings, FiatCurrency, Theme, Transaction, UTXO, Wallet } from '@/types/wallet';
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

const FEE_SETTINGS_STORAGE_KEY = 'feeSettingsByWallet';
const LEGACY_FEE_SETTINGS_STORAGE_KEY = 'feeSettings';
const FALLBACK_WALLET_ID = '__global';

const defaultFeeSettings: FeeSettings = {
  defaultPreset: 'economy',
  customFeeRate: 10,
  enableRBF: true,
  enableCPFP: true,
  autoAdjustFees: true,
  maxFeeRate: 100,
  dustThreshold: 546,
  cpfpMaxChildFee: 10000,
  cpfpIncludeUnconfirmed: true,
};

const FEE_PRESETS: FeeSettings['defaultPreset'][] = ['economy', 'standard', 'priority', 'custom'];

const isValidFeePreset = (value: unknown): value is FeeSettings['defaultPreset'] => {
  return typeof value === 'string' && FEE_PRESETS.includes(value as FeeSettings['defaultPreset']);
};

const ensurePositiveInteger = (value: unknown, fallback: number, min: number = 1): number => {
  const numeric = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (Number.isFinite(numeric) && numeric >= min) {
    return Math.floor(numeric);
  }
  return fallback;
};

const ensureBoolean = (value: unknown, fallback: boolean): boolean => {
  return typeof value === 'boolean' ? value : fallback;
};

const normalizeFeeSettings = (settings?: Partial<FeeSettings>): FeeSettings => {
  const source = settings || {};

  return {
    defaultPreset: isValidFeePreset(source.defaultPreset) ? source.defaultPreset : defaultFeeSettings.defaultPreset,
    customFeeRate: ensurePositiveInteger(source.customFeeRate, defaultFeeSettings.customFeeRate),
    enableRBF: ensureBoolean(source.enableRBF, defaultFeeSettings.enableRBF),
    enableCPFP: ensureBoolean(source.enableCPFP, defaultFeeSettings.enableCPFP),
    autoAdjustFees: ensureBoolean(source.autoAdjustFees, defaultFeeSettings.autoAdjustFees),
    maxFeeRate: ensurePositiveInteger(source.maxFeeRate, defaultFeeSettings.maxFeeRate),
    dustThreshold: ensurePositiveInteger(source.dustThreshold, defaultFeeSettings.dustThreshold),
    cpfpMaxChildFee: ensurePositiveInteger(source.cpfpMaxChildFee, defaultFeeSettings.cpfpMaxChildFee),
    cpfpIncludeUnconfirmed: ensureBoolean(source.cpfpIncludeUnconfirmed, defaultFeeSettings.cpfpIncludeUnconfirmed),
  };
};

const normalizeFeeSettingsMap = (map: unknown): Record<string, FeeSettings> => {
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    return {};
  }

  return Object.entries(map as Record<string, unknown>).reduce<Record<string, FeeSettings>>((acc, [key, value]) => {
    if (value && typeof value === 'object') {
      acc[key] = normalizeFeeSettings(value as Partial<FeeSettings>);
    }
    return acc;
  }, {});
};

const areFeeSettingsEqual = (a: FeeSettings, b: FeeSettings): boolean => {
  return (
    a.defaultPreset === b.defaultPreset &&
    a.customFeeRate === b.customFeeRate &&
    a.enableRBF === b.enableRBF &&
    a.enableCPFP === b.enableCPFP &&
    a.autoAdjustFees === b.autoAdjustFees &&
    a.maxFeeRate === b.maxFeeRate &&
    a.dustThreshold === b.dustThreshold &&
    a.cpfpMaxChildFee === b.cpfpMaxChildFee &&
    a.cpfpIncludeUnconfirmed === b.cpfpIncludeUnconfirmed
  );
};

const feeSettingsMapsEqual = (a: Record<string, FeeSettings>, b: Record<string, FeeSettings>): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    const first = a[key];
    const second = b[key];
    if (!second || !areFeeSettingsEqual(first, second)) {
      return false;
    }
  }

  return true;
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
  const currentWalletIdRef = useRef<string | null>(null);
  const [cryptoReady, setCryptoReady] = useState(false);
  const cryptoReadyRef = useRef(false);
  const [feeSettingsMap, setFeeSettingsMap] = useState<Record<string, FeeSettings>>({});
  const [feeSettings, setFeeSettingsState] = useState<FeeSettings>(() => ({ ...defaultFeeSettings }));

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
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Load current wallet ID from storage
  const currentWalletQuery = useQuery({
    queryKey: ['currentWalletId'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('currentWalletId');
      return stored || null;
    },
  });

  const feeSettingsByWalletQuery = useQuery({
    queryKey: ['feeSettingsByWallet'],
    queryFn: async () => {
      try {
        const storedMap = await AsyncStorage.getItem(FEE_SETTINGS_STORAGE_KEY);
        const data = storedMap ? JSON.parse(storedMap) : {};
        return normalizeFeeSettingsMap(data);
      } catch (err) {
        console.warn('Failed to load fee settings map, using defaults.', err);
        return {};
      }
    },
  });

  useEffect(() => {
    if (walletsQuery.data) {
      setWallets(walletsQuery.data);
    }
  }, [walletsQuery.data]);

  useEffect(() => {
    if (currentWalletQuery.data) {
      setCurrentWalletId(currentWalletQuery.data);
    }
  }, [currentWalletQuery.data]);

  const feeSettingsLoading = feeSettingsByWalletQuery.isLoading || walletsQuery.isLoading;

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
    refetchInterval: false, // Disable automatic refetching - price doesn't change that rapidly
    retry: 1, // Reduced retries
    retryDelay: 15000, // Longer delay between retries
    staleTime: 5 * 60 * 1000, // 5 minutes - price data is fresh for this long
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    throwOnError: false, // Don't throw errors, handle them gracefully
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount - price is not wallet-specific
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
    refetchInterval: false, // Disable automatic refetching - use manual refresh instead to reduce API calls
    retry: 1, // Reduce retries to avoid hammering the API on iOS
    retryDelay: 15000, // Longer delay between retries
    staleTime: 15 * 60 * 1000, // 15 minutes - keep data fresh longer to avoid redundant refreshes
    gcTime: 30 * 60 * 1000, // 30 minutes - retain data for smoother wallet switching
    throwOnError: false, // Don't throw errors, handle them gracefully
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Use cached data when returning to the screen to prevent duplicate requests
    refetchOnReconnect: false, // Avoid immediate refetches when network state changes
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
    refetchInterval: false, // Disable automatic refetching - use manual refresh instead to reduce API calls
    retry: 1, // Reduced retries to avoid hammering the API on iOS
    retryDelay: 15000, // Fixed 15 second delay
    staleTime: 15 * 60 * 1000, // 15 minutes - keep data fresh longer to avoid redundant refreshes
    gcTime: 30 * 60 * 1000, // 30 minutes - retain data for smoother wallet switching
    throwOnError: false, // Don't throw errors, handle them gracefully
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Use cached data when returning to the screen to prevent duplicate requests
    refetchOnReconnect: false, // Avoid immediate refetches when network state changes
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

  const upsertFeeSettings = useCallback(async (walletId: string, settings: FeeSettings) => {
    const normalized = normalizeFeeSettings(settings);

    const updatedMap = { ...feeSettingsMap, [walletId]: normalized };

    if (!feeSettingsMapsEqual(updatedMap, feeSettingsMap)) {
      setFeeSettingsMap(updatedMap);
    }

    if (walletId === currentWalletId && !areFeeSettingsEqual(normalized, feeSettings)) {
      setFeeSettingsState(normalized);
    }

    try {
      await AsyncStorage.setItem(FEE_SETTINGS_STORAGE_KEY, JSON.stringify(updatedMap));
    } catch (err) {
      console.warn('Failed to persist fee settings map', err);
    }
  }, [currentWalletId, feeSettingsMap, feeSettings]);

  const migrateLegacyFeeSettings = useCallback(async (map: Record<string, FeeSettings>) => {
    const result = { ...map };

    try {
      const legacy = await AsyncStorage.getItem(LEGACY_FEE_SETTINGS_STORAGE_KEY);
      if (!legacy) {
        return result;
      }

      const parsed = normalizeFeeSettings(JSON.parse(legacy));
      result[FALLBACK_WALLET_ID] = parsed;

      await AsyncStorage.removeItem(LEGACY_FEE_SETTINGS_STORAGE_KEY);
      await AsyncStorage.setItem(FEE_SETTINGS_STORAGE_KEY, JSON.stringify(result));
    } catch (err) {
      console.warn('Failed to migrate legacy fee settings', err);
    }

    return result;
  }, []);

  useEffect(() => {
    const applySettingsMap = async () => {
      if (!feeSettingsByWalletQuery.data || feeSettingsByWalletQuery.isLoading) {
        return;
      }

      const normalizedMap = await migrateLegacyFeeSettings(feeSettingsByWalletQuery.data);

      if (!feeSettingsMapsEqual(normalizedMap, feeSettingsMap)) {
        setFeeSettingsMap(normalizedMap);
      }
    };

    applySettingsMap();
  }, [feeSettingsByWalletQuery.data, feeSettingsByWalletQuery.isLoading, migrateLegacyFeeSettings, feeSettingsMap]);

  useEffect(() => {
    if (!feeSettingsLoading) {
      const settings = getCurrentFeeSettings();
      setFeeSettingsState(settings);
    }
  }, [currentWalletId, feeSettingsLoading, getCurrentFeeSettings]);

  const setFeeSettings = useCallback((settings: FeeSettings) => {
    const walletId = currentWalletId || FALLBACK_WALLET_ID;
    void upsertFeeSettings(walletId, settings);
  }, [currentWalletId, upsertFeeSettings]);

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
    const frozenMap = { ...(coinControlFrozen || {}) } as Record<string, string[]>;
    const frozenSet = new Set(frozenMap[currentWallet.id] || []);
    let isNowFrozen = false;
    if (frozenSet.has(utxoId)) {
      frozenSet.delete(utxoId);
    } else {
      frozenSet.add(utxoId);
      isNowFrozen = true;
    }
    frozenMap[currentWallet.id] = Array.from(frozenSet);
    saveCoinControlFrozen(frozenMap);

    if (isNowFrozen) {
      const selectedMap = { ...(coinControlSelected || {}) } as Record<string, string[]>;
      const selectedSet = new Set(selectedMap[currentWallet.id] || []);
      if (selectedSet.delete(utxoId)) {
        selectedMap[currentWallet.id] = Array.from(selectedSet);
        saveCoinControlSelected(selectedMap);
      }
    }
  }, [currentWallet, coinControlFrozen, coinControlSelected, saveCoinControlFrozen, saveCoinControlSelected]);

  const isUtxoFrozen = useCallback((utxoId: string) => {
    if (!currentWallet) return false;
    const list = coinControlFrozen[currentWallet.id] || [];
    return list.includes(utxoId);
  }, [currentWallet, coinControlFrozen]);

  const getSelectedUtxoIds = useCallback(() => {
    if (!currentWallet) return [] as string[];
    return coinControlSelected[currentWallet.id] || [];
  }, [currentWallet, coinControlSelected]);

  const getFrozenUtxoIds = useCallback(() => {
    if (!currentWallet) return [] as string[];
    return coinControlFrozen[currentWallet.id] || [];
  }, [currentWallet, coinControlFrozen]);

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
    try {
      await AsyncStorage.multiRemove([
        'mock_data', 'test_data', 'sample_data', 'dummy_data',
        'demo_balance', 'demo_transactions', 'mock_balance', 'mock_transactions',
        'sample_balance', 'sample_transactions', 'test_balance', 'test_transactions'
      ]);

      queryClient.invalidateQueries({ queryKey: ['wallet-balance-improved'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-improved'] });
      queryClient.invalidateQueries({ queryKey: ['bitcoin-price-improved'] });
    } catch (err) {
      console.warn('⚠️ Error during data refresh:', err);
    }
  }, [queryClient]);

  const debugTransactionFetching = useCallback(async () => {
    if (!currentWallet || !currentWallet.addresses.length) {
      console.log('🚫 No current wallet or addresses available for debugging');
      return;
    }

    console.log('🔧 Starting debug transaction fetching...');
    const { esploraGet, getAddressTransactions, testProviderConnectivity } = await import('@/services/esplora-service');

    console.log('🧪 Testing provider connectivity...');
    const connectivityResult = await testProviderConnectivity();
    console.log('🔧 Provider connectivity:', connectivityResult.data ? '✅ Connected' : '❌ Failed', connectivityResult.error || '');

    console.log('🧪 Testing with known address (Genesis block)...');
    try {
      const genesisAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const genesisResult = await getAddressTransactions(genesisAddress);
      console.log('🔧 Genesis address test:', genesisResult.data ? `✅ Found ${genesisResult.data.length} transactions` : '❌ Failed', genesisResult.error || '');
    } catch (err) {
      console.log('🔧 Genesis address test failed:', err);
    }

    console.log('🧪 Testing raw esploraGet...');
    try {
      const blockHeight = await esploraGet('/blocks/tip/height');
      console.log('🔧 Raw esploraGet test:', `✅ Block height: ${blockHeight}`);
    } catch (err) {
      console.log('🔧 Raw esploraGet test failed:', err);
    }

    console.log('🔧 Now testing your wallet addresses...');
    for (const address of currentWallet.addresses) {
      console.log(`🔧 Testing address: ${address}`);
      try {
        const result = await getAddressTransactions(address, currentWallet.xpub);
        console.log(`🔧 Address ${address}:`, result.data ? `✅ Found ${result.data.length} transactions` : '❌ Failed', result.error || '');
      } catch (err) {
        console.log(`🔧 Address ${address} test failed:`, err);
      }
    }
  }, [currentWallet]);

  // Debounce wallet switching to prevent rapid API calls on iOS
  const switchWalletTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const switchWallet = useCallback((walletId: string) => {
    if (wallets.find(w => w.id === walletId)) {
      // Clear any pending wallet switch
      if (switchWalletTimeoutRef.current) {
        clearTimeout(switchWalletTimeoutRef.current);
      }
      
      // Debounce wallet switching by 300ms to prevent rapid successive calls
      // This is especially important on iOS where state updates can trigger multiple re-renders
      switchWalletTimeoutRef.current = setTimeout(() => {
        saveCurrentWalletId(walletId);
        switchWalletTimeoutRef.current = null;
      }, 300);
    }
  }, [wallets, saveCurrentWalletId]);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (switchWalletTimeoutRef.current) {
        clearTimeout(switchWalletTimeoutRef.current);
      }
    };
  }, []);

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

        // Clear address-level and tx caches associated with this wallet
        try {
          console.log('🧹 Clearing cached blockchain data for deleted wallet');
          await clearCacheForWalletXpub(deletedWallet.xpub);
        } catch (e) {
          console.warn('Failed to clear cache for deleted wallet:', e);
        }
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
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('📋 Found AsyncStorage keys:', allKeys);

      await AsyncStorage.clear();

      setWallets([]);
      setCurrentWalletId(null);
      setTheme(lightTheme);
      setSelectedCurrency('USD');
      setHideBalance(false);
      setAutoLockTimeout(15);

      queryClient.clear();
      queryClient.resetQueries();
      queryClient.invalidateQueries();

      if (typeof global !== 'undefined') {
        if ((global as any).ecc) {
          delete (global as any).ecc;
        }

        if ((global as any).__cryptoInitialized) {
          (global as any).__cryptoInitialized = false;
        }

        if ((global as any).__walletState) {
          delete (global as any).__walletState;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error('❌ Error clearing wallet data:', err);
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

  const lastBalanceRef = useRef<number | null>(null);
  const lastTransactionsRef = useRef<Transaction[]>([]);
  useEffect(() => {
    if (balanceQuery.data !== undefined && balanceQuery.data !== null) {
      lastBalanceRef.current = balanceQuery.data;
    }
  }, [balanceQuery.data]);

  const lastAddressStatsRef = useRef<Map<string, { balance: number }>>(new Map());
  const setAddressStatsCache = useCallback((key: string, stats: { balance: number }) => {
    lastAddressStatsRef.current.set(key, stats);
  }, []);
  const getAddressStatsCacheValue = useCallback((key: string) => {
    return lastAddressStatsRef.current.get(key);
  }, []);

  const balanceData = useMemo(() => {
    const balance = balanceQuery.data ?? lastBalanceRef.current ?? 0;

    return {
      balance,
      balanceUSD: balance * (priceQuery.data?.usd || 0),
      bitcoinPrice: priceQuery.data,
      isLoadingBalance: balanceQuery.isLoading && lastBalanceRef.current === null,
      isRefreshingBalance: balanceQuery.isFetching && lastBalanceRef.current !== null,
      isLoadingPrice: priceQuery.isLoading,
      hasBalanceError: !!balanceQuery.error && lastBalanceRef.current === null,
      hasPriceError: !!priceQuery.error && !priceQuery.data,
      balanceError: balanceQuery.error,
      priceError: priceQuery.error,
    };
  }, [balanceQuery.data, balanceQuery.isLoading, balanceQuery.isFetching, balanceQuery.error, priceQuery.data, priceQuery.isLoading, priceQuery.error]);

  const stableTransactions = transactionsQuery.data ?? lastTransactionsRef.current;
  useEffect(() => {
    if (transactionsQuery.data) {
      lastTransactionsRef.current = transactionsQuery.data;
    }
  }, [transactionsQuery.data]);

  const transactionData = useMemo(() => ({
    transactions: stableTransactions,
    isLoadingTransactions: transactionsQuery.isLoading && lastTransactionsRef.current.length === 0,
    isRefreshingTransactions: transactionsQuery.isFetching && lastTransactionsRef.current.length > 0,
    hasTransactionsError: !!transactionsQuery.error && lastTransactionsRef.current.length === 0,
    transactionsError: transactionsQuery.error,
  }), [stableTransactions, transactionsQuery.isLoading, transactionsQuery.isFetching, transactionsQuery.error]);

  const settingsData = useMemo(() => ({
    theme,
    selectedCurrency,
    hideBalance,
    autoLockTimeout,
    feeSettings,
    feeSettingsLoading,
  }), [theme, selectedCurrency, hideBalance, autoLockTimeout, feeSettings, feeSettingsLoading]);

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
    getFrozenUtxoIds,
  }), [
    getSelectedUtxoIds,
    setCoinControlSelected,
    clearCoinControlSelected,
    toggleFreezeUtxo,
    isUtxoFrozen,
    filterSelectedUtxos,
    getFrozenUtxoIds,
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
    setAddressStatsCache,
    getAddressStatsCacheValue,
  }), [
    walletData,
    balanceData,
    transactionData,
    settingsData,
    actionsData,
    coinControlData,
    feedbackData,
    saveWalletsMutation.isPending,
    setAddressStatsCache,
    getAddressStatsCacheValue,
  ]);

  return walletStoreData;
});