# Automatic Data Refresh on App Updates

## Overview

The BitSleuth Wallet implements automatic version tracking and data refresh to ensure users always see accurate, up-to-date wallet information after updating the app to a new version.

## Problem Solved

Previously, when users updated the app from one version to another (e.g., from 1.1.5 to 1.1.6), cached wallet data would persist and prevent fresh data from being fetched from the blockchain. This caused:

- Stale balance information
- Missing or outdated transactions
- Incorrect address information
- Outdated UTXO data

## Solution

The app now tracks the installed version and automatically clears all cached data when it detects a version change.

## How It Works

### Version Tracking

The app stores the current version in AsyncStorage under the key `app_version`. On each app launch:

1. **Retrieve Current Version**: Gets the version from `expo-constants` (e.g., "1.1.6")
2. **Retrieve Stored Version**: Gets the previously stored version from AsyncStorage
3. **Compare Versions**: Determines if the app was updated
4. **Update Stored Version**: Saves the current version for future comparisons

### Cache Clearing on Update

When an update is detected (stored version ≠ current version), the app performs a comprehensive cache clear:

1. **Address Cache**: Clears blockchain address discovery cache for all wallets
2. **UTXO Cache**: Clears UTXO (unspent transaction output) cache
3. **Transaction Cache**: Clears transaction history cache
4. **React Query Cache**: Clears all React Query caches (balance, transactions, etc.)

### Scenarios

#### First Launch
- **Stored Version**: `null`
- **Action**: Store current version, no cache clearing needed
- **Result**: Normal app initialization

#### Same Version (Normal Launch)
- **Stored Version**: "1.1.6"
- **Current Version**: "1.1.6"
- **Action**: No cache clearing
- **Result**: Use cached data for fast loading

#### App Update
- **Stored Version**: "1.1.5"
- **Current Version**: "1.1.6"
- **Action**: Clear all caches, update stored version
- **Result**: Fresh data fetched from blockchain

## Implementation Details

### Location
The version tracking logic is implemented in `hooks/wallet-store.ts` within the `initializeWallets()` function, which runs on app startup.

### Dependencies
- `expo-constants`: Provides access to app version from app.json
- `@react-native-async-storage/async-storage`: Stores version information
- Existing cache clearing functions from services

### Code Flow

```typescript
// Get current app version
const currentVersion = Constants.expoConfig?.version || '1.1.6';

// Get stored version
const storedVersion = await AsyncStorage.getItem('app_version');

// Detect update
const isAppUpdate = storedVersion !== null && storedVersion !== currentVersion;

if (isAppUpdate) {
  // Clear all caches
  await clearCacheForWalletXpub(wallet.xpub);
  clearAddressCache(wallet.xpub);
  await clearEmptyUTXOCaches();
  await clearAllCache();
  queryClient.clear();
}

// Update stored version
await AsyncStorage.setItem('app_version', currentVersion);
```

## Testing

A comprehensive test suite is provided in `scripts/test-version-tracking.js` that validates:

1. ✅ First launch detection
2. ✅ Same version detection
3. ✅ App update detection
4. ✅ Patch version updates (1.1.6 → 1.1.7)
5. ✅ Major version updates (1.1.6 → 2.0.0)

Run tests with:
```bash
node scripts/test-version-tracking.js
```

## Benefits

- **Automatic**: No user action required
- **Comprehensive**: Clears all types of cached data
- **Efficient**: Only clears on version change, not every launch
- **Reliable**: Uses version strings for precise detection
- **Future-proof**: Works for patch, minor, and major version updates

## Backward Compatibility

- Existing installations without a stored version will be treated as first launch
- No data loss occurs - only caches are cleared
- Wallet data (mnemonics, keys, settings) remains intact

## Console Logging

The implementation includes detailed console logging for debugging:

```
📱 Current app version: 1.1.6
💾 Stored app version: 1.1.5
🔄 App update detected! Old version: 1.1.5 → New version: 1.1.6
🧹 Clearing all cached wallet data to ensure fresh sync...
🧹 Clearing cache for wallet: My Wallet
✅ Empty UTXO caches cleared
✅ Transaction cache cleared
✅ React Query caches cleared
✅ All wallet data caches cleared - fresh data will be loaded
💾 Updated stored app version to: 1.1.6
```

## Future Enhancements

Potential improvements:
- Migration scripts for specific version transitions
- Selective cache clearing based on version changes
- User notification when data is being refreshed
- Analytics on cache clearing performance

## Related Files

- `hooks/wallet-store.ts` - Version tracking implementation
- `services/address-cache-service.ts` - Address cache clearing
- `services/transaction-cache-service.ts` - Transaction cache clearing
- `services/wallet-service.ts` - Wallet data management
- `scripts/test-version-tracking.js` - Test suite
- `app.json` - App version source
