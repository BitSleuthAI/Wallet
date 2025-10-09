/**
 * Esplora API Service - Robust blockchain data fetching with fallback
 * Based on the Esplora API specification for Bitcoin blockchain data
 */

import { cacheTransaction, cacheTransactions, getCachedTransaction, loadTransactionCache } from './transaction-cache-service';

const BLOCKSTREAM_API_BASE = 'https://blockstream.info/api';
const MEMPOOL_SPACE_API_BASE = 'https://mempool.space/api';

const ESPLORA_BASES = [BLOCKSTREAM_API_BASE, MEMPOOL_SPACE_API_BASE];

// Cache for API responses (for non-transaction data like block height, prices, etc.)
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCacheKey(url: string): string {
  return url;
}

function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any, ttl: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

/**
 * Fetch JSON with proper error handling and timeout
 */
async function fetchJson(url: string, options?: RequestInit, timeoutMs: number = 10000): Promise<any> {
  console.log(`🌐 Fetching: ${url}`);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = timeoutMs;
    
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            const textBody = xhr.responseText;
            
            // Check for Blockstream's non-JSON notice page
            if (textBody.includes("Blockstream Explorer API NOTICE")) {
              const err: any = new Error('ESPLORA_PROVIDER_NOTICE');
              err.code = 'ESPLORA_PROVIDER_NOTICE';
              reject(err);
              return;
            }
            
            const data = JSON.parse(textBody);
            resolve(data);
          } catch (parseError) {
            console.error(`❌ Failed to parse JSON from ${url}:`, parseError);
            reject(new Error('The data provider returned a malformed response.'));
          }
        } else if (xhr.status === 0) {
          reject(new Error('Network error - request failed'));
        } else {
          const responseText = xhr.responseText || '';
          
          // Handle specific text errors
          if (responseText.toLowerCase().includes('invalid bitcoin address')) {
            reject(new Error('The address you entered is not a valid Bitcoin address.'));
            return;
          }
          if (responseText.toLowerCase().includes('invalid txid')) {
            reject(new Error('The transaction ID you entered is not valid.'));
            return;
          }
          
          // Handle rate limiting (429) - suppress error logging as it's just informational
          if (xhr.status === 429) {
            console.log(`⚠️ Rate limited by ${url.includes('blockstream') ? 'Blockstream' : 'Mempool.space'} - switching providers`);
            reject(new Error('Rate limited - too many requests'));
            return;
          }
          
          // Handle 404 - not an error, just no data
          if (xhr.status === 404) {
            console.log(`ℹ️ No data found for ${url}`);
            reject(new Error('Not found - no data available'));
            return;
          }
          
          // Log other errors
          console.error(`❌ API request to ${url} failed with status ${xhr.status}:`, responseText.substring(0, 200));
          reject(new Error(`API request failed with status ${xhr.status}`));
        }
      }
    };
    
    xhr.onerror = () => {
      reject(new Error('Network error'));
    };
    
    xhr.ontimeout = () => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    };
    
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('User-Agent', 'BitSleuthWallet/1.0');
    
    // Add any custom headers from options
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          xhr.setRequestHeader(key, value);
        }
      });
    }
    
    xhr.send();
  });
}

/**
 * Fetch an Esplora endpoint with retry and provider fallback
 * Path must start with '/'
 * 
 * Special handling for transaction endpoints:
 * - Individual tx requests (/tx/{txid}): Returns cached tx if available
 * - Bulk tx requests (/address/{address}/txs): Returns mix of cached + fresh txs
 * - Caches confirmed transactions permanently
 * - Caches unconfirmed transactions for 2 minutes
 */
