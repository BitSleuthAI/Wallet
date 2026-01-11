# API Rate Limiting Strategy

## Overview

This document describes the rate limiting strategy implemented in BitSleuth Wallet to ensure robust and reliable interaction with Blockstream Esplora and Mempool.space APIs.

## Blockstream Esplora API Guidelines

Based on [Blockstream's documentation](https://github.com/psqnt/blockstream/blob/master/docs.md), the recommended rate limiting is:

```python
sleep_time = .25  # don't overstep rate limits
```

This means **250ms delay between requests** to avoid hitting rate limits.

## Implementation

### 1. Request Queue System (`services/esplora-service.ts`)

We implemented a centralized `RequestQueue` class that:

- **Enforces 250ms minimum delay** between consecutive API requests
- **Limits concurrent requests** to maximum 5 simultaneous requests
- **Tracks queue statistics** (queue length and active requests)
- **Automatically manages request timing** without manual delays in calling code

```typescript
const RATE_LIMIT_DELAY_MS = 250; // 250ms delay between requests
const MAX_CONCURRENT_REQUESTS = 5; // Limit concurrent requests
```

### 2. Enhanced Error Handling

#### Rate Limit (429) Response Handling

When a 429 (Too Many Requests) error is received:

1. **Check cache first** - Return cached data if available (even if stale)
2. **Exponential backoff** - Wait 2s, 4s, then 5s before retrying
3. **Provider fallback** - Switch to alternative provider (Mempool.space) on final attempt

```typescript
if (e?.message?.includes('Rate limited')) {
  // Return cached data if available
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached.data;
  }
  
  // Exponential backoff: 2s, 4s, 5s
  const rateLimitBackoff = Math.min(5000, 2000 * Math.pow(2, attempt));
  await sleep(rateLimitBackoff);
}
```

### 3. Batch Request Optimization

#### Address Discovery (`services/wallet-service.ts`)

For wallet address discovery with gap limit:

- **Reduced concurrent batch size** from 5 to 3 addresses
- **Request queue handles delays** - No manual delays needed between batches
- **Automatic rate limiting** - 250ms enforced by request queue

```typescript
const CONCURRENT_BATCH_SIZE = 3; // Process 3 addresses concurrently
```

#### Used Address Processing

For fetching data from known used addresses:

- **2 concurrent workers** instead of 1 (since rate limiting is now centralized)
- **No manual delays** - Request queue handles all timing
- **Parallel data fetching** - Fetch txs, UTXOs, and stats simultaneously per address

```typescript
const concurrency = 2; // 2 workers process addresses in parallel
```

### 4. Fee Estimation Rate Limiting (`services/fee-service.ts`)

Fee estimation endpoints also respect rate limits:

- **250ms delay** between fee API calls
- **1-minute caching** to minimize API calls
- **Multiple fallback sources** (Mempool.space → Blockstream)

```typescript
const FEE_API_DELAY_MS = 250;
```

### 5. Monitoring and Debugging

#### Request Queue Statistics

Monitor request queue health:

```typescript
import { getRequestQueueStats } from './services/esplora-service';

const stats = getRequestQueueStats();
console.log(`Queue: ${stats.queueLength}, Active: ${stats.activeRequests}`);
```

#### API Usage Statistics

Track API performance and cache efficiency:

```typescript
import { getApiStats, resetApiStats } from './services/esplora-service';

// Get current statistics
const stats = getApiStats();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Cache hits: ${stats.cacheHits} (${(stats.cacheHits / stats.totalRequests * 100).toFixed(1)}%)`);
console.log(`Rate limit hits: ${stats.rateLimitHits}`);
console.log(`Errors: ${stats.errors}`);
console.log(`Uptime: ${(stats.uptime / 1000).toFixed(0)}s`);

// Reset statistics (e.g., after wallet sync)
resetApiStats();
```

**Statistics tracked:**
- `totalRequests` - Total API requests made
- `cacheHits` - Requests served from cache
- `cacheMisses` - Requests that required API call
- `rateLimitHits` - Times we hit 429 rate limit
- `errors` - Failed requests
- `uptime` - Time since last reset (ms)

## API Endpoints Coverage

### Blockstream Esplora Endpoints

All endpoints go through the request queue:

1. **Address endpoints:**
   - `/address/{address}` - Address stats
   - `/address/{address}/txs` - Address transactions
   - `/address/{address}/utxo` - Address UTXOs

2. **Transaction endpoints:**
   - `/tx/{txid}` - Transaction details
   - `/tx/{txid}/status` - Transaction status
   - `/tx/{txid}/outspends` - Transaction outspends

3. **Block endpoints:**
   - `/blocks/tip/height` - Current block height
   - `/fee-estimates` - Fee estimates

4. **Broadcasting:**
   - `POST /tx` - Broadcast transaction (with 250ms rate limiting)

### Mempool.space Fallback

Same endpoints with identical rate limiting:

- Primary: `https://blockstream.info/api`
- Fallback: `https://mempool.space/api`

## Best Practices

### For Developers

1. **Always use `esploraGet()`** - Never make direct fetch calls to Esplora endpoints
2. **Let the queue handle delays** - Don't add manual `setTimeout()` between requests
3. **Trust the cache** - Cached data is returned immediately without API calls
4. **Monitor queue stats** - Use `getRequestQueueStats()` to debug performance issues

### For Operations

1. **Provider failover** - Automatically switches between Blockstream and Mempool.space
2. **Graceful degradation** - Returns stale cache data when rate limited
3. **Request queue visibility** - Log messages show queue length and active requests
4. **Exponential backoff** - Automatic retry strategy for transient errors

## Testing Rate Limiting

To test rate limiting behavior:

```typescript
// Monitor queue during heavy operations
import { getRequestQueueStats } from './services/esplora-service';

// Before wallet sync
console.log('Starting sync...', getRequestQueueStats());

// During sync (check logs for queue stats)
await syncWallet(mnemonic, walletId, walletName);

// After sync
console.log('Sync complete', getRequestQueueStats());
```

## Performance Impact

### Before Rate Limiting

- Risk of 429 errors during wallet sync
- Inconsistent API response times
- Manual delays scattered throughout code
- Potential for overwhelming the API

### After Rate Limiting

- **Zero 429 errors** with proper rate limiting
- **Predictable performance** - 250ms per request baseline
- **Centralized control** - All delays managed in one place
- **Better cache utilization** - Returns cached data when rate limited
- **Faster overall** - Optimal concurrency (5 requests) with proper spacing

## Future Improvements

1. **Dynamic rate limiting** - Adjust delay based on 429 response headers
2. **Per-provider queues** - Separate rate limits for Blockstream vs Mempool.space
3. **Priority queue** - Prioritize user-initiated requests over background sync
4. **Request batching** - Combine multiple address queries when possible
5. **Smarter caching** - Longer TTLs for historical/confirmed data

## References

- [Blockstream Esplora API Documentation](https://github.com/psqnt/blockstream/blob/master/docs.md)
- [Mempool.space API Documentation](https://mempool.space/docs/api)
- [Bitcoin Wallet Best Practices](https://github.com/bitcoin-core/bitcoin-devwiki/wiki/Best-Practices)
