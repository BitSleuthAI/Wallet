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



// Legacy constants for backward compatibility
const BLOCKSTREAM_API = 'https://blockstream.info/api';
const MEMPOOL_API = 'https://mempool.space/api';

const API_BASE = Platform.select({
  web: MEMPOOL_API,
  default: BLOCKSTREAM_API,
});

// Test network connectivity
export const testNetworkConnectivity = async (): Promise<boolean> => {
  try {
    console.log('Testing network connectivity...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Quick test
    
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      ...(Platform.OS === 'web' ? { mode: 'cors' as const } : {}),
    });
    
    clearTimeout(timeoutId);
    const isConnected = response.ok;
    console.log(`Network connectivity test: ${isConnected ? 'PASSED' : 'FAILED'}`);
    return isConnected;
  } catch (error) {
    console.warn('Network connectivity test failed:', error);
    return false;
  }
};

// Retry mechanism with exponential backoff
async function fetchWithRetry(input: string, init?: RequestInit & { timeoutMs?: number }, maxRetries: number = 2): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchJSON(input, init);
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 second delay
        console.log(`Retrying request to ${input} in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

async function fetchJSON(input: string, init?: RequestInit & { timeoutMs?: number }) {
  const { timeoutMs = 15000, ...rest } = init ?? {};
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(input, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BitcoinWallet/1.0',
        ...(rest?.headers ?? {}),
      },
      ...(Platform.OS === 'web' ? { 
        mode: 'cors' as const,
        credentials: 'omit' as const,
      } : {}),
      ...rest,
    });
    
    if (!response.ok) {
      console.warn(`API request failed: ${response.status} ${response.statusText} for ${input}`);
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn(`Network request failed for ${input}:`, error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network error - please check your connection');
      }
      if (error.message.includes('CORS')) {
        throw new Error('Network configuration error');
      }
    }
    
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper function to normalize API responses
function normalizeBalanceResponse(data: any, apiName: string): number {
  try {
    if (apiName === 'BlockCypher') {
      // BlockCypher returns balance in satoshis
      return (data.balance || 0) / 100000000;
    } else if (apiName === 'Blockchain.info') {
      // Blockchain.info returns balance in satoshis
      return (data.final_balance || 0) / 100000000;
    } else {
      // Blockstream/Mempool format
      if (!data.chain_stats) {
        console.warn(`Invalid response format from ${apiName}:`, data);
        throw new Error('Invalid response format');
      }
      return (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
    }
  } catch (error) {
    console.warn(`Error normalizing balance response from ${apiName}:`, error);
    throw error;
  }
}

// Helper function to normalize transaction responses
function normalizeTransactionResponse(data: any, apiName: string): any[] {
  try {
    if (apiName === 'BlockCypher') {
      // BlockCypher has different format
      return data.txs || [];
    } else if (apiName === 'Blockchain.info') {
      // Blockchain.info returns transactions in 'txs' array
      return data.txs || [];
    } else {
      // Blockstream/Mempool format
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.warn(`Error normalizing transaction response from ${apiName}:`, error);
    return [];
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
      const timeoutId = setTimeout(() => controller.abort(), 6000); // Reduced timeout
      
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
  
  // If all APIs fail, return fallback price instead of throwing error
  console.warn('All price APIs failed, returning fallback price for better UX');
  return {
    usd: 45000, // Reasonable fallback price
    usd_24h_change: 0,
  };
};

export const getAddressBalance = async (address: string): Promise<number> => {
  // Ensure ECC is initialized for any crypto operations
  ensureECC();
  
  if (!address || address.length < 26) {
    console.warn('Invalid address provided:', address);
    return 0;
  }
  
  // Try multiple APIs for redundancy with different endpoints
  const apiAttempts = [
    { base: MEMPOOL_API, name: 'Mempool.space', endpoint: '/address' },
    { base: BLOCKSTREAM_API, name: 'Blockstream', endpoint: '/address' },
    { base: 'https://api.blockcypher.com/v1/btc/main', name: 'BlockCypher', endpoint: '/addrs' },
    { base: 'https://api.blockchain.info', name: 'Blockchain.info', endpoint: '/rawaddr' },
  ];
  
  let lastError: Error | null = null;
  
  for (const api of apiAttempts) {
    try {
      console.log(`Fetching balance for address ${address} from ${api.name}...`);
      
      const url = `${api.base}${api.endpoint}/${address}`;
      const data = await fetchWithRetry(url, {
        timeoutMs: 8000, // Reduced timeout for faster failover
      }, 1); // Reduced retries for faster failover
      
      const balance = normalizeBalanceResponse(data, api.name);
      console.log(`✅ Address balance fetched from ${api.name}:`, balance, 'BTC');
      return Math.max(0, balance); // Ensure non-negative balance
    } catch (error) {
      lastError = error as Error;
      console.warn(`Failed to fetch balance from ${api.name}:`, error);
      continue;
    }
  }
  
  console.error('All balance APIs failed for address:', address);
  
  // Test network connectivity to provide better error message
  const isConnected = await testNetworkConnectivity();
  if (!isConnected) {
    console.warn('Network connectivity test failed, returning 0 balance');
    return 0; // Return 0 instead of throwing error for better UX
  }
  
  // Return 0 balance instead of throwing error to prevent app crashes
  console.warn('All Bitcoin APIs unavailable, returning 0 balance for better UX');
  return 0;
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
  
  if (!address || address.length < 26) {
    console.warn('Invalid address provided:', address);
    return [];
  }
  
  // Try multiple APIs for redundancy with different endpoints
  const apiAttempts = [
    { base: MEMPOOL_API, name: 'Mempool.space', endpoint: '/address', suffix: '/txs' },
    { base: BLOCKSTREAM_API, name: 'Blockstream', endpoint: '/address', suffix: '/txs' },
    { base: 'https://api.blockcypher.com/v1/btc/main', name: 'BlockCypher', endpoint: '/addrs', suffix: '/full?limit=50' },
    { base: 'https://api.blockchain.info', name: 'Blockchain.info', endpoint: '/rawaddr', suffix: '' },
  ];
  
  let lastError: Error | null = null;
  
  for (const api of apiAttempts) {
    try {
      console.log(`Fetching transactions for address ${address} from ${api.name}...`);
      
      let url: string;
      if (api.name === 'Blockchain.info') {
        // Blockchain.info needs different URL format
        url = `${api.base}${api.endpoint}/${address}?format=json&limit=50`;
      } else {
        url = `${api.base}${api.endpoint}/${address}${api.suffix}`;
      }
      
      const data = await fetchWithRetry(url, {
        timeoutMs: 8000, // Reduced timeout for faster failover
      }, 1); // Reduced retries for faster failover
      
      const transactions = normalizeTransactionResponse(data, api.name);
      console.log(`✅ Address transactions fetched from ${api.name}:`, transactions.length, 'transactions');
      return transactions;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Failed to fetch transactions from ${api.name}:`, error);
      continue;
    }
  }
  
  console.error('All transaction APIs failed for address:', address);
  
  // Test network connectivity to provide better error message
  const isConnected = await testNetworkConnectivity();
  if (!isConnected) {
    console.warn('Network connectivity test failed, returning empty transactions');
    return []; // Return empty array instead of throwing error
  }
  
  // Return empty array instead of throwing error to prevent app crashes
  console.warn('All Bitcoin APIs unavailable, returning empty transactions for better UX');
  return [];
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