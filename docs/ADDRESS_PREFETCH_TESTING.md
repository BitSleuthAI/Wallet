# Address Prefetch Testing Guide

## Overview
This guide provides step-by-step instructions for testing the address prefetching feature that ensures instant loading of addresses when navigating to the "View Addresses" screen.

## Test Environment Setup

### Prerequisites
- BitSleuth wallet installed on device or emulator
- At least one wallet created with transaction history
- Developer console access (for viewing logs)

### Enable Logging
To see the prefetch process in action, enable React Native debugging:
```bash
# For iOS
npx react-native log-ios

# For Android
npx react-native log-android
```

## Test Cases

### Test Case 1: First Time Navigation (Cold Cache)

**Steps:**
1. Launch the BitSleuth app
2. Navigate to **Settings** (bottom tab bar)
3. Tap on **Wallet Settings** card
4. Wait 1-2 seconds on the Wallet Settings screen
5. Observe console logs for prefetch activity
6. Tap on **View Addresses**

**Expected Results:**
- Console should show: `🚀 Prefetching address data in background...`
- Followed by: `✅ Background prefetch complete: X receiving, Y change addresses`
- When tapping "View Addresses", addresses should appear **instantly** without loading spinner
- No delay or "Generating addresses..." message

**Actual Behavior (Before Fix):**
- Loading spinner would appear
- "Generating addresses..." message displayed
- 2-5 second delay depending on number of addresses

---

### Test Case 2: Subsequent Navigation (Warm Cache)

**Steps:**
1. After completing Test Case 1, go back to Wallet Settings
2. Immediately tap on **View Addresses** again (before 5-minute cache expires)

**Expected Results:**
- Addresses appear **instantly**
- No console logs about generating addresses
- Data served from React Query cache
- No network requests made

---

### Test Case 3: Cache Expiration (After 5 Minutes)

**Steps:**
1. Navigate to Wallet Settings
2. Wait for prefetch to complete
3. Wait 6 minutes (cache TTL is 5 minutes)
4. Tap on **View Addresses**

**Expected Results:**
- Brief loading spinner may appear
- Addresses regenerated from blockchain
- Console logs show: `🔍 Cache miss or expired, performing address discovery...`
- After this, cache is refreshed for another 5 minutes

---

### Test Case 4: Multiple Wallet Switching

**Steps:**
1. Create or select Wallet A
2. Navigate to Wallet Settings
3. Wait for prefetch to complete
4. Go back to home screen
5. Switch to Wallet B (if available)
6. Navigate to Wallet Settings for Wallet B
7. Wait for prefetch
8. Tap on **View Addresses**

**Expected Results:**
- Each wallet has its own cached address data
- Query key includes wallet ID, so caches don't conflict
- Wallet B addresses appear instantly after prefetch
- Switching back to Wallet A still shows cached data (if within 5 minutes)

---

### Test Case 5: Network Failure Handling

**Steps:**
1. Enable airplane mode or disconnect from internet
2. Navigate to Wallet Settings (with fresh app launch)
3. Wait for prefetch attempt
4. Tap on **View Addresses**

**Expected Results:**
- Console shows: `⚠️ Background address prefetch failed (non-critical)`
- Regular loading flow kicks in
- User sees appropriate error message about network connectivity
- App doesn't crash

---

### Test Case 6: Tab Switching (Receiving ↔ Change)

**Steps:**
1. Navigate to View Addresses after prefetch completes
2. Addresses load instantly
3. Switch between "Receiving" and "Change" tabs

**Expected Results:**
- Tab switching is **instant**
- No loading spinner
- Data is pre-loaded for both tabs
- Console shows: `✅ Filtered X receiving/change addresses`

---

## Console Log Reference

### Successful Prefetch Flow
```
📦 Loading wallet service in wallet settings for platform: ios
📦 Wallet settings imported service keys: [...]
✅ Wallet service loaded successfully in wallet settings for ios
🚀 Prefetching address data in background...
🔍 Background prefetch: Generating addresses for both chains...
✅ Using cached address metadata (age: 10s)
✅ Filtered 15 receiving addresses
✅ Filtered 8 change addresses
✅ Background prefetch complete: 15 receiving, 8 change addresses
✅ Address data prefetched successfully
```

### When User Navigates to View Addresses (Cache Hit)
```
🔍 Address data filtering for receiving tab: { 
  totalSourceData: 23, 
  selectedTab: 'receiving', 
  queryLoading: false, 
  queryError: null 
}
✅ Filtered 15 receiving addresses
```

### Cache Miss (First Time or Expired)
```
🔍 Cache miss or expired, performing address discovery...
🔍 Starting address discovery for xpub: xpub6...
🔍 Checking external chain...
🔍 Checking batch 0-19 (20 addresses)
✅ Found used address at index 0: bc1q... (5 txs)
✅ Address discovery complete: 23 addresses found
```

## Performance Metrics

### Expected Performance
- **Prefetch Trigger**: 500ms after landing on Wallet Settings
- **Prefetch Duration**: 2-10 seconds (depends on number of addresses and network speed)
- **Address Screen Load Time**: < 100ms (instant from cache)
- **Tab Switch Time**: < 50ms

### Baseline (Before Fix)
- **Address Screen Load Time**: 2-5 seconds
- **Tab Switch Time**: < 50ms (this was already fast)

### Improvement
- **95% reduction** in address screen load time
- **User-perceived instant loading**

## Troubleshooting

### Problem: Addresses Not Loading Instantly

**Possible Causes:**
1. Prefetch failed due to network issues
2. Cache expired (> 5 minutes)
3. Wallet was just created (no prefetch triggered yet)

**Solution:**
- Check console logs for error messages
- Verify network connectivity
- Navigate back to Wallet Settings to trigger prefetch

### Problem: Console Shows Prefetch Failed

**Possible Causes:**
1. Network timeout
2. Blockchain API rate limiting
3. Invalid xpub (corrupted wallet)

**Solution:**
- Check network connectivity
- Wait a few seconds and navigate back to Wallet Settings
- If persistent, check wallet integrity

### Problem: Addresses Show Wrong Data

**Possible Causes:**
1. Cache not invalidated after transaction
2. Query key mismatch
3. Multiple wallets with same ID (unlikely)

**Solution:**
- Manually refresh using the refresh button in View Addresses
- Clear app data and reimport wallet
- Check query key includes wallet.id and wallet.xpub

## Related Files
- `app/wallet-settings.tsx` - Prefetch implementation
- `app/wallet-addresses.tsx` - Address display screen
- `services/wallet-service.ts` - Address generation and caching
- `utils/wallet-service-loader.ts` - Shared service loader
- `utils/address-transform.ts` - Data transformation utilities

## Industry Comparison

### Electrum
- Addresses shown instantly from local database
- Background sync updates address status
- Gap limit of 20 (same as BitSleuth)

### BlueWallet
- Uses local cache for address display
- Prefetches on wallet selection
- Shows cached data immediately

### Trust Wallet
- Address list cached in app state
- Instant display from cache
- Background refresh on pull-to-refresh

**BitSleuth Implementation:**
✅ Matches industry standards
✅ React Query provides similar caching to local database
✅ Background prefetch on settings screen
✅ Instant display from cache
✅ Manual refresh available
