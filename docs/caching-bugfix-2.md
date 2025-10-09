# Transaction Caching Bug Fix #2

## Date
October 9, 2025

## Bugs Fixed

### Bug 1: Individual Transaction Requests Bypass Cache
**Location**: `services/esplora-service.ts` lines 154-164

**Problem**: 
Individual transaction requests (`/tx/{txid}`) were checking the cache and returning cached data immediately, but the cache check logging was misleading. The code had redundant logging that suggested cache misses were happening when they weren't, and the flow was unnecessarily verbose.

**Root Cause**:
```typescript
// BEFORE - Verbose and misleading
let cachedTx = null;
if (txMatch) {
  const txid = txMatch[1];
  const { getCachedTransaction } = require('./transaction-cache-service');
  cachedTx = getCachedTransaction(txid);
  if (cachedTx) {
    console.log(`📦 Cache HIT for transaction: ${txid.substring(0, 8)}...`);
    return cachedTx;  // ✅ Actually returns cached data
  }
  console.log(`📦 Cache MISS for transaction: ${txid.substring(0, 8)}...`);
  // ❌ But this log was redundant - getCachedTransaction already logs misses
}
```

**Fix**:
```typescript
// AFTER - Clean and efficient
if (txMatch) {
  const txid = txMatch[1];
  const { getCachedTransaction } = require('./transaction-cache-service');
  const cachedTx = getCachedTransaction(txid);
  if (cachedTx) {
    // Return cached transaction immediately
    // getCachedTransaction already logs the cache hit
    return cachedTx;
  }
  // getCachedTransaction already logs the cache miss
}
```

**Impact**:
- ✅ Cleaner code - removed redundant logging
- ✅ Cache still works correctly (always did)
- ✅ Logging is now handled by the cache service itself
- ✅ No functional change - just cleanup

---

### Bug 2: Bulk Requests Cache Already-Cached Transactions
**Location**: `services/esplora-service.ts` lines 203-233

**Problem**: 
For bulk address transaction requests (`/address/{address}/txs`), the code was caching ALL transactions returned from the API, even if they were already in the cache. This caused:
1. Redundant cache writes for transactions that hadn't changed
2. Misleading log messages showing "Cached X transactions" when most were already cached
3. Unnecessary AsyncStorage writes
4. Inaccurate cache statistics

**Root Cause**:
```typescript
// BEFORE - Caches everything
const newTxs = data.filter(tx => !cachedTxIds.has(tx.txid));
const updatedTxs = data.filter(tx => cachedTxIds.has(tx.txid));

console.log(`📊 Bulk fetch result: ${data.length} from API (${updatedTxs.length} updates, ${newTxs.length} new)`);

// ❌ Caches ALL transactions, including ones already cached
await cacheTransactions(data);

if (newTxs.length > 0) {
  console.log(`💾 Cached ${newTxs.length} new transactions from address query`);
  // ❌ This log is misleading - we actually cached ALL transactions
}
```

**Example Scenario**:
```
Wallet has 50 transactions:
- 48 confirmed (already cached permanently)
- 2 unconfirmed (cache expired, need refresh)

API returns all 50 transactions
Old code: Caches all 50 → "💾 Cached 48 confirmed and 2 unconfirmed"
          ❌ Misleading! 48 were already cached

New code: Only caches 2 → "💾 Cached 0 confirmed and 2 unconfirmed"
          ✅ Accurate! Only new/updated transactions cached
```

**Fix**:
```typescript
// AFTER - Only caches new and updated transactions
const newTxs: any[] = [];
const updatedTxs: any[] = [];

for (const tx of data) {
  if (cachedTxIds.has(tx.txid)) {
    // Check if this is an update (unconfirmed → confirmed)
    const cached = getCachedTransaction(tx.txid);
    const isConfirmed = (tx.status?.confirmed === true) || 
                       (tx.status?.block_height !== undefined && tx.status?.block_height !== null);
    const wasUnconfirmed = cached && !cached.status?.confirmed;
    
    if (wasUnconfirmed && isConfirmed) {
      updatedTxs.push(tx);  // ✅ Only cache if status changed
    }
  } else {
    newTxs.push(tx);  // ✅ Cache if new
  }
}

console.log(`📊 Bulk fetch result: ${data.length} from API (${updatedTxs.length} updates, ${newTxs.length} new)`);

// ✅ Only cache new transactions and updated ones
const txsToCache = [...newTxs, ...updatedTxs];
if (txsToCache.length > 0) {
  await cacheTransactions(txsToCache);
}
```

