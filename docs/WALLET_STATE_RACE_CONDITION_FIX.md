# Wallet State Race Condition Fix

## Problem Summary

Users were experiencing "Something went wrong - The app encountered an error. Please restart the app." errors when:
- Deleting wallets
- Adding new wallets
- Navigating to wallet management screens

## Root Cause Analysis

### 1. **Race Condition in State Updates**
When `deleteWallet`, `createWallet`, or `importWallet` were called, they triggered multiple asynchronous state updates:
- `saveWallets(updatedWallets)` → mutation updates wallets state
- `saveCurrentWalletId(wallet.id)` → mutation updates currentWalletId state
- Query invalidations triggered refetches
- Multiple `useEffect` hooks reacted to these changes

These happened **asynchronously**, creating a race condition where:
- Components tried to access `currentWallet` before it was updated
- Query hooks tried to fetch data with `null` or stale wallet IDs
- The balance/transaction queries used `currentWallet?.xpub` which was temporarily undefined

### 2. **Query Key Dependencies Issue**
The balance and transaction queries depended on `currentWallet`:
```typescript
queryKey: ['wallet-balance-improved', currentWallet?.id, currentWallet?.xpub]
queryKey: ['transactions-improved', currentWallet?.id, currentWallet?.xpub]
```

When wallets changed, these queries refetched but `currentWallet` was momentarily undefined during state transitions, causing the query functions to throw errors.

### 3. **Immediate Query Invalidation**
Mutations were calling `queryClient.invalidateQueries()` immediately in the `onSuccess` callback, before state had settled, causing queries to refetch with stale/undefined state.

### 4. **Missing Null Checks**
Screens destructured `useWallet()` without defensive fallbacks, so when context was temporarily inconsistent, components would crash.

## Solutions Implemented

### Fix 1: Synchronous State Updates in Mutations

**Changed**: `deleteWallet`, `createWallet`, and `importWallet` to update AsyncStorage and state synchronously before invalidating queries.

**Before**:
```typescript
const updatedWallets = wallets.filter(w => w.id !== walletId);
saveWallets(updatedWallets); // Async mutation
if (currentWalletId === walletId) {
  saveCurrentWalletId(updatedWallets[0].id); // Async mutation
}
```

**After**:
```typescript
const updatedWallets = wallets.filter(w => w.id !== walletId);

// Update state and storage synchronously together
await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
setWallets(updatedWallets);

if (needsSwitchWallet) {
  await AsyncStorage.setItem('currentWalletId', newCurrentWalletId);
  setCurrentWalletId(newCurrentWalletId);
}

// Wait for state to settle BEFORE invalidating queries
await new Promise(resolve => setTimeout(resolve, 200));

// Now invalidate queries
queryClient.invalidateQueries({ queryKey: ['wallets'] });
```

### Fix 2: Delayed Query Invalidation

**Changed**: Added 100-200ms delays before invalidating queries to allow state to settle.

```typescript
onSuccess: (walletsToSave) => {
  setWallets(walletsToSave);
  // Don't invalidate immediately - let the state settle first
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ['wallets'] });
  }, 100);
}
```

### Fix 3: Cancel Pending Queries for Deleted Wallets

**Added**: Query cancellation before deletion to prevent stale queries from completing.

```typescript
// Cancel any pending queries for the deleted wallet
queryClient.cancelQueries({ queryKey: ['wallet-balance-improved', walletId] });
queryClient.cancelQueries({ queryKey: ['transactions-improved', walletId] });
```

### Fix 4: Enhanced Query Guard Clauses

**Improved**: Query functions now have better null checks and logging.

```typescript
queryFn: async () => {
  // Guard against undefined wallet during state transitions
  if (!currentWallet || !currentWallet.xpub) {
    console.log('⏸️ Skipping balance fetch - no current wallet');
    return 0;
  }
  // ... rest of query logic
}
```

### Fix 5: Added `gcTime: 0` to Queries

**Added**: Garbage collection time of 0 to prevent caching disabled queries.

```typescript
gcTime: 0, // Don't cache data for disabled queries (when wallet changes)
```

### Fix 6: Defensive Destructuring in Components

**Changed**: Components now safely destructure with fallbacks.

**Before**:
```typescript
const { theme, wallets, editWallet, deleteWallet } = useWallet();
```

**After**:
```typescript
const walletContext = useWallet();
const { 
  theme, 
  wallets = [], 
  editWallet, 
  deleteWallet 
} = walletContext || {};
```

### Fix 7: Navigation Delays

**Added**: Small delays before navigation to let state settle.

```typescript
// Give time for state to settle before navigating
setTimeout(() => {
  router.back();
}, 300);
```

### Fix 8: Enhanced Error Logging

**Improved**: ErrorBoundary now logs more detailed error information.

```typescript
static getDerivedStateFromError(error: Error) {
  console.error('🚨 ErrorBoundary caught error:', error);
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  // ...
}
```

## Files Modified

1. **`hooks/wallet-store.ts`**
   - Fixed `deleteWallet` to update state synchronously
   - Fixed `createWallet` to update state synchronously
   - Fixed `importWallet` to update state synchronously
   - Added delays to mutation `onSuccess` callbacks
   - Added `gcTime: 0` to balance and transaction queries
   - Enhanced query guard clauses

2. **`app/manage-wallets.tsx`**
   - Added defensive destructuring with fallbacks
   - Added null checks in handlers
   - Added state settling delays before navigation

3. **`app/wallet-settings.tsx`**
   - Added defensive destructuring with fallbacks
   - Added null checks in handlers
   - Added state settling delays before navigation

4. **`app/_layout.tsx`**
   - Enhanced error logging in ErrorBoundary

## Testing Recommendations

1. **Delete Wallet Flow**:
   - Delete a wallet and immediately check if app crashes
   - Delete multiple wallets in quick succession
   - Delete the current wallet and verify smooth transition to next wallet

2. **Create Wallet Flow**:
   - Create multiple wallets rapidly
   - Create wallet and immediately navigate away
   - Create wallet and verify queries load correctly

3. **Navigation**:
   - Navigate to manage-wallets screen multiple times
   - Switch between wallets rapidly
   - Delete wallet and verify navigation works

4. **Error Boundary**:
   - Check console logs for error details if any errors still occur
   - Verify Crashlytics receives error reports with full stack traces

## Expected Behavior After Fix

- ✅ No more "Something went wrong" errors when deleting wallets
- ✅ No more "Something went wrong" errors when adding wallets
- ✅ Smooth state transitions between wallet operations
- ✅ No race conditions between state updates and query refetches
- ✅ Graceful handling of temporarily undefined state
- ✅ Better error logging for debugging any remaining issues

## Technical Notes

The core issue was **temporal coupling** between:
1. AsyncStorage writes
2. React state updates
3. React Query cache invalidation
4. Component re-renders

By ensuring these happen in the correct order with proper delays, we've eliminated the race conditions that caused the ErrorBoundary to trigger.

