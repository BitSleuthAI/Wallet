/**
 * Address Cache Service
 *
 * Persistent, wallet-scoped caching for address-level blockchain data to reduce
 * calls to public Esplora providers (Blockstream/mempool.space).
 *
 * Responsibilities:
 * - Cache and retrieve per-address txid lists (tx bodies are cached separately)
 * - Cache and retrieve per-address stats and UTXOs
 * - Track wallet (by xpub) -> addresses and txids associations
 * - Clear all cached data for a wallet when the wallet is deleted
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheTransactions, getCachedTransaction } from './transaction-cache-service';

const KEY_PREFIX = 'addr_cache_';
const KEY_TXIDS = (address: string) => `${KEY_PREFIX}txids_${address}`;
const KEY_STATS = (address: string) => `${KEY_PREFIX}stats_${address}`;
const KEY_UTXOS = (address: string) => `${KEY_PREFIX}utxos_${address}`;

const KEY_WALLET_ADDRS = (xpub: string) => `${KEY_PREFIX}wallet_addrs_${xpub}`;
const KEY_WALLET_TXIDS = (xpub: string) => `${KEY_PREFIX}wallet_txids_${xpub}`;
const KEY_ADDR_WALLET = (address: string) => `${KEY_PREFIX}addr_wallet_${address}`;

const TXIDS_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const STATS_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const UTXOS_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

type PersistedEntry<T> = {
  data: T;
  timestamp?: number;
};

function hydrateCacheEntry<T>(raw: string | null, ttlMs: number): { data: T | null; expired: boolean } {
  if (!raw) {
    return { data: null, expired: false };
  }

  try {
    const parsed = JSON.parse(raw) as PersistedEntry<T> | T;

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'data' in parsed) {
      const entry = parsed as PersistedEntry<T>;
      if (typeof entry.timestamp === 'number' && ttlMs > 0) {
        const age = Date.now() - entry.timestamp;
        if (age > ttlMs) {
          return { data: null, expired: true };
        }
      }
      return { data: entry.data, expired: false };
    }

    return { data: parsed as T, expired: false };
  } catch (error) {
    console.warn('Failed to hydrate cached entry:', error);
    return { data: null, expired: false };
  }
}

export async function getCachedAddressTxIds(address: string): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TXIDS(address));
    const { data } = hydrateCacheEntry<string[]>(raw, TXIDS_TTL_MS);
    if (!data) return null; // Not cached yet or expired
    return Array.isArray(data) ? data : null;
  } catch (error) {
    console.warn('Failed to read cached address txids:', error);
    return null;
  }
}

export async function setCachedAddressTxIds(address: string, txids: string[], xpubHint?: string): Promise<void> {
  try {
    const uniqueTxids = unique(txids);
    const entry: PersistedEntry<string[]> = {
      data: uniqueTxids,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(KEY_TXIDS(address), JSON.stringify(entry));
    if (xpubHint) {
      await AsyncStorage.setItem(KEY_ADDR_WALLET(address), xpubHint);
      // Also add address to wallet's address list
      const existing = await getWalletAddresses(xpubHint);
      const merged = unique([...(existing || []), address]);
      await AsyncStorage.setItem(KEY_WALLET_ADDRS(xpubHint), JSON.stringify(merged));
      // Track wallet txids set as well (append-only)
      const existingTxids = await getWalletTxIds(xpubHint);
      const mergedTxids = unique([...(existingTxids || []), ...uniqueTxids]);
      const walletEntry: PersistedEntry<string[]> = {
        data: mergedTxids,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(KEY_WALLET_TXIDS(xpubHint), JSON.stringify(walletEntry));
    }
  } catch (error) {
    console.warn('Failed to write cached address txids:', error);
  }
}

export async function getCachedAddressStats(address: string): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_STATS(address));
    const { data, expired } = hydrateCacheEntry<any>(raw, STATS_TTL_MS);
    if (expired) {
      await AsyncStorage.removeItem(KEY_STATS(address));
      return null;
    }
    return data ?? null;
  } catch (error) {
    console.warn('Failed to read cached address stats:', error);
    return null;
  }
}

export async function setCachedAddressStats(address: string, stats: any, xpubHint?: string): Promise<void> {
  try {
    const entry: PersistedEntry<any> = {
      data: stats,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(KEY_STATS(address), JSON.stringify(entry));
    if (xpubHint) {
      await AsyncStorage.setItem(KEY_ADDR_WALLET(address), xpubHint);
      const existing = await getWalletAddresses(xpubHint);
      const merged = unique([...(existing || []), address]);
      await AsyncStorage.setItem(KEY_WALLET_ADDRS(xpubHint), JSON.stringify(merged));
    }
  } catch (error) {
    console.warn('Failed to write cached address stats:', error);
  }
}

export async function getCachedAddressUTXOs(address: string): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_UTXOS(address));
    const { data, expired } = hydrateCacheEntry<any[]>(raw, UTXOS_TTL_MS);
    if (expired) {
      await AsyncStorage.removeItem(KEY_UTXOS(address));
      return null;
    }
    return Array.isArray(data) ? data : null;
  } catch (error) {
    console.warn('Failed to read cached address UTXOs:', error);
    return null;
  }
}

export async function setCachedAddressUTXOs(address: string, utxos: any[], xpubHint?: string): Promise<void> {
  try {
    /*
     * Don't cache empty UTXO results.
     * Rationale: An empty UTXO array may be caused by temporary network issues or provider downtime,
     * so caching it could result in missing funds being shown to the user until the cache expires.
     * By not caching empty results, we ensure that the next fetch will attempt to get fresh data.
     */
    if (!utxos || utxos.length === 0) {
      console.log(`🚫 Not caching empty UTXO result for ${address.substring(0, 10)}...`);
      return;
    }
    
    const entry: PersistedEntry<any[]> = {
      data: utxos,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(KEY_UTXOS(address), JSON.stringify(entry));
    console.log(`💾 Cached ${utxos.length} UTXOs for ${address.substring(0, 10)}...`);
    
    if (xpubHint) {
      await AsyncStorage.setItem(KEY_ADDR_WALLET(address), xpubHint);
      const existing = await getWalletAddresses(xpubHint);
      const merged = unique([...(existing || []), address]);
      await AsyncStorage.setItem(KEY_WALLET_ADDRS(xpubHint), JSON.stringify(merged));
    }
  } catch (error) {
    console.warn('Failed to write cached address UTXOs:', error);
  }
}