**Impact**:
- ✅ Reduced AsyncStorage writes (only write when needed)
- ✅ Accurate logging (shows actual new/updated transactions)
- ✅ Better performance (no redundant cache operations)
- ✅ Correct cache statistics
- ✅ Properly detects unconfirmed → confirmed transitions

---

## Expected Behavior After Fix

### First Load (Cold Cache)
```
📦 Loading transaction cache from storage...
✅ Transaction cache loaded: 0 confirmed, 0 unconfirmed
🔄 Trying https://blockstream.info/api for /address/bc1q.../txs
✅ Success from https://blockstream.info/api for /address/bc1q.../txs
📊 Bulk fetch result: 50 from API (0 updates, 50 new)
💾 Cached 48 confirmed and 2 unconfirmed transactions
```

### Second Load (Warm Cache - 2 min later)
```
📦 Loading transaction cache from storage...
✅ Loaded 48 confirmed transactions from cache
✅ Loaded 0 unconfirmed transactions from cache (2 expired)
✅ Transaction cache loaded: 48 confirmed, 0 unconfirmed
🔄 Trying https://blockstream.info/api for /address/bc1q.../txs
✅ Success from https://blockstream.info/api for /address/bc1q.../txs
📊 Bulk fetch result: 50 from API (2 updates, 0 new)
💾 Cached 2 confirmed and 0 unconfirmed transactions
🔄 Moved transaction from unconfirmed to confirmed cache: abc123...
🔄 Moved transaction from unconfirmed to confirmed cache: def456...
```

### Third Load (All Cached)
```
📦 Loading transaction cache from storage...
✅ Loaded 50 confirmed transactions from cache
✅ Transaction cache loaded: 50 confirmed, 0 unconfirmed
🔄 Trying https://blockstream.info/api for /address/bc1q.../txs
✅ Success from https://blockstream.info/api for /address/bc1q.../txs
📊 Bulk fetch result: 50 from API (0 updates, 0 new)
```

### New Transaction Appears
```
📦 Loading transaction cache from storage...
✅ Loaded 50 confirmed transactions from cache
✅ Transaction cache loaded: 50 confirmed, 0 unconfirmed
🔄 Trying https://blockstream.info/api for /address/bc1q.../txs
✅ Success from https://blockstream.info/api for /address/bc1q.../txs
📊 Bulk fetch result: 51 from API (0 updates, 1 new)
💾 Cached 0 confirmed and 1 unconfirmed transactions
```

---

## Code Changes Summary

### File: `services/esplora-service.ts`

**Lines 154-164** (Bug 1 Fix):
- Removed redundant cache logging
- Simplified cache check logic
- Delegated logging to `getCachedTransaction()`

**Lines 203-233** (Bug 2 Fix):
- Added logic to detect transaction status changes
- Only cache new transactions and updated ones (unconfirmed → confirmed)
- Accurate logging of what was actually cached
- Reduced unnecessary AsyncStorage writes

---

## Testing Checklist

- [x] Individual transaction requests return cached data immediately
- [x] Cache miss logging is accurate (from cache service)
- [x] Bulk requests only cache new/updated transactions
- [x] Unconfirmed → confirmed transitions are detected
- [x] Cache statistics are accurate
- [x] AsyncStorage writes are minimized
- [x] No linter errors

---

## Performance Impact

### Before Fix
```
Load wallet with 50 transactions (48 confirmed, 2 unconfirmed):
- First load: 50 cache writes ✅
- Second load: 50 cache writes ❌ (48 redundant)
- Third load: 50 cache writes ❌ (50 redundant)
```

### After Fix
```
Load wallet with 50 transactions (48 confirmed, 2 unconfirmed):
- First load: 50 cache writes ✅
- Second load: 2 cache writes ✅ (only updated ones)
- Third load: 0 cache writes ✅ (nothing changed)
```

**Result**: ~96% reduction in redundant cache writes for typical usage!

---

## Conclusion

These fixes improve the accuracy and efficiency of the transaction caching system:
1. Cleaner code with proper separation of concerns
2. Accurate logging that reflects actual cache operations
3. Reduced AsyncStorage writes (better performance)
4. Correct detection of transaction status changes
5. More maintainable codebase

The caching system now provides accurate feedback about what's being cached and why, making it easier to debug and optimize in the future.

