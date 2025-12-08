/**
 * Transaction Cache Service
 * 
 * Smart caching for blockchain transactions:
 * - Confirmed transactions are cached permanently (they're immutable on the blockchain)
 * - Unconfirmed transactions are cached for 2 minutes (they can still change)
 * - Cache is persisted to AsyncStorage for persistence across app restarts
 * - Dramatically reduces API calls and improves performance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFIRMED_CACHE_KEY = 'tx_cache_confirmed';
const UNCONFIRMED_CACHE_KEY = 'tx_cache_unconfirmed';
const UNCONFIRMED_TTL = 120000; // 2 minutes for unconfirmed transactions

interface CachedTransaction {
  txid: string;
  data: any;
  confirmed: boolean;
  cachedAt: number;
  blockHeight?: number;
}

interface TransactionCache {
  confirmed: Map<string, CachedTransaction>;
  unconfirmed: Map<string, CachedTransaction>;
}

// In-memory cache for fast access
let cache: TransactionCache = {
  confirmed: new Map(),
  unconfirmed: new Map(),
};

// Track if cache has been loaded from storage
let cacheLoaded = false;
// Promise to track ongoing cache load operation
let cacheLoadPromise: Promise<void> | null = null;

/**
 * Load cache from AsyncStorage on app start
 * Prevents race conditions by ensuring only one load operation runs at a time
 */
export async function loadTransactionCache(): Promise<void> {
  // If cache is already loaded, return immediately
  if (cacheLoaded) {
    return;
  }

  // If a load is already in progress, wait for it to complete
  if (cacheLoadPromise) {
    return cacheLoadPromise;
  }

  // Set the flag immediately to prevent other calls from starting a load
  cacheLoadPromise = (async () => {
    try {
      console.log('📦 Loading transaction cache from storage...');
      
      // Load confirmed transactions
      const confirmedData = await AsyncStorage.getItem(CONFIRMED_CACHE_KEY);
      if (confirmedData) {
        const confirmedArray = JSON.parse(confirmedData) as CachedTransaction[];
        cache.confirmed = new Map(confirmedArray.map(tx => [tx.txid, tx]));
        console.log(`✅ Loaded ${cache.confirmed.size} confirmed transactions from cache`);
      }
      
      // Load unconfirmed transactions
      const unconfirmedData = await AsyncStorage.getItem(UNCONFIRMED_CACHE_KEY);
      if (unconfirmedData) {
        const unconfirmedArray = JSON.parse(unconfirmedData) as CachedTransaction[];
        const now = Date.now();
        
        // Filter out expired unconfirmed transactions
        const validUnconfirmed = unconfirmedArray.filter(tx => {
          const age = now - tx.cachedAt;
          return age < UNCONFIRMED_TTL;
        });
        
        cache.unconfirmed = new Map(validUnconfirmed.map(tx => [tx.txid, tx]));
        console.log(`✅ Loaded ${cache.unconfirmed.size} unconfirmed transactions from cache (${unconfirmedArray.length - validUnconfirmed.length} expired)`);
      }
      
      cacheLoaded = true;
      console.log(`✅ Transaction cache loaded: ${cache.confirmed.size} confirmed, ${cache.unconfirmed.size} unconfirmed`);
    } catch (error) {
      console.error('❌ Failed to load transaction cache:', error);
      // Continue with empty cache
      cache = {
        confirmed: new Map(),
        unconfirmed: new Map(),
      };
      cacheLoaded = true;
    } finally {
      // Clear the promise reference once loading is complete
      cacheLoadPromise = null;
    }
  })();

  return cacheLoadPromise;
}

/**
 * Save cache to AsyncStorage
 */
async function saveTransactionCache(): Promise<void> {
  try {
    // Save confirmed transactions
    const confirmedArray = Array.from(cache.confirmed.values());
    await AsyncStorage.setItem(CONFIRMED_CACHE_KEY, JSON.stringify(confirmedArray));
    
    // Save unconfirmed transactions
    const unconfirmedArray = Array.from(cache.unconfirmed.values());
    await AsyncStorage.setItem(UNCONFIRMED_CACHE_KEY, JSON.stringify(unconfirmedArray));
    
    console.log(`💾 Saved transaction cache: ${confirmedArray.length} confirmed, ${unconfirmedArray.length} unconfirmed`);
  } catch (error) {
    console.error('❌ Failed to save transaction cache:', error);
  }
}

/**
 * Get a cached transaction by txid
 * Returns null if not in cache or if unconfirmed transaction is expired
 */
