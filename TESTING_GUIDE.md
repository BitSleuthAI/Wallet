# Testing Guide for Bitcoin Sending & UTXO Management Fixes

## Overview
This guide provides manual testing steps to verify that Bitcoin sending, UTXO management, frozen UTXO handling, and wallet balance calculations are working correctly.

## What Was Fixed

### 1. Frozen UTXO Filtering
**Issue**: Frozen UTXOs were not being properly excluded from transactions
**Fix**: Added filtering in both `sendTransaction` and send screen to exclude frozen UTXOs

### 2. UTXO Data Completeness
**Issue**: UTXOs were missing `status` and `scriptPubKey` fields needed for transactions
**Fix**: Ensured all UTXOs include complete data when fetched

### 3. Error Messages
**Issue**: Generic error messages when UTXOs weren't available
**Fix**: Added specific error messages for frozen UTXOs, unconfirmed UTXOs, etc.

### 4. Manual UTXO Selection
**Issue**: Manually selected UTXOs via coin control could include frozen/unconfirmed UTXOs
**Fix**: Added filtering before transaction creation

## Testing Scenarios

### Test 1: Automatic UTXO Selection (No Coin Control)
**Purpose**: Verify that the wallet automatically selects optimal UTXOs when none are manually selected

**Steps**:
1. Open the wallet app and ensure you have a wallet with a balance
2. Navigate to the Send screen
3. Enter a recipient address
4. Enter an amount to send (less than your total balance)
5. Do NOT use coin control - let the wallet auto-select UTXOs
6. Initiate the send transaction
7. Verify transaction is created successfully

**Expected Result**:
- Transaction should succeed
- Only confirmed, unfrozen UTXOs should be used
- Console logs should show "Automatically selected X UTXOs"

### Test 2: Manual UTXO Selection with Coin Control
**Purpose**: Verify that manually selected UTXOs work correctly

**Steps**:
1. Open the wallet app
2. Navigate to Coin Control screen
3. Select specific UTXOs (ensure they are confirmed and not frozen)
4. Go to Send screen
5. Enter recipient address and amount
6. Initiate send transaction
7. Verify transaction uses only the selected UTXOs

**Expected Result**:
- Transaction should succeed
- Only the manually selected UTXOs should be used
- Console logs should show "Using manually selected unfrozen UTXOs: X"

### Test 3: Frozen UTXO Exclusion
**Purpose**: Verify that frozen UTXOs are never used in transactions

**Steps**:
1. Open Coin Control screen
2. Freeze one or more UTXOs by tapping the freeze icon
3. Go to Send screen and attempt to send Bitcoin
4. Verify that frozen UTXOs are not used

**Sub-test 3a**: All UTXOs frozen
1. Freeze ALL UTXOs in coin control
2. Try to send Bitcoin
3. Should get error: "No confirmed UTXOs available for transaction"

**Sub-test 3b**: Some UTXOs frozen
1. Freeze some (but not all) UTXOs
2. Send Bitcoin
3. Only unfrozen UTXOs should be used
4. Console logs should show frozen UTXOs being filtered out

**Expected Result**:
- Frozen UTXOs are never included in transactions
- Clear error messages when no unfrozen UTXOs are available

### Test 4: Wallet Balance Calculation
**Purpose**: Verify that wallet balance is correctly calculated from all UTXOs

**Steps**:
1. Open wallet with multiple addresses that have received Bitcoin
2. Check the wallet balance displayed
3. Compare with blockchain explorer using wallet's xpub or addresses
4. Balance should match the sum of all UTXOs across all used addresses

**Expected Result**:
- Balance accurately reflects total of all UTXOs
- Console logs show "Wallet balance fetched: X.XXXXXXXX BTC"

### Test 5: UTXOs for Used Addresses
**Purpose**: Verify that UTXOs are returned for all used addresses in the wallet

