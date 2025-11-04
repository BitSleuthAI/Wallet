/**
 * Wallet Persistence Service
 * 
 * Persists wallet data (balance, transactions, UTXOs) to AsyncStorage for offline availability.
 * This ensures users never see blank data after it's been loaded once.
 * 
 * Key Principles:
 * - Confirmed transactions are immutable blockchain data - cache permanently
 * - Unconfirmed transactions can change - always refresh from network
 * - Balance and UTXOs derived from blockchain - update on each fetch
 * - Use "stale-while-revalidate" pattern - show cached, fetch fresh in background
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction, UTXO } from '@/types/wallet';

// Storage keys
const WALLET_DATA_PREFIX = 'wallet_data_';
const WALLET_BALANCE_PREFIX = 'wallet_balance_';
const WALLET_TRANSACTIONS_PREFIX = 'wallet_transactions_';
const WALLET_UTXOS_PREFIX = 'wallet_utxos_';

interface PersistedWalletData {
  walletId: string;
  xpub: string;
  balance: number;
  transactions: Transaction[];
  utxos: UTXO[];
  lastUpdated: number;
  version: string; // For future data migration
}

/**
 * Get the full persisted wallet data for a wallet
 */
export async function getPersistedWalletData(walletId: string): Promise<PersistedWalletData | null> {
  try {
    const key = `${WALLET_DATA_PREFIX}${walletId}`;
    const data = await AsyncStorage.getItem(key);
    
    if (!data) {
      console.log(`📦 No persisted data found for wallet: ${walletId}`);
      return null;
    }
    
    const parsed = JSON.parse(data) as PersistedWalletData;
    const age = Date.now() - parsed.lastUpdated;
    console.log(`📦 Loaded persisted data for wallet: ${walletId} (age: ${Math.round(age / 1000)}s, ${parsed.transactions.length} txs, ${parsed.balance} BTC)`);
    
    return parsed;
  } catch (error) {
    console.error(`❌ Failed to load persisted wallet data for ${walletId}:`, error);
    return null;
  }
}

/**
 * Get only the persisted balance for a wallet
 */
export async function getPersistedBalance(walletId: string): Promise<number | null> {
  try {
    const key = `${WALLET_BALANCE_PREFIX}${walletId}`;
    const data = await AsyncStorage.getItem(key);
    
    if (!data) {
      return null;
    }
    
    const parsed = JSON.parse(data);
    const balance = parsed.balance;
    const age = Date.now() - parsed.lastUpdated;
    console.log(`📦 Loaded persisted balance for wallet: ${walletId} (${balance} BTC, age: ${Math.round(age / 1000)}s)`);
    
    return balance;
  } catch (error) {
    console.error(`❌ Failed to load persisted balance for ${walletId}:`, error);
    return null;
  }
}

/**
 * Get only the persisted transactions for a wallet
 */
export async function getPersistedTransactions(walletId: string): Promise<Transaction[] | null> {
  try {
    const key = `${WALLET_TRANSACTIONS_PREFIX}${walletId}`;
    const data = await AsyncStorage.getItem(key);
    
    if (!data) {
      return null;
    }
    
    const parsed = JSON.parse(data);
    const transactions = parsed.transactions as Transaction[];
    const age = Date.now() - parsed.lastUpdated;
    console.log(`📦 Loaded persisted transactions for wallet: ${walletId} (${transactions.length} txs, age: ${Math.round(age / 1000)}s)`);
    
    return transactions;
  } catch (error) {
    console.error(`❌ Failed to load persisted transactions for ${walletId}:`, error);
    return null;
  }
}

/**
 * Get only the persisted UTXOs for a wallet
 */
export async function getPersistedUTXOs(walletId: string): Promise<UTXO[] | null> {
  try {
    const key = `${WALLET_UTXOS_PREFIX}${walletId}`;
    const data = await AsyncStorage.getItem(key);
    
    if (!data) {
      return null;
    }
    
    const parsed = JSON.parse(data);
    const utxos = parsed.utxos as UTXO[];
    const age = Date.now() - parsed.lastUpdated;
    console.log(`📦 Loaded persisted UTXOs for wallet: ${walletId} (${utxos.length} UTXOs, age: ${Math.round(age / 1000)}s)`);
    
    return utxos;
  } catch (error) {
    console.error(`❌ Failed to load persisted UTXOs for ${walletId}:`, error);
    return null;
  }
}

/**
 * Persist all wallet data (balance, transactions, UTXOs)
 * This is called after successfully fetching fresh data from the blockchain
 */