export function getCachedTransaction(txid: string): any | null {
  // Check confirmed cache first (permanent)
  const confirmedTx = cache.confirmed.get(txid);
  if (confirmedTx) {
    console.log(`📦 Cache HIT (confirmed): ${txid.substring(0, 8)}...`);
    return confirmedTx.data;
  }
  
  // Check unconfirmed cache (with TTL)
  const unconfirmedTx = cache.unconfirmed.get(txid);
  if (unconfirmedTx) {
    const age = Date.now() - unconfirmedTx.cachedAt;
    if (age < UNCONFIRMED_TTL) {
      console.log(`📦 Cache HIT (unconfirmed): ${txid.substring(0, 8)}... (age: ${Math.round(age / 1000)}s)`);
      return unconfirmedTx.data;
    } else {
      // Expired, remove from cache
      console.log(`⏰ Cache EXPIRED (unconfirmed): ${txid.substring(0, 8)}...`);
      cache.unconfirmed.delete(txid);
    }
  }
  
  console.log(`📦 Cache MISS: ${txid.substring(0, 8)}...`);
  return null;
}

/**
 * Cache a transaction
 * Automatically determines if it's confirmed or unconfirmed based on the data
 */
export async function cacheTransaction(txid: string, data: any): Promise<void> {
  // A transaction is confirmed if it has a block_height (included in a block)
  // or if status.confirmed is explicitly true
  const blockHeight = data.status?.block_height;
  const isConfirmed = (data.status?.confirmed === true) || (blockHeight !== undefined && blockHeight !== null);
  
  const cachedTx: CachedTransaction = {
    txid,
    data,
    confirmed: isConfirmed,
    cachedAt: Date.now(),
    blockHeight,
  };
  
  if (isConfirmed) {
    // Confirmed transactions are cached permanently
    cache.confirmed.set(txid, cachedTx);
    console.log(`💾 Cached CONFIRMED transaction: ${txid.substring(0, 8)}... (block: ${blockHeight})`);
    
    // Remove from unconfirmed cache if it was there
    if (cache.unconfirmed.has(txid)) {
      cache.unconfirmed.delete(txid);
      console.log(`🔄 Moved transaction from unconfirmed to confirmed cache: ${txid.substring(0, 8)}...`);
    }
  } else {
    // Unconfirmed transactions are cached with TTL
    cache.unconfirmed.set(txid, cachedTx);
    console.log(`💾 Cached UNCONFIRMED transaction: ${txid.substring(0, 8)}... (TTL: ${UNCONFIRMED_TTL / 1000}s)`);
  }
  
  // Save to storage and await completion to ensure persistence
  await saveTransactionCache();
}

/**
 * Cache multiple transactions at once
 */
