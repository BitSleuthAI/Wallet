# Address Prefetch Implementation

## Overview

This document describes the implementation of address data prefetching in the BitSleuth wallet to ensure instant loading of addresses when navigating to the "View Addresses" screen, following industry best practices from Electrum, BlueWallet, and Trust Wallet.

## Problem Statement

Previously, when users navigated to **Settings > Wallet Settings > View Addresses**, the addresses would be regenerated every time, causing a delay in displaying the address list. This was inconsistent with industry-standard Bitcoin wallets that show addresses instantly.

## Solution

Implemented background prefetching of address data in the `wallet-settings.tsx` screen using React Query's `prefetchQuery` API.

## Implementation Details

### Key Changes

1. **Modified `app/wallet-settings.tsx`**:
   - Added React Query client import: `useQueryClient`
   - Added `useEffect` hook to prefetch address data in the background
   - Prefetch runs 500ms after the wallet-settings screen loads
   - Uses the same query key as `wallet-addresses.tsx` for cache consistency

### How It Works

1. User navigates to **Settings > Wallet Settings**
2. After 500ms delay (to avoid blocking UI), background prefetch starts
3. Prefetch calls `generateAddressesForView` for both receiving and change addresses in parallel
4. Data is cached with query key: `['wallet-addresses-all-chains', currentWallet.id, currentWallet.xpub]`
5. Cache is valid for 5 minutes (`staleTime: 300000`)
6. When user clicks "View Addresses", React Query returns cached data instantly
7. No loading state is shown if data is in cache

### Benefits

- **Instant Address Loading**: Addresses appear immediately when user navigates to "View Addresses"
- **Consistent with Industry Standards**: Matches behavior of Electrum, BlueWallet, Trust Wallet
- **Non-Blocking**: Prefetch runs in background without affecting UI responsiveness
- **Cache-Efficient**: Leverages React Query's cache with proper TTL
- **Graceful Degradation**: If prefetch fails, regular loading still works

### Cache Strategy

- **Query Key**: `['wallet-addresses-all-chains', currentWallet.id, currentWallet.xpub]`
- **Stale Time**: 5 minutes (300000ms)
- **Garbage Collection Time**: 5 minutes (300000ms)
- **Refetch on Window Focus**: Disabled

### Code Flow

```
User on wallet-settings screen
  ↓
  500ms delay
  ↓
Prefetch starts (background)
  ↓
generateAddressesForView('receiving') ────┐
                                          ├→ Parallel execution
generateAddressesForView('change') ───────┘
  ↓
Combine & format data
  ↓
Store in React Query cache
  ↓
User clicks "View Addresses"
  ↓
Data loads instantly from cache ✅
```

### Service-Level Caching

The implementation also benefits from existing service-level caching:

1. **Address Metadata Cache** (`wallet-service.ts`):
   - Caches discovered addresses with TTL of 5 minutes
   - Prevents redundant blockchain queries
   - Key: xpub

2. **Address Cache Service** (`address-cache-service.ts`):
   - Caches per-address stats, UTXOs, and transaction IDs
   - Separate TTLs for different data types

### Testing

To test the implementation:

1. Navigate to **Settings > Wallet Settings**
2. Wait 1-2 seconds for prefetch to complete (check console logs)
3. Click "View Addresses"
4. Addresses should appear instantly without loading state

Expected console logs:
```
🚀 Prefetching address data in background...
🔍 Background prefetch: Generating addresses for both chains...
✅ Background prefetch complete: X receiving, Y change addresses
✅ Address data prefetched successfully
```

### Compatibility

- Works on both iOS and Android
- Compatible with all wallet types (segwit-native, etc.)
- No breaking changes to existing functionality

### Future Enhancements

Potential improvements:
1. Prefetch from home screen when wallet is selected
2. Invalidate cache on transaction broadcast
3. Background sync at app startup
4. Progressive loading for large address sets

## References

- Industry wallets analyzed: Electrum, BlueWallet, Trust Wallet
- React Query documentation: https://tanstack.com/query/latest
- BIP44 gap limit standard: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