export async function getWalletAddresses(xpub: string): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_WALLET_ADDRS(xpub));
    const addresses = raw ? JSON.parse(raw) : null;
    return Array.isArray(addresses) ? addresses : null;
  } catch (error) {
    console.warn('Failed to read wallet addresses cache:', error);
    return null;
  }
}

export async function getWalletTxIds(xpub: string): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_WALLET_TXIDS(xpub));
    const { data } = hydrateCacheEntry<string[]>(raw, TXIDS_TTL_MS);
    return Array.isArray(data) ? data : null;
  } catch (error) {
    console.warn('Failed to read wallet txids cache:', error);
    return null;
  }
}

export async function recordWalletAssociationsXpub(xpub: string, addresses: string[], txids: string[]): Promise<void> {
  try {
    // Addresses
    const existingAddrs = await getWalletAddresses(xpub);
    const mergedAddrs = unique([...(existingAddrs || []), ...addresses]);
    await AsyncStorage.setItem(KEY_WALLET_ADDRS(xpub), JSON.stringify(mergedAddrs));
    for (const addr of addresses) {
      await AsyncStorage.setItem(KEY_ADDR_WALLET(addr), xpub);
    }

    // Txids
    const existingTxids = await getWalletTxIds(xpub);
    const mergedTxids = unique([...(existingTxids || []), ...txids]);
    const entry: PersistedEntry<string[]> = {
      data: mergedTxids,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(KEY_WALLET_TXIDS(xpub), JSON.stringify(entry));
  } catch (error) {
    console.warn('Failed to record wallet associations:', error);
  }
}

export async function getCachedAddressTransactions(address: string): Promise<any[] | null> {
  const txids = await getCachedAddressTxIds(address);
  if (!txids) return null; // Not cached yet
  const results: any[] = [];
  for (const txid of txids) {
    const tx = getCachedTransaction(txid);
    if (tx) {
      results.push(tx);
    } else {
      // If any transaction is missing/expired, return null to indicate incomplete cache
      // This allows esploraGet to fetch fresh data and merge properly
      return null;
    }
  }
  return results;
}

export async function setCachedAddressTransactions(address: string, txs: any[], xpubHint?: string): Promise<void> {
  try {
    // Ensure tx bodies are cached (confirmed stored permanently by tx-cache service)
    await cacheTransactions(txs);
    const txids = txs.map((t: any) => t.txid).filter(Boolean);
    await setCachedAddressTxIds(address, txids, xpubHint);
  } catch (error) {
    console.warn('Failed to cache address transactions:', error);
  }
}

export async function clearEmptyUTXOCaches(): Promise<void> {
  try {
    console.log('🧹 Clearing empty UTXO caches...');
    const allKeys = await AsyncStorage.getAllKeys();
    const utxoKeys = allKeys.filter(key => key.startsWith(KEY_PREFIX + 'utxos_'));
    
    let clearedCount = 0;
    for (const key of utxoKeys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const data = parsed.data || parsed;
          if (Array.isArray(data) && data.length === 0) {
            await AsyncStorage.removeItem(key);
            clearedCount++;
            console.log(`🗑️ Cleared empty UTXO cache: ${key}`);
          }
        }
      } catch (e) {
        console.warn(`Failed to check UTXO cache ${key}:`, e);
      }
    }
    console.log(`✅ Cleared ${clearedCount} empty UTXO caches`);
  } catch (error) {
    console.warn('Failed to clear empty UTXO caches:', error);
  }
}

export async function clearCacheForWalletXpub(xpub: string): Promise<void> {
  try {
    const addresses = (await getWalletAddresses(xpub)) || [];
    const txids = (await getWalletTxIds(xpub)) || [];

    // Remove per-address caches
    for (const addr of addresses) {
      await AsyncStorage.removeItem(KEY_TXIDS(addr));
      await AsyncStorage.removeItem(KEY_STATS(addr));
      await AsyncStorage.removeItem(KEY_UTXOS(addr));
      await AsyncStorage.removeItem(KEY_ADDR_WALLET(addr));
    }

    // Remove wallet association lists
    await AsyncStorage.removeItem(KEY_WALLET_ADDRS(xpub));
    await AsyncStorage.removeItem(KEY_WALLET_TXIDS(xpub));

    // Optionally, remove transaction bodies that were only associated with this wallet.
    // For simplicity, remove all associated txids. If other wallets reference them,
    // they will be re-cached on next fetch.
    try {
      const { removeTransactionsByIds } = require('./transaction-cache-service');
      await removeTransactionsByIds(txids);
    } catch (e) {
      console.warn('Failed to remove wallet transactions from cache:', e);
    }
  } catch (error) {
    console.warn('Failed to clear cache for wallet:', error);
  }
}