**Steps**:
1. Create a wallet with multiple addresses that have received Bitcoin
2. Refresh wallet data
3. Open Coin Control screen
4. Verify all UTXOs from all used addresses are shown
5. Check console logs for UTXO fetching

**Expected Result**:
- All UTXOs from all used addresses should be visible
- Console logs should show UTXOs being fetched for each address
- Example log: "Address X returned Y UTXOs"

### Test 6: Selected UTXOs with Some Frozen
**Purpose**: Verify behavior when manually selecting UTXOs that include frozen ones

**Steps**:
1. In Coin Control, select multiple UTXOs
2. Freeze some of the selected UTXOs
3. Go to Send screen
4. Attempt to send Bitcoin
5. Transaction should only use the unfrozen selected UTXOs

**Expected Result**:
- Frozen UTXOs are automatically filtered out
- Console logs show: "Filtered out X frozen/unconfirmed UTXOs"
- Transaction succeeds with unfrozen UTXOs only

### Test 7: Unconfirmed UTXOs
**Purpose**: Verify that unconfirmed UTXOs are not used in transactions

**Steps**:
1. Receive a Bitcoin transaction (will be unconfirmed initially)
2. Before it confirms, try to send Bitcoin
3. The unconfirmed UTXO should not be used

**Expected Result**:
- Only confirmed UTXOs are used for sending
- If all UTXOs are unconfirmed, error: "All selected UTXOs are either frozen or unconfirmed"

## Console Log Verification

### Key Logs to Check

#### UTXO Loading:
```
🔍 Wallet store: Loading UTXOs for wallet: [wallet-id]
🚀 Fast mode: Address X returned Y UTXOs
✅ Using pre-selected confirmed unfrozen UTXOs: X
```

#### Frozen UTXO Filtering:
```
🔍 Confirmed UTXOs: X
🔍 Frozen UTXOs filtered out: Y
🔍 Unfrozen confirmed UTXOs: Z
```

#### Balance Calculation:
```
💰 Fetching wallet balance using improved service...
✅ Wallet balance fetched: X.XXXXXXXX BTC
```

#### Transaction Creation:
```
🔍 Send screen: Using manually selected unfrozen UTXOs: X
🔍 Send screen: Automatically selected Y UTXOs
✅ sendTransaction: Using X UTXOs for transaction
```

## Common Issues & Solutions

### Issue: "No UTXOs available for transaction"
**Cause**: All UTXOs are frozen or unconfirmed
**Solution**: 
- Unfreeze some UTXOs in Coin Control
- Wait for transactions to confirm

### Issue: "All selected UTXOs are frozen"
**Cause**: User selected only frozen UTXOs
**Solution**: Unfreeze UTXOs or select different ones

### Issue: Balance shows 0 but blockchain shows funds
**Cause**: UTXOs not being fetched or address discovery issue
**Solution**: 
- Refresh wallet data
- Check console logs for UTXO fetching errors
- Verify addresses are being discovered correctly

## Files Modified

1. **services/bitcoin-service.ts**
   - Added frozen UTXO filtering (line 313-320)
   - Improved error messages (line 324-341)

2. **app/(tabs)/send.tsx**
   - Filter frozen/unconfirmed from manual selections (line 590-603)

3. **services/wallet-service.ts**
   - Include status and scriptPubKey in UTXOs (line 352-357)

4. **hooks/wallet-store.ts**
   - Ensure scriptPubKey in UTXO loading (lines 903-915, 982-995)

## Verification Checklist

- [ ] Automatic UTXO selection works
- [ ] Manual UTXO selection works
- [ ] Frozen UTXOs are excluded from transactions
- [ ] Wallet balance is accurate
- [ ] UTXOs are returned for all used addresses
- [ ] Error messages are clear and helpful
- [ ] Console logs show proper filtering
- [ ] Unconfirmed UTXOs are not used

## Notes

- All tests should be performed on a non-production environment first
- Use testnet Bitcoin for initial testing if available
- Always verify transactions on a blockchain explorer
- Keep console logs open during testing for debugging