export async function esploraGet(path: string, cacheTtlMs: number = 300000): Promise<any> {
  // Load transaction cache if not already loaded
  await loadTransactionCache();
  
  // Check if this is an individual transaction request
  const txMatch = path.match(/^\/tx\/([a-f0-9]{64})$/);
  
  if (txMatch) {
    const txid = txMatch[1];
    
    // Check transaction cache first
    const cachedTx = getCachedTransaction(txid);
    if (cachedTx) {
      return cachedTx;
    }
  }
  
  // Check if this is a bulk address transaction request
  const addressTxMatch = path.match(/^\/address\/([a-zA-Z0-9]+)\/txs/);
  
  const cacheKey = getCacheKey(path);
  
  // Check general cache for non-transaction data
  if (!txMatch && !addressTxMatch) {
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for: ${path}`);
      return cached;
    }
  }

  const attemptsPerProvider = 2;
  let lastError: any = null;
  
  for (const base of ESPLORA_BASES) {
    const url = `${base}${path}`;
    console.log(`🔄 Trying ${base} for ${path}`);
    
    for (let attempt = 0; attempt < attemptsPerProvider; attempt++) {
      try {
        const data = await fetchJson(url, {}, 15000);
        
        // Cache successful response and handle bulk transaction requests
        if (txMatch) {
          // Individual transaction request - cache it
          const txid = txMatch[1];
          await cacheTransaction(txid, data);
        } else if (addressTxMatch && Array.isArray(data)) {
          // Bulk address transaction request - cache all transactions
          await cacheTransactions(data);
          console.log(`💾 Cached ${data.length} transactions from address query`);
        } else {
          // Use general cache for other data
          setCachedData(cacheKey, data, cacheTtlMs);
        }
        
        console.log(`✅ Success from ${base} for ${path}`);
        return data;
        
      } catch (e: any) {
        lastError = e;
        console.log(`❌ Attempt ${attempt + 1} failed for ${base}:`, e.message);
        
        // If Blockstream served a notice, immediately break to try next provider
        if (e?.code === 'ESPLORA_PROVIDER_NOTICE') {
          console.log(`⚠️ Provider notice detected, switching to next provider`);
          break;
        }
        
        // Backoff for network/5xx/timeout
        if (e?.message?.includes('timeout') || e?.message?.includes('Rate limited') || /5\d\d/.test(e?.message || '')) {
          const delay = 1000 * (attempt + 1);
          console.log(`⏱️ Backing off ${delay}ms before retry`);
          await sleep(delay);
          continue;
        }
        
        // For other errors, retry once, then move on
        if (attempt < attemptsPerProvider - 1) {
          await sleep(500);
        }
      }
    }
    console.log(`🔄 Switching to next provider for ${path}`);
  }
  
  throw lastError ?? new Error('Failed to fetch from any Esplora provider');
}

/**
 * Get address statistics
 */
export async function getAddressStats(address: string): Promise<{ data: any | null; error: string | null }> {
  try {
    console.log(`📊 Getting address stats for: ${address.substring(0, 10)}...`);
    const stats = await esploraGet(`/address/${address}`, 300000); // Cache for 5 minutes
    return { data: stats, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Failed to get address stats:`, message);
    return { data: null, error: message };
  }
}

/**
 * Get transactions for an address
 */
export async function getAddressTransactions(address: string): Promise<{ data: any[] | null; error: string | null }> {
  try {
    console.log(`📜 Getting transactions for: ${address.substring(0, 10)}...`);
    const transactions = await esploraGet(`/address/${address}/txs`, 300000); // Cache for 5 minutes
    return { data: Array.isArray(transactions) ? transactions : [], error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Failed to get address transactions:`, message);
    return { data: null, error: message };
  }
}

/**
 * Get UTXOs for an address
 */
export async function getAddressUTXOs(address: string): Promise<{ data: any[] | null; error: string | null }> {
  try {
    console.log(`💰 Getting UTXOs for: ${address.substring(0, 10)}...`);
    const utxos = await esploraGet(`/address/${address}/utxo`, 300000); // Cache for 5 minutes
    return { data: Array.isArray(utxos) ? utxos : [], error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Failed to get address UTXOs:`, message);
    return { data: null, error: message };
  }
}

/**
 * Get current block height
 */
export async function getCurrentBlockHeight(): Promise<{ data: number | null; error: string | null }> {
  try {
    console.log(`📏 Getting current block height...`);
    const height = await esploraGet(`/blocks/tip/height`, 60000); // Cache for 1 minute
    return { data: height, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Failed to get block height:`, message);
    return { data: null, error: message };
  }
}

/**
 * Get BTC price from CoinGecko API (provides accurate 24h change data)
 */
export async function getBTCPrice(): Promise<{ data: { price: number; change24h: number } | null; error: string | null }> {
  try {
    console.log(`💲 Getting BTC price from CoinGecko...`);
    const response = await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {}, 60000); // Cache for 1 minute
    const bitcoinData = response?.bitcoin;
    const price = bitcoinData?.usd;
    const change24h = bitcoinData?.usd_24h_change;
    
    if (typeof price === 'number' && price > 0) {
      return { 
        data: { 
          price, 
          change24h: typeof change24h === 'number' ? change24h : 0 
        }, 
        error: null 
      };
    }
    
    return { data: null, error: 'Invalid price data received' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Failed to get BTC price:`, message);
    return { data: null, error: message };
  }
}

/**
 * Test provider connectivity
 */
export async function testProviderConnectivity(): Promise<{ data: boolean; error: string | null }> {
  try {
    console.log(`🔍 Testing provider connectivity...`);
    await esploraGet(`/blocks/tip/height`, 60000);
    return { data: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Provider connectivity test failed:`, message);
    return { data: false, error: message };
  }
}
