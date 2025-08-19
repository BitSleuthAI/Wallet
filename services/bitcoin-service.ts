import { BitcoinPrice, Transaction, UTXO } from '@/types/wallet';
import { Platform } from 'react-native';

// Don't initialize ECC at module load time - do it lazily when needed
let eccInitialized = false;

const ensureECC = () => {
  if (eccInitialized) return;
  
  try {
    const { initializeCrypto } = require('./crypto-polyfill');
    initializeCrypto();
    
    const ecc = (global as any).ecc;
    if (!ecc) {
      console.warn('⚠️ ECC library not available, some features may not work');
      return;
    }
    
    const bitcoin = require('bitcoinjs-lib');
    if (typeof bitcoin.initEccLib === 'function') {
      bitcoin.initEccLib(ecc);
      console.log('✅ ECC library initialized for bitcoin service');
    }
    
    eccInitialized = true;
  } catch (error) {
    console.warn('⚠️ Failed to initialize ECC for bitcoin service:', error);
  }
};

const BLOCKSTREAM_API = 'https://blockstream.info/api';
const MEMPOOL_API = 'https://mempool.space/api';

const API_BASE = Platform.select({
  web: MEMPOOL_API,
  default: BLOCKSTREAM_API,
});

async function fetchJSON(input: string, init?: RequestInit & { timeoutMs?: number }) {
  const { timeoutMs = 15000, ...rest } = init ?? {};
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(rest?.headers ?? {}),
      },
      ...(Platform.OS === 'web' ? { mode: 'cors' as const } : {}),
      ...rest,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    // Handle network errors more gracefully
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error - please check your connection');
      }
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
// Multiple price API endpoints for redundancy
const PRICE_APIS = [
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
    parser: (data: any) => ({
      usd: data.bitcoin?.usd || 0,
      usd_24h_change: data.bitcoin?.usd_24h_change || 0,
    })
  },
  {
    name: 'CoinDesk',
    url: 'https://api.coindesk.com/v1/bpi/currentprice.json',
    parser: (data: any) => ({
      usd: parseFloat(data.bpi?.USD?.rate?.replace(/,/g, '') || '0'),
      usd_24h_change: 0, // CoinDesk doesn't provide 24h change
    })
  },
  {
    name: 'Blockchain.info',
    url: 'https://blockchain.info/ticker',
    parser: (data: any) => ({
      usd: data.USD?.last || 0,
      usd_24h_change: 0, // Blockchain.info doesn't provide 24h change in this endpoint
    })
  }
];

export const getBitcoinPrice = async (): Promise<BitcoinPrice> => {
  // Try each API endpoint in sequence
  for (const api of PRICE_APIS) {
    try {
      console.log(`Fetching Bitcoin price from ${api.name}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(api.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        ...(Platform.OS === 'web' ? { mode: 'cors' as const } : {}),
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const priceData = api.parser(data);
      
      if (!priceData.usd || priceData.usd <= 0) {
        throw new Error(`Invalid price data from ${api.name}`);
      }
      
      console.log(`✅ Bitcoin price fetched successfully from ${api.name}:`, priceData.usd);
      return priceData;
    } catch (error) {
      console.warn(`Failed to fetch from ${api.name}:`, error);
      // Continue to next API
    }
  }
  
  // If all APIs fail, throw an error instead of returning demo data
  console.error('All price APIs failed, unable to fetch Bitcoin price');
  throw new Error('Unable to fetch Bitcoin price - all APIs failed');
};

export const getAddressBalance = async (address: string): Promise<number> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  try {
    console.log('Fetching balance for address:', address);
    const data = await fetchJSON(`${API_BASE}/address/${address}`, {
      timeoutMs: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!data.chain_stats || typeof data.chain_stats.funded_txo_sum !== 'number') {
      throw new Error('Invalid response format from API');
    }
    
    // Convert from satoshis to BTC
    const balance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
    console.log('✅ Address balance fetched:', balance, 'BTC');
    return balance;
  } catch (error) {
    console.error('Error fetching address balance:', error);
    throw error;
  }
};

export const getWalletBalance = async (addresses: string[]): Promise<number> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  try {
    const balancePromises = addresses.map(address => getAddressBalance(address));
    const balances = await Promise.all(balancePromises);
    const totalBalance = balances.reduce((total, balance) => total + balance, 0);
    console.log('✅ Wallet balance calculated:', totalBalance, 'BTC');
    return totalBalance;
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    throw error;
  }
};

export const getAddressTransactions = async (address: string): Promise<any[]> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  try {
    console.log('Fetching transactions for address:', address);
    const data = await fetchJSON(`${API_BASE}/address/${address}/txs`, {
      timeoutMs: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from API');
    }
    
    console.log('✅ Address transactions fetched:', data.length, 'transactions');
    return data;
  } catch (error) {
    console.error('Error fetching address transactions:', error);
    throw error;
  }
};

export const getTransactionHistory = async (addresses: string[]): Promise<Transaction[]> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  try {
    const transactionPromises = addresses.map(address => getAddressTransactions(address));
    const addressTransactions = await Promise.all(transactionPromises);
    
    const allTransactions = addressTransactions.flat();
    const uniqueTransactions = new Map();
    
    // Remove duplicates and process transactions
    allTransactions.forEach(tx => {
      if (!uniqueTransactions.has(tx.txid)) {
        const isReceived = tx.vout.some((output: any) => 
          addresses.includes(output.scriptpubkey_address)
        );
        
        const amount = isReceived 
          ? tx.vout.reduce((sum: number, output: any) => 
              addresses.includes(output.scriptpubkey_address) ? sum + output.value : sum, 0) / 100000000
          : tx.vin.reduce((sum: number, input: any) => 
              addresses.includes(input.prevout?.scriptpubkey_address) ? sum + input.prevout.value : sum, 0) / 100000000;
        
        const transaction: Transaction = {
          txid: tx.txid,
          type: isReceived ? 'received' : 'sent',
          amount: Math.abs(amount),
          amountUSD: 0, // Will be calculated with current price
          address: isReceived 
            ? tx.vout.find((output: any) => addresses.includes(output.scriptpubkey_address))?.scriptpubkey_address || ''
            : tx.vin.find((input: any) => addresses.includes(input.prevout?.scriptpubkey_address))?.prevout?.scriptpubkey_address || '',
          timestamp: tx.status.block_time * 1000,
          confirmations: tx.status.confirmed ? 6 : 0,
          status: tx.status.confirmed ? 'confirmed' : 'pending',
        };
        
        uniqueTransactions.set(tx.txid, transaction);
      }
    });
    
    const processedTransactions = Array.from(uniqueTransactions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50); // Limit to 50 most recent transactions
    
    console.log('✅ Transaction history processed:', processedTransactions.length, 'transactions');
    return processedTransactions;
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    throw error;
  }
};

export const getAddressUTXOs = async (address: string): Promise<UTXO[]> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  try {
    const data = await fetchJSON(`${API_BASE}/address/${address}/utxo`, { timeoutMs: 15000 });
    return data as UTXO[];
  } catch (error) {
    console.error('Error fetching UTXOs:', error);
    return [];
  }
};

export const broadcastTransaction = async (txHex: string): Promise<string> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  try {
    const response = await fetch(`${BLOCKSTREAM_API}/tx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: txHex,
    });
    
    if (!response.ok) {
      throw new Error('Failed to broadcast transaction');
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error broadcasting transaction:', error);
    throw new Error('Failed to broadcast transaction');
  }
};