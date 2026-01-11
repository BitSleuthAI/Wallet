# Testing Guide for Rate Limiting Changes

## Overview

This guide helps verify that the rate limiting implementation works correctly and doesn't break existing functionality.

## Pre-Testing Checklist

Before testing, ensure:
- [ ] All code changes have been reviewed
- [ ] Documentation has been read (`docs/API_RATE_LIMITING.md`)
- [ ] Test environment is ready (iOS simulator or Android emulator)
- [ ] Internet connectivity is available

## Test Categories

### 1. Balance Fetching ✅

**Test:** Wallet balance updates correctly

**Steps:**
1. Open the app
2. Create or import a wallet with existing balance
3. Wait for sync to complete
4. Verify balance is displayed correctly

**Expected:**
- Balance loads within 10-15 seconds
- No 429 errors in console
- Cache hits logged for subsequent checks
- Queue stats show controlled request flow

**Console Logs to Look For:**
```
🔄 Trying https://blockstream.info/api for /address/{address} (queue: 2, active: 3)
⏱️ Rate limiting: waiting 250ms before next request
✅ Success from https://blockstream.info/api
📦 Cache hit for: /address/{address}
```

### 2. Transaction History ✅

**Test:** Transaction list displays correctly

**Steps:**
1. Navigate to transaction history
2. Verify all transactions are shown
3. Pull to refresh
4. Check transaction details

**Expected:**
- All transactions load (may take 15-20s for wallets with many txs)
- Rate limiting logs appear between requests
- Cached transactions load instantly on subsequent views
- No duplicate transactions

**Console Logs to Look For:**
```
📜 Getting transactions for: {address}...
📦 Address txs cache hit for {address}: X txs
✅ Dynamic fee estimates fetched: {...}
```

### 3. UTXO Management ✅

**Test:** Coin control shows correct UTXOs

**Steps:**
1. Navigate to Coin Control screen
2. Verify all UTXOs are listed
3. Check UTXO status (confirmed/frozen)
4. Refresh UTXO list

**Expected:**
- All UTXOs display correctly
- Values and confirmations are accurate
- Refresh works without errors
- Rate limiting respects 250ms delays

**Console Logs to Look For:**
```
💰 Getting UTXOs for: {address}...
📦 Address UTXOs cache hit for {address} (X)
✅ UTXOs fetched from esplora-service cache-aware layer: X
```

### 4. Address Discovery ✅

**Test:** Address generation and gap limit work correctly

**Steps:**
1. Create a new wallet
2. Import a wallet with used addresses
3. Verify gap limit is respected (20 addresses)
4. Check unused addresses are generated

**Expected:**
- Address discovery completes in 30-60s (depends on wallet history)
- Gap limit works correctly (stops after 20 unused)
- Rate limiting controls request flow (3 concurrent)
- No 429 errors during discovery

**Console Logs to Look For:**
```
🔍 Checking batch 0-19 (20 addresses)
⏱️ Rate limiting: waiting 250ms before next request
✅ Address 5: X transactions
📊 Processing address X/Y: {address}...
```

### 5. Sending Bitcoin ✅

**Test:** Transaction creation and signing work correctly

**Steps:**
1. Navigate to Send screen
2. Enter recipient address and amount
3. Select fee rate
4. Review transaction
5. Sign and broadcast

**Expected:**
- Transaction creation completes within 3-5s
- Fee estimation works correctly
- Signing uses correct private keys
- Broadcast succeeds (or shows clear error)
- Rate limiting doesn't block critical operations

**Console Logs to Look For:**
```
📤 Sending transaction...
🔧 Creating transaction with X inputs
🔐 Signing transaction with private keys...
✅ Transaction created: {hex}...
📡 Broadcasting transaction to Blockstream...
✅ Transaction broadcasted successfully: {txid}
```

### 6. Fee Estimation ✅

**Test:** Fee rates are fetched and displayed correctly

**Steps:**
1. Go to Send screen
2. Check fee rate options (Fast, Medium, Slow, Economy)
3. Verify fee amounts are reasonable
4. Test manual fee rate input

**Expected:**
- Fee rates load within 2-3s
- Multiple priority options available
- Rates reflect current network conditions
- Rate limiting applied (250ms between fee API calls)

**Console Logs to Look For:**
```
📊 Fetching recommended fees from Mempool.space...
✅ Mempool.space recommended fees: {...}
✅ Dynamic fee estimates fetched: {...}
```

## Monitoring During Tests

### Request Queue Statistics

Check queue health during operations:

```typescript
import { getRequestQueueStats } from './services/esplora-service';

// During wallet sync
const stats = getRequestQueueStats();
console.log('Queue:', stats.queueLength, 'Active:', stats.activeRequests);
```

**Expected Values:**
- Queue length: 0-10 (varies during sync)
- Active requests: 0-5 (max 5 concurrent)

### API Statistics

Monitor API performance:

```typescript
import { getApiStats } from './services/esplora-service';

// After wallet sync
const stats = getApiStats();
console.log('Total requests:', stats.totalRequests);
console.log('Cache hits:', stats.cacheHits, `(${(stats.cacheHits/stats.totalRequests*100).toFixed(1)}%)`);
console.log('Rate limit hits:', stats.rateLimitHits);
console.log('Errors:', stats.errors);
```

