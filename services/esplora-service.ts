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
import { reliableFetch } from './networking-polyfill';
import { cacheTransaction, cacheTransactions, getCachedTransactionIds, loadTransactionCache } from './transaction-cache-service';

const BLOCKSTREAM_API_BASE = 'https://blockstream.info/api';
const MEMPOOL_SPACE_API_BASE = 'https://mempool.space/api';

const ESPLORA_BASES = [BLOCKSTREAM_API_BASE, MEMPOOL_SPACE_API_BASE];

// Rate limiting configuration - PRODUCTION OPTIMIZED
// Based on Blockstream Green (1000ms), Trust Wallet (1500ms), and Bluewallet (800ms) best practices
// Blockstream public API allows ~10 req/sec = 100ms, but bursts cause 429s
// Conservative approach: 1000ms base delay with exponential backoff for retries
const RATE_LIMIT_DELAY_MS = 1000; // Increased from 400ms to 1000ms - more conservative
const MAX_CONCURRENT_REQUESTS = 1; // Reduced to 1 to completely avoid race conditions and 429s
const RATE_LIMIT_JITTER_MS = 200; // Add random jitter to avoid thundering herd

// Request queue for rate limiting with deduplication
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private activeRequests = 0;
  private lastRequestTime = 0;
  private pendingRequests: Map<string, Promise<any>> = new Map(); // Deduplication map

  /**
   * Enqueue a request with optional deduplication
   * If a request with the same key is already pending, return that promise instead
   */
  async enqueue<T>(fn: () => Promise<T>, dedupeKey?: string): Promise<T> {
    // Check if we already have a pending request with this key
    if (dedupeKey && this.pendingRequests.has(dedupeKey)) {
      console.log(`🔄 Deduplicating request: ${dedupeKey}`);
      return this.pendingRequests.get(dedupeKey)! as Promise<T>;
    }

    const promise = new Promise<T>((resolve, reject) => {
      const wrappedFn = async () => {
        try {
          // Enforce minimum delay between requests with jitter
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          const jitter = Math.random() * RATE_LIMIT_JITTER_MS; // 0-200ms random jitter
          const totalDelay = RATE_LIMIT_DELAY_MS + jitter;
          
          if (timeSinceLastRequest < totalDelay) {
            const delayNeeded = totalDelay - timeSinceLastRequest;
            console.log(`⏱️ Rate limiting: waiting ${Math.round(delayNeeded)}ms (base: ${RATE_LIMIT_DELAY_MS}ms + jitter: ${Math.round(jitter)}ms)`);
            await sleep(delayNeeded);
          }

          this.lastRequestTime = Date.now();
          this.activeRequests++;
          
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          if (dedupeKey) {
            this.pendingRequests.delete(dedupeKey);
          }
          this.processQueue();
        }
      };

      this.queue.push(wrappedFn);
      this.processQueue();
    });

    // Store the promise for deduplication
    if (dedupeKey) {
      this.pendingRequests.set(dedupeKey, promise);
    }

    return promise;
  }

  private processQueue() {
    if (this.activeRequests >= MAX_CONCURRENT_REQUESTS) {
      return;
    }

    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getActiveRequests(): number {
    return this.activeRequests;
  }

  getPendingDedupeCount(): number {
    return this.pendingRequests.size;
  }
}

// Global request queue instance
const requestQueue = new RequestQueue();

// Circuit breaker for rate limiting with exponential backoff
let circuitBreakerTripped = false;
let circuitBreakerUntil = 0;
let rateLimitErrorCount = 0;
let lastRateLimitReset = Date.now();
const CIRCUIT_BREAKER_THRESHOLD = 3; // Trip after 3 rate limit errors (more aggressive)
const CIRCUIT_BREAKER_BASE_DURATION = 15000; // Base: 15 seconds (increased from 10s)
const CIRCUIT_BREAKER_MAX_DURATION = 120000; // Max: 2 minutes
const RATE_LIMIT_ERROR_RESET_WINDOW = 60000; // Reset error count after 1 minute

