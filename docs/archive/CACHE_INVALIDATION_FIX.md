# Cache Invalidation Fix for Physical Devices

## Problem Statement

The BitSleuth Wallet app was experiencing a caching issue where balance, transactions, UTXOs, and wallet addresses would update correctly in the simulator but fail to update on physical devices.

## Root Cause Analysis

### Why Simulator Worked
When building and running in the simulator, each new build would:
1. Clear all app data (including AsyncStorage)
2. Start with fresh caches
3. Fetch current blockchain data
4. Display accurate wallet information

### Why Physical Devices Failed
On physical devices:
1. App version stayed the same between installs (`1.1.6` from `app.json`)
2. Caches persisted in AsyncStorage across app restarts
3. Old cache invalidation logic only triggered on **version change**
4. Result: Stale cached data never refreshed, showing outdated information

### Technical Details

The original cache invalidation logic (lines 246-297 in `wallet-store.ts`):
```typescript
const isAppUpdate = storedVersion !== null && storedVersion !== currentVersion;
if (isAppUpdate) {
  // Clear caches...
}
```

This only cleared caches when the app version changed, which:
- ✅ Works on simulator (each build = new install)
- ❌ Fails on physical devices (version stays constant)

## Solution

### 1. Fresh Launch Detection
Added timestamp-based fresh launch detection:

```typescript
const lastLaunchTimestamp = await AsyncStorage.getItem('last_launch_timestamp');
const timeSinceLastLaunch = lastLaunchTimestamp 
  ? Date.now() - parseInt(lastLaunchTimestamp, 10)
  : Infinity;
const isFreshLaunch = timeSinceLastLaunch > 5 * 60 * 1000; // More than 5 minutes
```

Now caches clear on:
- App version changes (original behavior)
- Fresh launches after 5+ minutes of inactivity (new behavior)

### 2. Reduced Cache TTLs
Shortened cache time-to-live values in `address-cache-service.ts`:

| Cache Type | Before | After | Reason |
|-----------|--------|-------|--------|
| TxIDs | 10 min | 2 min | Faster transaction updates |
| Stats | 10 min | 2 min | Faster balance updates |
| UTXOs | 2 hours | 2 min | Faster UTXO state updates |

### 3. Empty UTXO Cache Handling
Enhanced empty UTXO detection in `getCachedAddressUTXOs`:

```typescript
if (Array.isArray(data) && data.length === 0) {
  console.log(`🚫 Empty UTXO cache found, returning null to fetch fresh data`);
  await AsyncStorage.removeItem(KEY_UTXOS(address));
  return null; // Force fresh fetch
}
```

### 4. React Query Configuration
Updated React Query settings for wallet data:

| Setting | Before | After | Impact |
|---------|--------|-------|--------|
| `staleTime` | 15 min | 2 min | Data refreshes more frequently |
| `refetchOnMount` | false | true | Always fetch on screen load |
| `refetchOnReconnect` | true | true | Fetch after network reconnect |

## Files Changed

1. **`hooks/wallet-store.ts`**
   - Added fresh launch detection logic
   - Updated React Query configuration for balance and transactions
   - Added `last_launch_timestamp` tracking

2. **`services/address-cache-service.ts`**
   - Reduced cache TTLs from minutes/hours to 2 minutes
   - Enhanced empty UTXO cache detection
   - Improved cache expiration logging

3. **`scripts/test-cache-invalidation.js`** (new)
   - Automated tests for cache invalidation logic
   - Validates 5 key scenarios
   - All tests passing ✅

## Testing

### Automated Tests
Run: `node scripts/test-cache-invalidation.js`

Tests cover:
- ✅ First launch (no stored version)
- ✅ App version change
- ✅ Fresh launch (>5 min)
- ✅ Recent launch (2 min ago)
- ✅ Very recent launch (30 sec ago)

### Manual Testing on Physical Device

1. **Initial Setup**:
   ```
   - Install app on physical device
   - Create/import wallet
   - Verify initial data loads
   ```

2. **Test Fresh Launch**:
   ```
   - Use wallet (check balance, transactions)
   - Close app completely
   - Wait 6+ minutes
   - Reopen app
   - Expected: Fresh data fetch, logs show cache cleared
   ```

3. **Test Recent Launch**:
   ```
   - Use wallet
   - Close app
   - Wait 1-2 minutes
   - Reopen app
   - Expected: Uses cached data, faster load
   ```

4. **Test Network Reconnect**:
   ```
   - Turn off WiFi/cellular
   - Open app (shows cached data)
   - Turn on network
   - Expected: Automatically refetches fresh data
   ```

## Expected Behavior

### Before Fix
- Simulator: ✅ Always fresh data
- Physical Device: ❌ Stale cached data persists indefinitely

### After Fix
- Simulator: ✅ Always fresh data
- Physical Device (fresh launch >5 min): ✅ Fresh data
- Physical Device (recent launch <5 min): ✅ Fast cached data

## Performance Considerations

### Benefits
1. **Better User Experience**: Always shows current wallet state
2. **Network Reconnect**: Automatically updates after offline period
3. **Balance Performance**: Still benefits from 2-minute cache between frequent checks
4. **API Rate Limits**: 2-minute cache prevents excessive API calls

### Trade-offs
1. **More Network Calls**: Reduced from 10-15 min to 2 min cache
2. **Battery Impact**: Minimal - only fetches on mount and reconnect
3. **Data Usage**: Slight increase, but Bitcoin data is small

## Monitoring

Check logs for cache behavior:
```
🔄 Fresh app launch detected (time since last launch: 360 seconds)
🧹 Clearing all cached wallet data to ensure fresh sync...
✅ All wallet data caches cleared - fresh data will be loaded
```

Or for cached data:
```
✅ Recent launch - using cached data (time since last: 45 seconds)
```

## Future Improvements

Consider these enhancements in future updates:

1. **Adaptive TTLs**: Adjust cache duration based on transaction activity
2. **Background Sync**: Periodically update caches in background
3. **User Preference**: Let users configure refresh frequency
4. **Smart Invalidation**: Invalidate specific caches based on blockchain events
5. **Metrics**: Track cache hit rates and API call frequency

## Backward Compatibility

This fix is fully backward compatible:
- No changes to data structures
- No changes to AsyncStorage keys
- Gracefully handles missing `last_launch_timestamp`
- Works with all existing wallet data

## Security Implications

No security impact:
- Cache clearing is transparent to user
- No private keys or sensitive data exposed
- Network calls still use HTTPS
- Same API endpoints as before

## References

- Issue: App doesn't update balance/transactions on physical devices
- Related Files:
  - `hooks/wallet-store.ts` - Main wallet state management
  - `services/address-cache-service.ts` - Address-level caching
  - `services/esplora-service.ts` - Blockchain API service
  - `services/transaction-cache-service.ts` - Transaction caching

## Questions or Issues?

If you encounter any issues with cache invalidation:

1. Check console logs for cache-related messages
2. Verify `last_launch_timestamp` is being set
3. Confirm device time is correct (affects timestamp calculation)
4. Run automated tests: `node scripts/test-cache-invalidation.js`
5. Try manual cache clear: Settings → Clear Cache (if available)
