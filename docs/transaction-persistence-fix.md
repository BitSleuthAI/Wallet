# Transaction and Address Persistence Fix

## Problem
Transactions and wallet addresses were not persisting when switching between wallets. Every time a user switched wallets using the wallet cards:
1. Transaction history would clear and need to be re-fetched from the blockchain API
2. Address lists in the "View Addresses" screen would clear and need to be regenerated
3. Generated addresses would not persist when switching back to a wallet

## Root Causes

### 1. React Query Cache Garbage Collection (`gcTime: 0` or missing)
The transaction, balance, and address queries had `gcTime: 0` or no `gcTime` setting, which meant React Query would immediately discard cached data when a query became disabled (i.e., when switching away from a wallet).

**Locations:**
- `hooks/wallet-store.ts`:
  - Line 429: `balanceQuery` had `gcTime: 0`
  - Line 473: `transactionsQuery` had `gcTime: 0`
  - Line 200: `walletsQuery` had no `gcTime` setting (defaulted to 5 minutes)
- `app/wallet-addresses.tsx`:
  - Line 79: `addressesQuery` had no `gcTime` setting (defaulted to 5 minutes)

### 2. Aggressive Query Invalidation on Wallet Switch
When switching wallets, the code was invalidating ALL wallet queries without specifying wallet IDs, causing the cache for all wallets to be cleared.

**Location:** `hooks/wallet-store.ts` - `saveCurrentWalletIdMutation`
- Lines 503-504: Invalidating all `wallet-balance-improved` and `transactions-improved` queries

### 3. Aggressive Cache Clearing on Refresh
The `refreshData` function was calling `queryClient.clear()`, which cleared ALL cached data including transaction history for all wallets.

**Location:** `hooks/wallet-store.ts` - `refreshData` function
- Line 931: `queryClient.clear()` was too aggressive

## Solutions Implemented

### 1. Increased `gcTime` for All Wallet-Specific Queries
Changed `gcTime` from `0` to `300000` (5 minutes) for balance, transaction, and address queries. Set `gcTime` to `Infinity` for the wallets query since wallet data should always be available.

```typescript
// Balance and Transaction Queries
// Before
gcTime: 0, // Don't cache data for disabled queries (when wallet changes)

// After
gcTime: 300000, // Keep cached data for 5 minutes even when query is disabled (wallet switching)

// Wallets Query
// Before
// No gcTime setting (defaulted to 5 minutes)

// After
staleTime: Infinity, // Wallets data is always fresh from AsyncStorage
gcTime: Infinity, // Keep wallets in cache indefinitely

// Address Query (wallet-addresses.tsx)
// Before
// No gcTime setting (defaulted to 5 minutes)

// After
staleTime: 300000, // 5 minutes - consider data fresh
gcTime: 300000, // 5 minutes - keep cached data even when query is disabled (wallet switching)
```

### 2. Removed Unnecessary Query Invalidation
Removed the blanket invalidation of all wallet queries when switching wallets. React Query will automatically handle refetching based on the `enabled` state.

```typescript
// Before
queryClient.invalidateQueries({ queryKey: ['wallet-balance-improved'] });
queryClient.invalidateQueries({ queryKey: ['transactions-improved'] });

// After
// Don't invalidate all wallet queries - let React Query handle cache based on enabled state
// The queries will automatically refetch when enabled for the new wallet
```

### 3. Made Refresh Less Aggressive
Changed `refreshData` to only invalidate queries instead of clearing the entire cache, preserving transaction history for all wallets.

```typescript
// Before
queryClient.clear(); // Clears ALL cached data

// After
queryClient.invalidateQueries({ queryKey: ['wallet-balance-improved'] });
queryClient.invalidateQueries({ queryKey: ['transactions-improved'] });
queryClient.invalidateQueries({ queryKey: ['bitcoin-price-improved'] });
```

## How It Works Now

### Transactions and Balance
1. **First Load**: When a wallet is first selected, transactions and balance are fetched from the blockchain and cached in React Query
2. **Switching Away**: When switching to another wallet, the previous wallet's data remains in the cache for 5 minutes
3. **Switching Back**: When switching back to a previously viewed wallet, the cached data is immediately displayed while fresh data is fetched in the background
4. **Stale Data**: Data is considered stale after 3 minutes (`staleTime: 180000`), triggering a background refetch
5. **Cache Expiry**: Cached data is completely removed after 5 minutes of inactivity (`gcTime: 300000`)

### Wallet Addresses
1. **Wallet Data**: Wallet addresses are stored in the wallet object in AsyncStorage and persist indefinitely
2. **Address Details**: When viewing the address list, detailed address information (balance, tx count, usage status) is fetched from the blockchain and cached for 5 minutes
3. **Switching Wallets**: Address details remain cached for 5 minutes, so switching back shows cached data immediately
4. **New Address Generation**: New addresses are added to the wallet object and saved to AsyncStorage, persisting across wallet switches

## Benefits

- **Instant Display**: Transaction history and address lists appear immediately when switching between wallets
- **Reduced API Calls**: Fewer requests to blockchain APIs, reducing rate limiting issues
- **Better UX**: Smoother wallet switching experience with no loading states
- **Persistent Cache**: 
  - Transaction cache service stores confirmed transactions permanently in AsyncStorage
  - Wallet addresses persist in AsyncStorage as part of the wallet object
  - Address metadata (balance, tx count) cached for quick retrieval
- **Consistent Behavior**: All wallet-specific data (transactions, balance, addresses) now uses the same caching strategy

## Testing Recommendations

### Transaction Persistence
1. Create multiple wallets with transactions
2. Switch between wallets and verify transactions persist
3. Wait 3 minutes and verify background refetch occurs
4. Wait 5 minutes and verify cache expires as expected
5. Use pull-to-refresh and verify it doesn't clear other wallets' data

### Address Persistence
1. Generate new addresses in one wallet
2. Switch to another wallet
3. Switch back and verify generated addresses are still there
4. View the address list for a wallet
5. Switch to another wallet and back
6. Verify the address list displays immediately with cached data
7. Generate a new address and verify it persists after switching wallets

## Files Modified

1. **hooks/wallet-store.ts**
   - Added `gcTime: 300000` to `balanceQuery` (line 429)
   - Added `gcTime: 300000` to `transactionsQuery` (line 473)
   - Added `staleTime: Infinity` and `gcTime: Infinity` to `walletsQuery` (lines 206-207)
   - Removed blanket query invalidation in `saveCurrentWalletIdMutation` (lines 503-505)
   - Changed `refreshData` to use specific query invalidation instead of `queryClient.clear()` (lines 930-934)

2. **app/wallet-addresses.tsx**
   - Added `gcTime: 300000` to `addressesQuery` (line 115)