**Expected Values:**
- Cache hit rate: >50% (after first sync)
- Rate limit hits: 0-2 (should be rare)
- Errors: 0-1 (transient network errors acceptable)

## Performance Benchmarks

### Wallet Sync Performance

| Wallet Type | Addresses | Txs | Expected Time | Acceptable Range |
|-------------|-----------|-----|---------------|------------------|
| Empty wallet | 20 | 0 | 8-10s | 5-15s |
| Light use | 50 | 10 | 12-18s | 10-25s |
| Moderate use | 100 | 50 | 25-35s | 20-45s |
| Heavy use | 200 | 100+ | 45-60s | 40-80s |

**Notes:**
- Times assume good internet connection
- Rate limiting adds predictable overhead (~250ms per request)
- Cache significantly improves subsequent syncs

### Rate Limiting Verification

**Test 5 Sequential Requests:**
```bash
npx ts-node scripts/test-rate-limiting.ts
```

**Expected Output:**
```
✅ All requests completed in 1000-1500ms
📊 Expected minimum: 1000ms (4 delays × 250ms)
✅ Rate limiting is working correctly!
```

## Common Issues and Solutions

### Issue: 429 Rate Limit Errors

**Symptoms:**
- Frequent "Rate limited" messages
- Failed requests
- Slow sync times

**Solutions:**
- Check queue stats - may be exceeding concurrency
- Verify 250ms delay is being enforced
- Ensure request queue is being used for all API calls

**Debugging:**
```typescript
const stats = getApiStats();
console.log('Rate limit hits:', stats.rateLimitHits);
// Should be near zero with proper implementation
```

### Issue: Slow Sync Times

**Symptoms:**
- Wallet sync takes >2x expected time
- Queue length stays high
- Requests seem to be waiting unnecessarily

**Solutions:**
- Check network connectivity
- Verify cache is working (high cache hit rate)
- Ensure concurrent workers aren't too low

**Debugging:**
```typescript
const stats = getApiStats();
console.log('Cache hit rate:', (stats.cacheHits / stats.totalRequests * 100).toFixed(1) + '%');
// Should be >50% after first sync
```

### Issue: Missing Transactions

**Symptoms:**
- Some transactions don't appear
- Balance is incorrect
- Gap limit seems wrong

**Solutions:**
- Check gap limit is set to 20
- Verify cache isn't stale
- Clear address cache and resync

**Debugging:**
```typescript
import { clearAddressCache } from './services/wallet-service';
clearAddressCache(); // Clears all cached addresses
// Then resync wallet
```

### Issue: Cache Not Working

**Symptoms:**
- API calls on every screen view
- No cache hit logs
- Poor performance

**Solutions:**
- Check AsyncStorage is available
- Verify cache TTLs are set correctly
- Clear and rebuild cache

**Debugging:**
```typescript
const stats = getApiStats();
console.log('Cache hits:', stats.cacheHits);
console.log('Cache misses:', stats.cacheMisses);
// Ratio should favor cache hits after first sync
```

## Test Results Template

Use this template to record test results:

```markdown
## Test Run: [Date/Time]

### Environment
- Platform: [iOS/Android]
- Version: [App version]
- Network: [WiFi/4G/5G]

### Test 1: Balance Fetching
- Status: ✅ / ❌
- Time: [X]s
- Cache hit rate: [X]%
- Issues: [None / Description]

### Test 2: Transaction History
- Status: ✅ / ❌
- Txs loaded: [X]
- Time: [X]s
- Issues: [None / Description]

### Test 3: UTXO Management
- Status: ✅ / ❌
- UTXOs loaded: [X]
- Time: [X]s
- Issues: [None / Description]

### Test 4: Address Discovery
- Status: ✅ / ❌
- Addresses checked: [X]
- Time: [X]s
- Issues: [None / Description]

### Test 5: Sending Bitcoin
- Status: ✅ / ❌
- Broadcast: ✅ / ❌
- TXID: [X]
- Issues: [None / Description]

### Test 6: Fee Estimation
- Status: ✅ / ❌
- Time: [X]s
- Rates: Fast=[X], Medium=[X], Slow=[X]
- Issues: [None / Description]

### Statistics Summary
- Total requests: [X]
- Cache hits: [X] ([X]%)
- Rate limit hits: [X]
- Errors: [X]
- Queue max length: [X]

### Overall Result: ✅ / ❌
```

## Acceptance Criteria

All tests must pass with:
- ✅ Zero critical errors
- ✅ Balance displays correctly
- ✅ All transactions visible
- ✅ UTXOs load correctly
- ✅ Address discovery works with gap limit
- ✅ Transactions can be sent successfully
- ✅ Fee estimation works reliably
- ✅ Rate limiting enforced (250ms delays)
- ✅ Cache hit rate >50% after first sync
- ✅ Rate limit hits <5 during normal operation
- ✅ No 429 errors under normal usage

## Conclusion

After completing all tests:
1. Fill out test results template
2. Review any issues found
3. Verify all acceptance criteria are met
4. Document any unexpected behavior
5. Report results to team
