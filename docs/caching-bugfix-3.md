# Transaction Caching Bug Fix #3 - Address Isolation

## Date
October 9, 2025

## Bug Fixed

### Bug: Global Cache Causes Cross-Address Transaction Contamination
**Location**: `services/esplora-service.ts` lines 235-248

**Problem**: 
The bulk transaction merging logic for address queries used a global cache of transaction IDs (`getCachedTransactionIds()`), which returns ALL cached transaction IDs from all addresses in the wallet. This caused transactions from other addresses to be incorrectly merged into the current address's result, leading to mixed transaction data.

**Root Cause**:
```typescript
// BEFORE - Merges ALL cached transactions regardless of address
const allCachedTxs: any[] = [];
for (const txid of cachedTxIds) {
  const cached = getCachedTransaction(txid);
  if (cached && !data.find(tx => tx.txid === txid)) {
    allCachedTxs.push(cached);  // ❌ No address validation!
  }
}

if (allCachedTxs.length > 0) {
  console.log(`📦 Merged ${allCachedTxs.length} additional cached transactions`);
  return [...data, ...allCachedTxs];  // ❌ Returns transactions from other addresses!
}
```

**Example Scenario**:
```
Wallet has 2 addresses:
- Address A (bc1q...abc): 30 transactions
- Address B (bc1q...xyz): 20 transactions

User views Address A:
1. API returns 30 transactions for Address A
2. Cache has 50 transactions total (30 from A + 20 from B)
3. Old code checks global cache and finds 20 transactions NOT in API response
4. Merges those 20 transactions into Address A's result
5. ❌ Address A now shows 50 transactions (30 correct + 20 from Address B!)

Result: User sees transactions from Address B when viewing Address A
```

**Impact**:
- ❌ Incorrect transaction history displayed
- ❌ Wrong balance calculations
- ❌ Confusing UX (transactions appear on wrong addresses)
- ❌ Potential privacy concerns (address isolation broken)
- ❌ Data integrity issues

---

## Fix Implementation

**Solution**: Filter cached transactions by address ownership before merging.

```typescript
// AFTER - Only merges transactions that belong to the current address
const addressMatch = path.match(/^\/address\/([13]|bc1)[a-zA-HJ-NP-Z0-9]{25,62}\/txs/);
const currentAddress = addressMatch ? addressMatch[0].split('/')[2] : null;

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
        allCachedTxs.push(cached);  // ✅ Only add if address matches!
      }
    }
  }
}

if (allCachedTxs.length > 0) {
  console.log(`📦 Merged ${allCachedTxs.length} additional cached transactions for address`);
  return [...data, ...allCachedTxs];  // ✅ Only returns transactions for current address
}
```

**How It Works**:
1. Extract the current address from the API path (`/address/{address}/txs`)
2. For each cached transaction, check if it belongs to the current address by:
   - Checking if the address appears in any transaction input (`vin`)
   - Checking if the address appears in any transaction output (`vout`)
3. Only merge cached transactions that pass the address ownership check

---

## Expected Behavior After Fix

### Scenario 1: Multi-Address Wallet
```
Wallet has 2 addresses:
- Address A (bc1q...abc): 30 transactions (28 confirmed, 2 unconfirmed)
- Address B (bc1q...xyz): 20 transactions (all confirmed)

User views Address A:
1. API returns 30 transactions for Address A
2. Cache has 50 transactions total (30 from A + 20 from B)
3. New code filters cache to only Address A's transactions
4. Finds 0 additional transactions (all 30 are in API response)
5. ✅ Returns 30 transactions (all belong to Address A)

User views Address B:
1. API returns 20 transactions for Address B
2. Cache has 50 transactions total (30 from A + 20 from B)
3. New code filters cache to only Address B's transactions
4. Finds 0 additional transactions (all 20 are in API response)
5. ✅ Returns 20 transactions (all belong to Address B)
```

### Scenario 2: Cache Contains Older Transactions
```
Address A has 100 transactions total, but API only returns most recent 50

User views Address A:
1. API returns 50 most recent transactions
2. Cache has 100 transactions for Address A (from previous full sync)
3. New code filters cache to only Address A's transactions
4. Finds 50 additional transactions NOT in API response
5. Checks each transaction to ensure it belongs to Address A
6. ✅ Returns 100 transactions (50 from API + 50 from cache, all for Address A)
```

### Scenario 3: Shared Transaction (Sent from A to B)
```
Transaction abc123 sends funds from Address A to Address B (both in same wallet)

User views Address A:
1. API returns transaction abc123 (Address A is sender)
2. Cache has transaction abc123
3. belongsToAddress check: Address A appears in vin (inputs) ✅
4. ✅ Transaction included in Address A's results

User views Address B:
1. API returns transaction abc123 (Address B is receiver)
2. Cache has transaction abc123
3. belongsToAddress check: Address B appears in vout (outputs) ✅
4. ✅ Transaction included in Address B's results

Result: Both addresses correctly show the transaction (as expected for internal transfers)
```

---

## Code Changes Summary

### File: `services/esplora-service.ts`

**Lines 235-265** (Bug Fix):
- Extract current address from API path
- Filter cached transactions by address ownership
- Check both inputs (vin) and outputs (vout) for address matches
- Only merge transactions that belong to the current address
- Updated log message to clarify address-specific merging

---

## Testing Checklist

- [x] Single address wallet: transactions display correctly
- [x] Multi-address wallet: each address shows only its own transactions
- [x] Internal transfers: shared transactions appear on both addresses
- [x] Cache merging: only address-specific cached transactions are merged
- [x] No cross-contamination: Address A never shows Address B's transactions
- [x] Balance calculations: accurate for each address
- [x] No linter errors

---

## Performance Impact

### Before Fix
```
Multi-address wallet (3 addresses, 50 txs each):
- View Address A: Returns 150 transactions ❌ (50 correct + 100 wrong)
- View Address B: Returns 150 transactions ❌ (50 correct + 100 wrong)
- View Address C: Returns 150 transactions ❌ (50 correct + 100 wrong)
```

### After Fix
```
Multi-address wallet (3 addresses, 50 txs each):
- View Address A: Returns 50 transactions ✅ (all correct)
- View Address B: Returns 50 transactions ✅ (all correct)
- View Address C: Returns 50 transactions ✅ (all correct)
```

**Result**: 
- ✅ 100% accuracy (no cross-contamination)
- ✅ Correct transaction counts per address
- ✅ Proper address isolation
- ✅ Minimal performance overhead (address filtering is fast)

---

## Security & Privacy Implications

### Before Fix
- ❌ Address isolation broken
- ❌ Transactions from one address visible on another
- ❌ Privacy leak: viewing Address A reveals Address B's activity
- ❌ Potential for incorrect spending decisions (wrong balance)

### After Fix
- ✅ Address isolation maintained
- ✅ Each address shows only its own transactions
- ✅ Privacy preserved: addresses remain independent
- ✅ Accurate balance calculations per address

---

## Conclusion

This fix ensures proper address isolation in the transaction caching system. By validating that cached transactions actually belong to the requested address before merging them, we prevent cross-contamination of transaction data between different addresses in the same wallet.

The fix is critical for:
1. **Data Integrity**: Each address shows only its own transactions
2. **Privacy**: Address activity remains isolated
3. **Accuracy**: Balance calculations are correct per address
4. **User Trust**: Users can rely on the displayed transaction history

The implementation adds minimal overhead (simple address matching) while providing significant correctness and security benefits.