export async function persistWalletData(
  walletId: string,
  xpub: string,
  balance: number,
  transactions: Transaction[],
  utxos: UTXO[]
): Promise<void> {
  try {
    const now = Date.now();
    const version = '1.0.0'; // For future data migration
    
    // Persist full wallet data bundle
    const walletData: PersistedWalletData = {
      walletId,
      xpub,
      balance,
      transactions,
      utxos,
      lastUpdated: now,
      version,
    };
    
    // Store the full data
    const fullDataKey = `${WALLET_DATA_PREFIX}${walletId}`;
    await AsyncStorage.setItem(fullDataKey, JSON.stringify(walletData));
    
    // Also store individual pieces for faster partial access
    const balanceKey = `${WALLET_BALANCE_PREFIX}${walletId}`;
    await AsyncStorage.setItem(balanceKey, JSON.stringify({ balance, lastUpdated: now }));
    
    const transactionsKey = `${WALLET_TRANSACTIONS_PREFIX}${walletId}`;
    await AsyncStorage.setItem(transactionsKey, JSON.stringify({ transactions, lastUpdated: now }));
    
    const utxosKey = `${WALLET_UTXOS_PREFIX}${walletId}`;
    await AsyncStorage.setItem(utxosKey, JSON.stringify({ utxos, lastUpdated: now }));
    
    console.log(`💾 Persisted wallet data for ${walletId}: ${balance} BTC, ${transactions.length} txs, ${utxos.length} UTXOs`);
  } catch (error) {
    console.error(`❌ Failed to persist wallet data for ${walletId}:`, error);
    // Don't throw - persistence failure shouldn't break the app
  }
}

/**
 * Persist only the balance (for quick updates)
 */
export async function persistBalance(walletId: string, balance: number): Promise<void> {
  try {
    const key = `${WALLET_BALANCE_PREFIX}${walletId}`;
    await AsyncStorage.setItem(key, JSON.stringify({ balance, lastUpdated: Date.now() }));
    console.log(`💾 Persisted balance for ${walletId}: ${balance} BTC`);
  } catch (error) {
    console.error(`❌ Failed to persist balance for ${walletId}:`, error);
  }
}

/**
 * Persist only the transactions (for quick updates)
 */
export async function persistTransactions(walletId: string, transactions: Transaction[]): Promise<void> {
  try {
    const key = `${WALLET_TRANSACTIONS_PREFIX}${walletId}`;
    await AsyncStorage.setItem(key, JSON.stringify({ transactions, lastUpdated: Date.now() }));
    console.log(`💾 Persisted ${transactions.length} transactions for ${walletId}`);
  } catch (error) {
    console.error(`❌ Failed to persist transactions for ${walletId}:`, error);
  }
}

/**
 * Persist only the UTXOs (for quick updates)
 */
export async function persistUTXOs(walletId: string, utxos: UTXO[]): Promise<void> {
  try {
    const key = `${WALLET_UTXOS_PREFIX}${walletId}`;
    await AsyncStorage.setItem(key, JSON.stringify({ utxos, lastUpdated: Date.now() }));
    console.log(`💾 Persisted ${utxos.length} UTXOs for ${walletId}`);
  } catch (error) {
    console.error(`❌ Failed to persist UTXOs for ${walletId}:`, error);
  }
}

/**
 * Clear all persisted data for a wallet
 * Called when wallet is deleted
 */
export async function clearPersistedWalletData(walletId: string): Promise<void> {
  try {
    const keys = [
      `${WALLET_DATA_PREFIX}${walletId}`,
      `${WALLET_BALANCE_PREFIX}${walletId}`,
      `${WALLET_TRANSACTIONS_PREFIX}${walletId}`,
      `${WALLET_UTXOS_PREFIX}${walletId}`,
    ];
    
    await AsyncStorage.multiRemove(keys);
    console.log(`🗑️ Cleared persisted data for wallet: ${walletId}`);
  } catch (error) {
    console.error(`❌ Failed to clear persisted data for ${walletId}:`, error);
  }
}

/**
 * Clear all persisted wallet data for all wallets
 * Called on logout or app data reset
 */
export async function clearAllPersistedWalletData(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const walletDataKeys = allKeys.filter(key => 
      key.startsWith(WALLET_DATA_PREFIX) ||
      key.startsWith(WALLET_BALANCE_PREFIX) ||
      key.startsWith(WALLET_TRANSACTIONS_PREFIX) ||
      key.startsWith(WALLET_UTXOS_PREFIX)
    );
    
    if (walletDataKeys.length > 0) {
      await AsyncStorage.multiRemove(walletDataKeys);
      console.log(`🗑️ Cleared all persisted wallet data (${walletDataKeys.length} keys)`);
    }
  } catch (error) {
    console.error('❌ Failed to clear all persisted wallet data:', error);
  }
}

/**
 * Get the age of persisted data for a wallet
 * Returns null if no persisted data exists
 */
export async function getPersistedDataAge(walletId: string): Promise<number | null> {
  try {
    const data = await getPersistedWalletData(walletId);
    if (!data) {
      return null;
    }
    
    return Date.now() - data.lastUpdated;
  } catch (error) {
    console.error(`❌ Failed to get persisted data age for ${walletId}:`, error);
    return null;
  }
}

/**
 * Check if wallet has persisted data available
 */
export async function hasPersistedData(walletId: string): Promise<boolean> {
  try {
    const key = `${WALLET_DATA_PREFIX}${walletId}`;
    const data = await AsyncStorage.getItem(key);
    return data !== null;
  } catch (error) {
    console.error(`❌ Failed to check persisted data for ${walletId}:`, error);
    return false;
  }
}