// Track API statistics for debugging and monitoring
let apiStats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  rateLimitHits: 0,
  errors: 0,
  lastResetTime: Date.now(),
};

export function getApiStats() {
  return {
    ...apiStats,
    uptime: Date.now() - apiStats.lastResetTime,
  };
}

export function resetApiStats() {
  apiStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    rateLimitHits: 0,
    errors: 0,
    lastResetTime: Date.now(),
  };
}

type CacheEntry = { data: any; timestamp: number; ttl: number };

// Cache for API responses (for non-transaction data like block height, prices, etc.)
const cache = new Map<string, CacheEntry>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCacheKey(url: string): string {
  return url;
}

function getCachedData(key: string): CacheEntry | null {
  const cached = cache.get(key);
  if (!cached) {
    return null;
  }

  return cached;
}

function setCachedData(key: string, data: any, ttl: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

/**
 * Fetch JSON with proper error handling and timeout
 * Uses reliable fetch with multiple fallback strategies for React Native DNS issues
 */
async function fetchJson(url: string, options?: RequestInit, timeoutMs: number = 30000): Promise<any> {
  console.log(`🌐 Fetching: ${url}`);
  
  // Try reliable fetch first (handles DNS issues better)
  try {
    const response = await reliableFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BitSleuthWallet/1.0',
        'Cache-Control': 'no-cache',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      
      // Check for Blockstream's non-JSON notice page
      if (responseText.includes("Blockstream Explorer API NOTICE")) {
        const err: any = new Error('ESPLORA_PROVIDER_NOTICE');
        err.code = 'ESPLORA_PROVIDER_NOTICE';
        throw err;
      }
      
      // Handle specific text errors
      if (responseText.toLowerCase().includes('invalid bitcoin address')) {
        throw new Error('The address you entered is not a valid Bitcoin address.');
      }
      if (responseText.toLowerCase().includes('invalid txid')) {
        throw new Error('The transaction ID you entered is not valid.');
      }
      
      // Handle rate limiting (429)
      if (response.status === 429) {
        console.log(`⚠️ Rate limited by ${url.includes('blockstream') ? 'Blockstream' : 'Mempool.space'} - switching providers`);
        throw new Error('Rate limited - too many requests');
      }
      
      // Handle 404 - not an error, just no data
      if (response.status === 404) {
        console.log(`ℹ️ No data found for ${url}`);
        throw new Error('Not found - no data available');
      }
      
      // Log other errors
      console.error(`❌ API request to ${url} failed with status ${response.status}:`, responseText.substring(0, 200));
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error: any) {
    console.log(`❌ Reliable fetch failed for ${url}:`, error.message);
    
    // If reliable fetch fails, try regular fetch as fallback
    if (error.message?.includes('DNS resolution failed') || error.message?.includes('Unable to resolve host')) {
      console.log(`🔄 DNS issue detected, trying regular fetch fallback for ${url}`);
      return fetchJsonFallback(url, options, timeoutMs);
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Fallback fetch using regular fetch API
 */
async function fetchJsonFallback(url: string, options?: RequestInit, timeoutMs: number = 30000): Promise<any> {
  console.log(`🔄 Trying regular fetch fallback for ${url}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BitSleuthWallet/1.0',
        'Cache-Control': 'no-cache',
        ...options?.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const responseText = await response.text();
      
      // Check for Blockstream's non-JSON notice page
      if (responseText.includes("Blockstream Explorer API NOTICE")) {
        const err: any = new Error('ESPLORA_PROVIDER_NOTICE');
        err.code = 'ESPLORA_PROVIDER_NOTICE';
        throw err;
      }
      
      // Handle specific text errors
      if (responseText.toLowerCase().includes('invalid bitcoin address')) {
        throw new Error('The address you entered is not a valid Bitcoin address.');
      }
      if (responseText.toLowerCase().includes('invalid txid')) {
        throw new Error('The transaction ID you entered is not valid.');
      }
      
      // Handle rate limiting (429)
      if (response.status === 429) {
        console.log(`⚠️ Rate limited by ${url.includes('blockstream') ? 'Blockstream' : 'Mempool.space'} - switching providers`);
        throw new Error('Rate limited - too many requests');
      }
      
      // Handle 404 - not an error, just no data
      if (response.status === 404) {
        console.log(`ℹ️ No data found for ${url}`);
        throw new Error('Not found - no data available');
      }
      
      // Log other errors
      console.error(`❌ API request to ${url} failed with status ${response.status}:`, responseText.substring(0, 200));
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error: any) {
    console.log(`❌ Regular fetch fallback failed for ${url}:`, error.message);
    
    // If regular fetch also fails, try XMLHttpRequest as last resort
    if (error.name === 'AbortError' || error.message?.includes('Network error') || error.message?.includes('fetch')) {
      console.log(`🔄 Regular fetch failed, trying XMLHttpRequest as last resort for ${url}`);
      return fetchJsonXHR(url, options, timeoutMs);
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * XMLHttpRequest fallback for fetch API
 */
async function fetchJsonXHR(url: string, options?: RequestInit, timeoutMs: number = 30000): Promise<any> {
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
    
    xhr.onerror = (event) => {
      console.error(`❌ XMLHttpRequest error for ${url}:`, event);
      console.error(`❌ Error details:`, {
        readyState: xhr.readyState,
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText?.substring(0, 200),
      });
      reject(new Error('Network error - request failed'));
    };
    
    xhr.ontimeout = () => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    };
    
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('User-Agent', 'BitSleuthWallet/1.0');
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    
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
export async function esploraGet(path: string, cacheTtlMs: number = 600000, xpubHint?: string): Promise<any> {
  // Load transaction cache if not already loaded
  await loadTransactionCache();
  
  const cacheKey = getCacheKey(path);

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
  
  // Track API request
  apiStats.totalRequests++;
  
  // For individual transaction requests, check cache first
  if (txMatch) {
    const txid = txMatch[1];
    const { getCachedTransaction } = require('./transaction-cache-service');
    const cachedTx = getCachedTransaction(txid);
    if (cachedTx) {
      apiStats.cacheHits++;
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
      apiStats.cacheHits++;
      console.log(`📦 Address txs cache hit for ${address}: ${cachedAddressTxs.length} txs`);
      return cachedAddressTxs;
    }
  }
  
  // Cache miss - will make API request
  apiStats.cacheMisses++;

  // Log cached transaction IDs for debugging
  if (addressTxMatch) {
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

  // Address UTXO cache with staleness detection
  // CRITICAL: Empty UTXO arrays should only be cached if the address has never been used
  // If the address HAS been used but currently has no UTXOs (all spent), cache TTL should be very short
  if (addressUtxoMatch) {
    const address = addressUtxoMatch[1];
    const cachedUtxos = await getCachedAddressUTXOs(address);
    
    if (cachedUtxos && cachedUtxos.length > 0) {
      console.log(`📦 Address UTXOs cache hit for ${address.substring(0, 10)}... (${cachedUtxos.length})`);
      return cachedUtxos;
    } else if (cachedUtxos && cachedUtxos.length === 0) {
      // For empty UTXO results, check if the cache is stale
      // Empty results from used addresses should be refreshed more frequently
      const { isAddressCacheStale } = await import('./address-cache-service');
      const isStale = await isAddressCacheStale(address, 'utxos');
      
      if (isStale) {
        console.log(`🔄 Stale empty UTXO cache for ${address.substring(0, 10)}..., fetching fresh data`);
        // Don't return cached empty result - fetch fresh data
      } else {
        console.log(`📦 Fresh empty UTXO cache hit for ${address.substring(0, 10)}...`);
        return cachedUtxos;
      }
    }
  }
  
  // Check general cache for non-transaction data
  if (!txMatch && !addressTxMatch) {
    const cached = getCachedData(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < cached.ttl) {
        console.log(`📦 Cache hit for: ${path}`);
        return cached.data;
      }

      console.log(`📦 Stale cache hit for: ${path} (age ${age}ms)`);
    }
  }

  // Reset rate limit error count if window has passed
  if (Date.now() - lastRateLimitReset > RATE_LIMIT_ERROR_RESET_WINDOW) {
    rateLimitErrorCount = 0;
    lastRateLimitReset = Date.now();
    console.log('✅ Rate limit error count reset');
  }

  // Check circuit breaker with exponential backoff
  if (circuitBreakerTripped && Date.now() < circuitBreakerUntil) {
    const waitTime = circuitBreakerUntil - Date.now();
    console.log(`⚠️ Circuit breaker active (${rateLimitErrorCount} rate limit errors), waiting ${Math.round(waitTime/1000)}s before making requests`);
    await sleep(waitTime);
    circuitBreakerTripped = false;
  }

  const attemptsPerProvider = 3; // Increased attempts per provider
  let lastError: any = null;
  
  // Try all providers
  const allProviders = ESPLORA_BASES;
  
  for (const base of allProviders) {
    const url = `${base}${path}`;
    console.log(`🔄 Trying ${base} for ${path} (queue: ${requestQueue.getQueueLength()}, active: ${requestQueue.getActiveRequests()})`);
    
    for (let attempt = 0; attempt < attemptsPerProvider; attempt++) {
      try {
        // Add exponential backoff delay before retry attempts
        if (attempt > 0) {
          // Exponential backoff: 2s, 4s, 8s (capped at 8s)
          const backoffDelay = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
          console.log(`⏱️ Exponential backoff: waiting ${backoffDelay}ms before retry attempt ${attempt + 1}`);
          await sleep(backoffDelay);
        }
        
        // Use request queue to enforce rate limiting with deduplication
        // Create deduplication key from path to avoid duplicate concurrent requests
        // Timeout: 30s for slow networks/large responses (balance of reliability vs UX)
        // Note: UI should show loading states for operations >5s
        const dedupeKey = `esplora:${path}`;
        const data = await requestQueue.enqueue(() => fetchJson(url, {}, 30000), dedupeKey);
        
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
            const utxos = Array.isArray(data) ? data : [];
            
            // If we get empty UTXOs, clear any existing empty caches to force fresh fetches
            if (utxos.length === 0) {
              console.log(`🔄 Empty UTXOs for ${address.substring(0, 10)}..., clearing empty caches`);
              try {
                const { clearEmptyUTXOCaches } = await import('./address-cache-service');
                await clearEmptyUTXOCaches();
              } catch (e) {
                console.warn('Failed to clear empty UTXO caches:', e);
              }
            }
            
            await setCachedAddressUTXOs(address, utxos, xpubHint);
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
        apiStats.errors++;
        console.log(`❌ Attempt ${attempt + 1} failed for ${base}:`, e.message);

        // If hit by rate limit, implement exponential backoff with circuit breaker
        if (e?.message?.includes('Rate limited')) {
          apiStats.rateLimitHits++;
          rateLimitErrorCount++;
          console.log(`⚠️ Rate limited by ${base} (window: ${rateLimitErrorCount}, session: ${apiStats.rateLimitHits})`);

          // Trip circuit breaker with exponential backoff duration
          if (rateLimitErrorCount >= CIRCUIT_BREAKER_THRESHOLD) {
            // Exponential backoff: 15s, 30s, 60s, 120s (capped)
            const backoffMultiplier = Math.pow(2, Math.min(rateLimitErrorCount - CIRCUIT_BREAKER_THRESHOLD, 3));
            const breakerDuration = Math.min(CIRCUIT_BREAKER_BASE_DURATION * backoffMultiplier, CIRCUIT_BREAKER_MAX_DURATION);
            
            circuitBreakerTripped = true;
            circuitBreakerUntil = Date.now() + breakerDuration;
            console.log(`🚨 Circuit breaker tripped! (${rateLimitErrorCount} errors) - Pausing ALL requests for ${Math.round(breakerDuration/1000)}s`);
          }

          // First, check if we have cached data to return immediately (even stale)
          const cached = getCachedData(cacheKey);
          if (cached) {
            const age = Date.now() - cached.timestamp;
            console.log(`📦 Returning stale cached data for ${path} due to rate limit (age ${Math.round(age/1000)}s)`);
            return cached.data;
          }

          // If this is not the last attempt, wait with exponential backoff
          if (attempt < attemptsPerProvider - 1) {
            // Exponential backoff: 5s, 10s, 20s (capped)
            const rateLimitBackoff = Math.min(5000 * Math.pow(2, attempt), 20000);
            console.log(`⏱️ Rate limit exponential backoff: waiting ${Math.round(rateLimitBackoff/1000)}s before retry`);
            await sleep(rateLimitBackoff);
            continue;
          }

          // On last attempt, switch to next provider after a delay
          console.log(`⚠️ Rate limited on final attempt, switching to next provider after delay`);
          await sleep(3000); // 3 second delay before trying next provider
          break;
        }
        
        // If Blockstream served a notice, immediately break to try next provider
        if (e?.code === 'ESPLORA_PROVIDER_NOTICE') {
          console.log(`⚠️ Provider notice detected, switching to next provider`);
          break;
        }

        // Backoff for network/5xx/timeout
        if (e?.message?.includes('timeout') || /5\d\d/.test(e?.message || '')) {
          const delay = Math.min(4000, 1500 * (attempt + 1));
          console.log(`⏱️ Backing off ${delay}ms before retry`);
          await sleep(delay);
          continue;
        }

        // For other errors, retry once, then move on
        if (attempt < attemptsPerProvider - 1) {
          await sleep(750);
        }
      }
    }
    console.log(`🔄 Switching to next provider for ${path}`);
  }
  
  // If all providers failed, provide a more helpful error message
  if (lastError?.message?.includes('Network error') || lastError?.message?.includes('Unable to resolve host')) {
    throw new Error('Network connectivity issue detected. Please check your internet connection and try again.');
  }
  
  if (lastError?.message?.includes('getaddrinfo ENOTFOUND')) {
    throw new Error('DNS resolution failed. Please check your internet connection and DNS settings.');
  }
  
  // Check if we have any cached data to return as fallback
  const cached = getCachedData(cacheKey);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    console.log(`📦 Returning stale cached data for ${path} (age ${age}ms) - all providers failed`);
    return cached.data;
  }
  
  throw lastError ?? new Error('Failed to fetch from any Esplora provider');
}

/**
 * Test network connectivity to Esplora-compatible API providers
 */
export async function testNetworkConnectivity(): Promise<{ connected: boolean; workingProviders: string[]; errors: string[] }> {
  const workingProviders: string[] = [];
  const errors: string[] = [];
  
  // Test all Esplora-compatible providers
  const allEsploraProviders = ESPLORA_BASES;
  
  for (const provider of allEsploraProviders) {
    try {
      await fetchJson(`${provider}/blocks/tip/height`, undefined, 5000);
      workingProviders.push(provider);
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return {
    connected: workingProviders.length > 0,
    workingProviders,
    errors
  };
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
      console.log(`💰 Getting UTXOs for wallet address`);
      const utxos = await esploraGet(`/address/${address}/utxo`, 300000, xpubHint);
      const arr = Array.isArray(utxos) ? utxos : [];
      console.log(`💰 Processed UTXOs for request:`, arr.length);
      return { data: arr, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`❌ Failed to get address UTXOs for ${address.substring(0, 10)}:`, message);
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
 * Get BTC price from multiple sources with fallback
 * Cached for 5 minutes to avoid rate limiting
 */
export async function getBTCPrice(): Promise<{ data: { price: number; change24h: number } | null; error: string | null }> {
  const cacheKey = 'btc-price-multi';
  
  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log(`📦 Cache hit for BTC price`);
    return { data: cached.data, error: null };
  }
  
  // Try multiple price sources in order of preference
  const priceSources = [
    {
      name: 'CoinGecko',
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      parser: (data: any) => {
        const bitcoinData = data?.bitcoin;
        return {
          price: bitcoinData?.usd,
          change24h: bitcoinData?.usd_24h_change || 0
        };
      }
    },
    {
      name: 'Blockchain.info',
      url: 'https://blockchain.info/ticker',
      parser: (data: any) => {
        return {
          price: data?.USD?.last,
          change24h: 0 // Not available from this API
        };
      }
    },
    {
      name: 'CoinCap',
      url: 'https://api.coincap.io/v2/assets/bitcoin',
      parser: (data: any) => {
        return {
          price: parseFloat(data?.data?.priceUsd || '0'),
          change24h: parseFloat(data?.data?.changePercent24Hr || '0')
        };
      }
    }
  ];
  
  for (const source of priceSources) {
    try {
      console.log(`💲 Getting BTC price from ${source.name}...`);
      const response = await fetchJson(source.url, {}, 30000);
      const parsed = source.parser(response);
      
      if (typeof parsed.price === 'number' && parsed.price > 0) {
        const priceData = { 
          price: parsed.price, 
          change24h: typeof parsed.change24h === 'number' ? parsed.change24h : 0 
        };
        
        // Cache for 5 minutes (300000ms)
        setCachedData(cacheKey, priceData, 300000);
        
        console.log(`✅ BTC price fetched from ${source.name}: $${priceData.price}`);
        return { 
          data: priceData, 
          error: null 
        };
      }
      
      console.warn(`⚠️ Invalid price data from ${source.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.warn(`❌ Failed to get BTC price from ${source.name}:`, message);
      continue; // Try next source
    }
  }
  
  // All sources failed
  console.error(`❌ All BTC price sources failed`);
  return { data: null, error: 'Unable to fetch Bitcoin price from any source' };
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

/**
 * Test basic network connectivity with multiple endpoints
 */
export async function testBasicConnectivity(): Promise<{ data: boolean; error: string | null }> {
  const testEndpoints = [
    'https://httpbin.org/get',
    'https://api.github.com',
    'https://www.google.com',
    'https://1.1.1.1' // Cloudflare DNS
  ];
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`🔍 Testing connectivity to ${endpoint}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BitSleuthWallet/1.0',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || response.status < 500) {
        console.log(`✅ Basic connectivity test passed with ${endpoint}`);
        return { data: true, error: null };
      }
      
      console.warn(`⚠️ ${endpoint} returned status ${response.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.warn(`❌ Connectivity test failed for ${endpoint}:`, message);
      
      // Check if it's a DNS resolution issue
      if (message.includes('Unable to resolve host') || message.includes('getaddrinfo ENOTFOUND')) {
        console.error(`❌ DNS resolution failed for ${endpoint}`);
        return { data: false, error: 'DNS resolution failed - check internet connection' };
      }
      
      continue; // Try next endpoint
    }
  }
  
  console.error(`❌ All connectivity tests failed`);
  return { data: false, error: 'No network connectivity detected' };
}

/**
 * Get request queue statistics for debugging
 * Shows current queue length, active requests, and deduplicated requests
 */
export function getRequestQueueStats(): { queueLength: number; activeRequests: number; pendingDedupeCount: number } {
  return {
    queueLength: requestQueue.getQueueLength(),
    activeRequests: requestQueue.getActiveRequests(),
    pendingDedupeCount: requestQueue.getPendingDedupeCount(),
  };
}
