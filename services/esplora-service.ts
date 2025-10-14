/**
 * Esplora API Service - Robust blockchain data fetching with fallback
 * Based on the Esplora API specification for Bitcoin blockchain data
 */

import {
    getCachedAddressStats,
    getCachedAddressTransactions,
    getCachedAddressUTXOs,
    setCachedAddressStats,
    setCachedAddressTxIds,
    setCachedAddressUTXOs
} from './address-cache-service';
import { cacheTransaction, cacheTransactions, getCachedTransactionIds, loadTransactionCache } from './transaction-cache-service';

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
 * - Individual tx requests (/tx/{txid}): Checks cache first, falls back to API with full error handling
 * - Bulk tx requests (/address/{address}/txs): Checks cache before fetching, only fetches missing/expired txs
 * - Caches confirmed transactions permanently
 * - Caches unconfirmed transactions for 2 minutes
 */
export async function esploraGet(path: string, cacheTtlMs: number = 300000, xpubHint?: string): Promise<any> {
  // Load transaction cache if not already loaded
  await loadTransactionCache();
  
  // Check if this is an individual transaction request
  const txMatch = path.match(/^\/tx\/([a-f0-9]{64})$/);
  
  // Check if this is a bulk address transaction request
  // Support all Bitcoin address formats:
  // - Legacy P2PKH (1...): starts with 1, 26-35 chars, base58
  // - P2SH (3...): starts with 3, 26-35 chars, base58
  // - Bech32 (bc1q...): starts with bc1q, 42-62 chars, bech32
  // - Bech32m (bc1p...): starts with bc1p, 62 chars, bech32m
  const addressTxMatch = path.match(/^\/address\/((?:[13]|bc1)[a-zA-HJ-NP-Z0-9]{25,62})\/txs$/);
  const addressStatsMatch = path.match(/^\/address\/((?:[13]|bc1)[a-zA-HJ-NP-Z0-9]{25,62})$/);
  const addressUtxoMatch = path.match(/^\/address\/((?:[13]|bc1)[a-zA-HJ-NP-Z0-9]{25,62})\/utxo$/);
  
  const cacheKey = getCacheKey(path);
  
  // For individual transaction requests, check cache first
  if (txMatch) {
    const txid = txMatch[1];
    const { getCachedTransaction } = require('./transaction-cache-service');
    const cachedTx = getCachedTransaction(txid);
    if (cachedTx) {
      // Return cached transaction immediately - it's immutable once confirmed
      // For unconfirmed, we trust the cache within its TTL
      return cachedTx;
    }
  }
  
  // For bulk address requests, check cache and filter out what we already have
  if (addressTxMatch) {
    // If we already have cached transactions for this address, return them immediately
    const address = addressTxMatch[1];
    const cachedAddressTxs = await getCachedAddressTransactions(address);
    if (cachedAddressTxs !== null) {
      console.log(`📦 Address txs cache hit for ${address}: ${cachedAddressTxs.length} txs`);
      return cachedAddressTxs;
    }

    const cachedTxIds = getCachedTransactionIds();
    if (cachedTxIds.size > 0) {
      console.log(`📦 Found ${cachedTxIds.size} cached transactions, will merge with fresh data`);
    }
  }
  
  // Address stats cache
  if (addressStatsMatch) {
    const address = addressStatsMatch[1];
    const cachedStats = await getCachedAddressStats(address);
    if (cachedStats) {
      console.log(`📦 Address stats cache hit for ${address}`);
      return cachedStats;
    }
  }

  // Address UTXO cache
  if (addressUtxoMatch) {
    const address = addressUtxoMatch[1];
    const cachedUtxos = await getCachedAddressUTXOs(address);
    if (cachedUtxos) {
      console.log(`📦 Address UTXOs cache hit for ${address} (${cachedUtxos.length})`);
      return cachedUtxos;
    }
  }
  
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
  let providerIndex = 0;
  
  for (const base of ESPLORA_BASES) {
    const url = `${base}${path}`;
    console.log(`🔄 Trying ${base} for ${path}`);
    
    for (let attempt = 0; attempt < attemptsPerProvider; attempt++) {
      try {
        // Add delay before retry attempts to avoid rate limiting
        if (attempt > 0) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
          console.log(`⏱️ Backing off ${backoffDelay}ms before retry attempt ${attempt + 1}`);
          await sleep(backoffDelay);
        }
        
        const data = await fetchJson(url, {}, 15000);
        
        console.log(`✅ Success from ${base} for ${path}`);
        
        // Cache successful response AFTER confirming API success
        // This prevents caching errors from triggering retry/fallback logic
        try {
          if (txMatch) {
            // Individual transaction request - cache it
            const txid = txMatch[1];
            await cacheTransaction(txid, data);
          } else if (addressTxMatch && Array.isArray(data)) {
            // Bulk address transaction request - merge with cache and cache new/updated transactions
            const { getCachedTransaction } = require('./transaction-cache-service');
            const cachedTxIds = getCachedTransactionIds();
            
            // Separate fresh data into cached and new/updated
            const newTxs: any[] = [];
            const updatedTxs: any[] = [];
            
            for (const tx of data) {
              if (cachedTxIds.has(tx.txid)) {
                // Check if this is an update (unconfirmed → confirmed)
                const cached = getCachedTransaction(tx.txid);
                const isConfirmed = (tx.status?.confirmed === true) || (tx.status?.block_height !== undefined && tx.status?.block_height !== null);
                const wasUnconfirmed = cached && !cached.status?.confirmed;
                
                if (wasUnconfirmed && isConfirmed) {
                  updatedTxs.push(tx);
                }
              } else {
                newTxs.push(tx);
              }
            }
            
            console.log(`📊 Bulk fetch result: ${data.length} from API (${updatedTxs.length} updates, ${newTxs.length} new)`);
            
            // Only cache new transactions and updated ones (unconfirmed → confirmed)
            const txsToCache = [...newTxs, ...updatedTxs];
            if (txsToCache.length > 0) {
              await cacheTransactions(txsToCache);
            }
            
            // Merge: Get cached transactions that belong to this address
            // Filter by checking if the address appears in the transaction's inputs or outputs
            const addressMatch = path.match(/^\/address\/((?:[13]|bc1)[a-zA-HJ-NP-Z0-9]{25,62})\/txs/);
            const currentAddress = addressMatch ? addressMatch[1] : null;
            
            // Persist the txid list for this address for future cache hits
            if (currentAddress) {
              const txidsFromApi = Array.isArray(data) ? data.map((t: any) => t.txid) : [];
              await setCachedAddressTxIds(currentAddress, txidsFromApi, xpubHint);
            }

            const allCachedTxs: any[] = [];
            if (currentAddress) {
              for (const txid of cachedTxIds) {
                const cached = getCachedTransaction(txid);
                // Only include cached transactions that:
                // 1. Exist in cache
                // 2. Are NOT in the fresh API response (to avoid duplicates)
                // 3. Belong to the current address (check inputs and outputs)
                if (cached && !data.find(tx => tx.txid === txid)) {
                  // Check if this transaction belongs to the current address
                  const belongsToAddress = 
                    cached.vin?.some((input: any) => input.prevout?.scriptpubkey_address === currentAddress) ||
                    cached.vout?.some((output: any) => output.scriptpubkey_address === currentAddress);
                  
                  if (belongsToAddress) {
                    allCachedTxs.push(cached);
                  }
                }
              }
            }
            
            if (allCachedTxs.length > 0) {
              console.log(`📦 Merged ${allCachedTxs.length} additional cached transactions for address`);
              // Return merged data: fresh API data + cached transactions not in API response
              return [...data, ...allCachedTxs];
            }
          } else if (addressStatsMatch) {
            const address = addressStatsMatch[1];
            await setCachedAddressStats(address, data, xpubHint);
          } else if (addressUtxoMatch) {
            const address = addressUtxoMatch[1];
            await setCachedAddressUTXOs(address, Array.isArray(data) ? data : [], xpubHint);
          } else {
            // Use general cache for other data
            setCachedData(cacheKey, data, cacheTtlMs);
          }
        } catch (cacheError) {
          // Log caching errors but don't fail the request
          console.warn(`⚠️ Failed to cache data for ${path}:`, cacheError);
        }
        
        return data;
        
      } catch (e: any) {
        lastError = e;
        console.log(`❌ Attempt ${attempt + 1} failed for ${base}:`, e.message);
        
        // If Blockstream served a notice, immediately break to try next provider
        if (e?.code === 'ESPLORA_PROVIDER_NOTICE') {
          console.log(`⚠️ Provider notice detected, switching to next provider`);
          break;
        }
        
        // If rate limited (429), immediately switch to next provider instead of retrying
        if (e?.message?.includes('Rate limited')) {
          console.log(`⚠️ Rate limited by ${base}, switching to next provider immediately`);
          break;
        }
        
        // Backoff for network/5xx/timeout
        if (e?.message?.includes('timeout') || /5\d\d/.test(e?.message || '')) {
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
export async function getAddressStats(address: string, xpubHint?: string): Promise<{ data: any | null; error: string | null }> {
  try {
    console.log(`📊 Getting address stats for: ${address.substring(0, 10)}...`);
    const stats = await esploraGet(`/address/${address}`, 300000, xpubHint);
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
export async function getAddressTransactions(address: string, xpubHint?: string): Promise<{ data: any[] | null; error: string | null }> {
  try {
    console.log(`📜 Getting transactions for: ${address.substring(0, 10)}...`);
    const transactions = await esploraGet(`/address/${address}/txs`, 300000, xpubHint);
    const txArray = Array.isArray(transactions) ? transactions : [];
    return { data: txArray, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Failed to get address transactions:`, message);
    return { data: null, error: message };
  }
}

/**
 * Get detailed information about a transaction
 */
export async function getTransactionDetails(txid: string): Promise<{ data: any | null; error: string | null }> {
  try {
    console.log(`🔍 Getting transaction details for: ${txid}`);
    const transaction = await esploraGet(`/tx/${txid}`, 300000);
    return { data: transaction, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Failed to get transaction details:`, message);
    return { data: null, error: message };
  }
}

/**
 * Get transaction status (confirmations, block info)
 */
export async function getTransactionStatus(txid: string): Promise<{ data: any | null; error: string | null }> {
  try {
    console.log(`📊 Getting transaction status for: ${txid}`);
    const status = await esploraGet(`/tx/${txid}/status`, 60000);
    return { data: status, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Failed to get transaction status:`, message);
    return { data: null, error: message };
  }
}

/**
 * Get transaction outspends (spent status for each output)
 */
export async function getTransactionOutspends(txid: string): Promise<{ data: any[] | null; error: string | null }> {
  try {
    console.log(`🔗 Getting transaction outspends for: ${txid}`);
    const outspends = await esploraGet(`/tx/${txid}/outspends`, 60000);
    const outArray = Array.isArray(outspends) ? outspends : [];
    return { data: outArray, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Failed to get transaction outspends:`, message);
    return { data: null, error: message };
  }
}

/**
 * Get UTXOs for an address
 */
export async function getAddressUTXOs(address: string, xpubHint?: string): Promise<{ data: any[] | null; error: string | null }> {
  try {
    console.log(`💰 Getting UTXOs for: ${address.substring(0, 10)}...`);
    const utxos = await esploraGet(`/address/${address}/utxo`, 300000, xpubHint);
    const arr = Array.isArray(utxos) ? utxos : [];
    return { data: arr, error: null };
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
 * Cached for 5 minutes to avoid rate limiting
 */
export async function getBTCPrice(): Promise<{ data: { price: number; change24h: number } | null; error: string | null }> {
  const cacheKey = 'btc-price-coingecko';
  
  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`📦 Cache hit for BTC price`);
    return { data: cached, error: null };
  }
  
  try {
    console.log(`💲 Getting BTC price from CoinGecko...`);
    const response = await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {}, 60000);
    const bitcoinData = response?.bitcoin;
    const price = bitcoinData?.usd;
    const change24h = bitcoinData?.usd_24h_change;
    
    if (typeof price === 'number' && price > 0) {
      const priceData = { 
        price, 
        change24h: typeof change24h === 'number' ? change24h : 0 
      };
      
      // Cache for 5 minutes (300000ms)
      setCachedData(cacheKey, priceData, 300000);
      
      return { 
        data: priceData, 
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
