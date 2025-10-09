# Transaction Caching Implementation

## Overview

Implemented a smart transaction caching system that dramatically reduces unnecessary API calls by recognizing that **confirmed transactions on the blockchain are immutable** and can be cached permanently.

## Problem

Previously, the wallet was re-fetching all transactions every 2 minutes, even though confirmed transactions never change once they're on the blockchain. This caused:
- Unnecessary API calls
- Slower performance
- Higher risk of rate limiting
- Wasted bandwidth and resources

## Solution

Created a two-tier caching system that treats confirmed and unconfirmed transactions differently:

### Confirmed Transactions
- **Cached permanently** (they're immutable on the blockchain)
- Stored in AsyncStorage for persistence across app restarts
- Never need to be re-fetched once confirmed

### Unconfirmed Transactions
- **Cached for 2 minutes** (they can still change via RBF or be dropped)
- Automatically moved to confirmed cache when they get confirmed
- Expired entries are pruned automatically

## Implementation Details

### New Service: `transaction-cache-service.ts`

Created a dedicated service with the following features:

1. **Dual Cache System**
   - `confirmed` Map: Permanent storage for confirmed transactions
   - `unconfirmed` Map: Short-lived storage (2 min TTL) for pending transactions

2. **Persistence**
   - Saves cache to AsyncStorage automatically
   - Loads cache on app startup
   - Survives app restarts

3. **Smart Caching**
   - Automatically detects transaction status from `status.confirmed` field
   - Moves transactions from unconfirmed to confirmed cache when status changes
   - Prunes expired unconfirmed transactions

4. **Cache Management Functions**
   ```typescript
   loadTransactionCache()        // Load from AsyncStorage
   getCachedTransaction(txid)    // Get a cached transaction
   cacheTransaction(txid, data)  // Cache a single transaction
   cacheTransactions(txs)        // Batch cache multiple transactions
   getCacheStats()               // Get cache statistics
   clearUnconfirmedCache()       // Clear pending transactions
   clearAllCache()               // Clear entire cache
   pruneExpiredTransactions()    // Remove expired entries
   ```

### Integration Points

#### 1. `wallet-service.ts`
- Loads transaction cache on startup
- Checks cache before processing transactions
- Caches all fetched transactions for future use
- Reports cache hit/miss statistics

**Cache Performance Logging:**
```
📦 Cache performance: 45 hits, 5 misses (90% hit rate)
```

#### 2. `esplora-service.ts`
- Intercepts transaction requests (`/tx/{txid}`)
- Checks transaction cache before making API calls
- Automatically caches fetched transactions
- Works transparently with existing code

**Benefits:**
- RBF service automatically benefits (uses `esploraGet`)
- CPFP service automatically benefits (uses `esploraGet`)
- Any code using `esploraGet` for transactions gets caching

#### 3. Automatic Cache Invalidation
- When an unconfirmed transaction is re-fetched and now confirmed
- It's automatically moved from unconfirmed to confirmed cache
- No manual invalidation needed

## Performance Benefits

### Before Caching
- Every wallet refresh: Fetch ALL transactions from API
- 50 transactions × 2-minute refresh = 25 API calls per minute
- High risk of rate limiting
- Slow performance on poor connections

### After Caching
- First load: Fetch all transactions (cache miss)
- Subsequent loads: Only fetch new/unconfirmed transactions
- 50 confirmed transactions = 0 API calls (100% cache hit)
- 5 unconfirmed transactions = 5 API calls (only if >2 min old)
- **90-95% reduction in API calls for typical wallets**

## Example Cache Statistics

```typescript
{
  confirmedCount: 127,        // 127 confirmed transactions cached
  unconfirmedCount: 3,        // 3 pending transactions cached
  totalCount: 130,            // Total cached transactions
  oldestConfirmed: 750123,    // Block height of oldest cached tx
  newestConfirmed: 820456     // Block height of newest cached tx
}
```

## Cache Storage

### AsyncStorage Keys
- `tx_cache_confirmed`: Array of confirmed transactions
- `tx_cache_unconfirmed`: Array of unconfirmed transactions

### Storage Format
```typescript
interface CachedTransaction {
  txid: string;              // Transaction ID
  data: any;                 // Full transaction data
  confirmed: boolean;        // Confirmation status
  cachedAt: number;          // Timestamp when cached
  blockHeight?: number;      // Block height (if confirmed)
}
```

## Usage Examples

### Check if Transaction is Cached
```typescript
const tx = getCachedTransaction('abc123...');
if (tx) {
  // Use cached data
} else {
  // Fetch from API
}
```

### Cache a Transaction
```typescript
// Automatically determines if confirmed or unconfirmed
await cacheTransaction(txid, transactionData);
```

### Batch Cache Transactions
```typescript
// Efficient bulk caching
await cacheTransactions([tx1, tx2, tx3, ...]);
```

### Get Cache Statistics
```typescript
const stats = getCacheStats();
console.log(`Cache contains ${stats.confirmedCount} confirmed transactions`);
```

### Clear Cache (if needed)
```typescript
// Clear only unconfirmed (force refresh of pending txs)
await clearUnconfirmedCache();

// Clear everything (use with caution)
await clearAllCache();
```

## Testing

To verify the cache is working:

1. **First Load**: Check logs for cache misses
   ```
   📦 Cache MISS: abc123...
   💾 Cached CONFIRMED transaction: abc123... (block: 820456)
   ```

2. **Second Load**: Check logs for cache hits
   ```
   📦 Cache HIT (confirmed): abc123...
   📦 Transaction cache: 127 confirmed, 3 unconfirmed
   📦 Cache performance: 127 hits, 3 misses (97% hit rate)
   ```

3. **Monitor API Calls**: Should see dramatic reduction in `/address/{address}/txs` calls

## Future Enhancements

Potential improvements for the future:

1. **Cache Pruning**: Automatically remove very old confirmed transactions (e.g., >1 year)
2. **Cache Size Limits**: Implement LRU eviction if cache grows too large
3. **Selective Caching**: Only cache transactions for active wallets
4. **Background Sync**: Periodically check unconfirmed transactions in background
5. **Cache Compression**: Compress transaction data to save storage space

## Technical Notes

### Why 2 Minutes for Unconfirmed?
- Balances freshness with performance
- Unconfirmed transactions can be replaced (RBF) or dropped
- 2 minutes is long enough to avoid excessive API calls
- Short enough to catch status changes reasonably quickly

### Why Permanent for Confirmed?
- Confirmed transactions are immutable on the blockchain
- Block data never changes once confirmed
- No reason to ever re-fetch confirmed transaction data
- Saves bandwidth and improves performance

### Cache Invalidation Strategy
The cache uses a "smart invalidation" approach:
- Unconfirmed transactions expire after 2 minutes
- When re-fetched, if now confirmed, moved to permanent cache
- No manual invalidation needed - happens automatically
- Expired entries are pruned lazily (on access or periodic cleanup)

## Files Modified

1. **Created**: `services/transaction-cache-service.ts` (new file, 350+ lines)
2. **Modified**: `services/wallet-service.ts` (added cache integration)
3. **Modified**: `services/esplora-service.ts` (added transaction cache checks)

## Backward Compatibility

- ✅ Fully backward compatible
- ✅ No breaking changes to existing APIs
- ✅ Works transparently with existing code
- ✅ Cache is optional - app works fine if cache fails
- ✅ Graceful degradation if AsyncStorage unavailable

## Conclusion

This implementation provides a significant performance improvement by recognizing the immutable nature of confirmed blockchain transactions. The dual-tier caching system ensures data freshness for pending transactions while eliminating unnecessary API calls for confirmed transactions.

**Key Benefit**: Once a transaction is confirmed, it never needs to be fetched again! 🎉