export async function cacheTransactions(transactions: any[]): Promise<void> {
  const now = Date.now();
  let confirmedCount = 0;
  let unconfirmedCount = 0;
  
  for (const tx of transactions) {
    const txid = tx.txid;
    // A transaction is confirmed if it has a block_height (included in a block)
    // or if status.confirmed is explicitly true
    const blockHeight = tx.status?.block_height;
    const isConfirmed = (tx.status?.confirmed === true) || (blockHeight !== undefined && blockHeight !== null);
    
    const cachedTx: CachedTransaction = {
      txid,
      data: tx,
      confirmed: isConfirmed,
      cachedAt: now,
      blockHeight,
    };
    
    if (isConfirmed) {
      // Only cache if not already cached (avoid unnecessary updates)
      if (!cache.confirmed.has(txid)) {
        cache.confirmed.set(txid, cachedTx);
        confirmedCount++;
      }
      
      // Remove from unconfirmed cache if it was there
      if (cache.unconfirmed.has(txid)) {
        cache.unconfirmed.delete(txid);
      }
    } else {
      cache.unconfirmed.set(txid, cachedTx);
      unconfirmedCount++;
    }
  }
  
  if (confirmedCount > 0 || unconfirmedCount > 0) {
    console.log(`💾 Cached ${confirmedCount} confirmed and ${unconfirmedCount} unconfirmed transactions`);
    
    // Save to storage and await completion to ensure persistence
    await saveTransactionCache();
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  confirmedCount: number;
  unconfirmedCount: number;
  totalCount: number;
  oldestConfirmed?: number;
  newestConfirmed?: number;
} {
  const confirmedTxs = Array.from(cache.confirmed.values());
  
  let oldestConfirmed: number | undefined;
  let newestConfirmed: number | undefined;
  
  if (confirmedTxs.length > 0) {
    const blockHeights = confirmedTxs
      .filter(tx => tx.blockHeight !== undefined)
      .map(tx => tx.blockHeight!);
    
    if (blockHeights.length > 0) {
      oldestConfirmed = Math.min(...blockHeights);
      newestConfirmed = Math.max(...blockHeights);
    }
  }
  
  return {
    confirmedCount: cache.confirmed.size,
    unconfirmedCount: cache.unconfirmed.size,
    totalCount: cache.confirmed.size + cache.unconfirmed.size,
    oldestConfirmed,
    newestConfirmed,
  };
}

/**
 * Clear all unconfirmed transactions from cache
 * Useful when you want to force a refresh of pending transactions
 */
export async function clearUnconfirmedCache(): Promise<void> {
  console.log(`🗑️ Clearing ${cache.unconfirmed.size} unconfirmed transactions from cache`);
  cache.unconfirmed.clear();
  await saveTransactionCache();
}

/**
 * Clear entire cache (use with caution)
 */
export async function clearAllCache(): Promise<void> {
  console.log(`🗑️ Clearing entire transaction cache (${cache.confirmed.size} confirmed, ${cache.unconfirmed.size} unconfirmed)`);
  cache.confirmed.clear();
  cache.unconfirmed.clear();
  await AsyncStorage.removeItem(CONFIRMED_CACHE_KEY);
  await AsyncStorage.removeItem(UNCONFIRMED_CACHE_KEY);
  console.log('✅ Transaction cache cleared');
}

/**
 * Check if a transaction is in the confirmed cache
 */
export function isTransactionCached(txid: string): boolean {
  return cache.confirmed.has(txid) || cache.unconfirmed.has(txid);
}

/**
 * Get all cached transaction IDs for a specific address
 * This is useful for filtering out already-cached transactions when fetching
 */
export function getCachedTransactionIds(): Set<string> {
  const allTxids = new Set<string>();
  
  // Add confirmed transaction IDs
  for (const txid of cache.confirmed.keys()) {
    allTxids.add(txid);
  }
  
  // Add valid unconfirmed transaction IDs
  const now = Date.now();
  for (const [txid, tx] of cache.unconfirmed.entries()) {
    const age = now - tx.cachedAt;
    if (age < UNCONFIRMED_TTL) {
      allTxids.add(txid);
    }
  }
  
  return allTxids;
}

/**
 * Get all cached transactions (both confirmed and valid unconfirmed)
 * Returns an array of transaction data
 */
export function getAllCachedTransactions(): any[] {
  const allTxs: any[] = [];
  
  // Add all confirmed transactions
  for (const tx of cache.confirmed.values()) {
    allTxs.push(tx.data);
  }
  
  // Add valid unconfirmed transactions
  const now = Date.now();
  for (const tx of cache.unconfirmed.values()) {
    const age = now - tx.cachedAt;
    if (age < UNCONFIRMED_TTL) {
      allTxs.push(tx.data);
    }
  }
  
  return allTxs;
}

/**
 * Prune expired unconfirmed transactions from cache
 * This is called periodically to keep the cache clean
 */
export async function pruneExpiredTransactions(): Promise<number> {
  const now = Date.now();
  let prunedCount = 0;
  
  for (const [txid, tx] of cache.unconfirmed.entries()) {
    const age = now - tx.cachedAt;
    if (age >= UNCONFIRMED_TTL) {
      cache.unconfirmed.delete(txid);
      prunedCount++;
    }
  }
  
  if (prunedCount > 0) {
    console.log(`🗑️ Pruned ${prunedCount} expired unconfirmed transactions from cache`);
    await saveTransactionCache();
  }
  
  return prunedCount;
}

/**
 * Remove specific transactions from cache by txid
 * Used when deleting a wallet to free cache space associated with it
 */
export async function removeTransactionsByIds(txids: string[]): Promise<void> {
  try {
    if (!Array.isArray(txids) || txids.length === 0) return;

    let removedConfirmed = 0;
    let removedUnconfirmed = 0;

    for (const txid of txids) {
      if (cache.confirmed.delete(txid)) {
        removedConfirmed++;
      }
      if (cache.unconfirmed.delete(txid)) {
        removedUnconfirmed++;
      }
    }

    if (removedConfirmed > 0 || removedUnconfirmed > 0) {
      await saveTransactionCache();
      console.log(
        `🗑️ Removed ${removedConfirmed} confirmed and ${removedUnconfirmed} unconfirmed transactions from cache`
      );
    }
  } catch (error) {
    console.warn('Failed to remove transactions from cache:', error);
  }
}

