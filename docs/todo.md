### **1. Multi-Factor Authentication (MFA)**
- **Status**: ✅ **Implemented**
- **Location**: `app/passkeys-security.tsx:367-381`
- **Issue**: ~~Validation logic exists but no actual MFA enforcement during transactions~~
- **Impact**: ~~MFA setting doesn't affect transaction security~~

### **2. Biometric Security for Transactions**
- **Status**: ✅ **Implemented**
- **Location**: `app/passkeys-security.tsx:535-553`
- **Issue**: ~~Setting exists but no enforcement during transaction signing~~
- **Impact**: ~~Biometric requirement for transactions not functional~~

### **3. Watch-Only Wallets (XPUB Import)**
- **Status**: ❌ **Not implemented**
- **Label**: Quick win
- **Notes**: Import xpub/ypub/zpub to create watch-only wallets; no private keys; show balance/history.

### **4. Custom Backend Configuration (Esplora/Electrum)**
- **Status**: ❌ **Not implemented**
- **Label**: Quick win
- **Notes**: Allow user-specified Esplora/Electrum endpoints (per-wallet or global) with fallback.

### **5. Address Book, Notes, and UTXO Labeling/Freeze**
- **Status**: ❌ **Not implemented**
- **Label**: Quick win
- **Notes**: Contacts with saved addresses, transaction notes, UTXO labels and freeze/unfreeze controls.

### **6. CSV Export (Transaction History)**
- **Status**: ❌ **Not implemented**
- **Label**: Quick win
- **Notes**: Export transactions with amounts, fees, txids, timestamps for accounting.

### **7. Push Notifications (Incoming/Outgoing/Confirmations)**
- **Status**: ❌ **Not implemented**
- **Label**: Medium
- **Notes**: FCM/APNs-based alerts for received, sent, and confirmation events.

### **8. Security Extras: BIP39 Passphrase, Plausible Deniability, Duress PIN**
- **Status**: ❌ **Not implemented**
- **Label**: Medium
- **Notes**: 25th-word passphrase; decoy wallet with secondary password; duress PIN to open decoy.

### **9. Batch Transactions (Multi-Recipient Send)**
- **Status**: ❌ **Not implemented**
- **Label**: Medium
- **Notes**: Build transactions with multiple outputs; fee and UX adjustments.

### **10. Testnet/Regtest Toggle**
- **Status**: ❌ **Not implemented**
- **Label**: Medium
- **Notes**: Switch networks for development/testing; persistent per-app or per-wallet setting.

### **11. Lightning Network (LNDHub/LNbits, LNURL, Lightning Address)**
- **Status**: ❌ **Not implemented**
- **Label**: Larger
- **Notes**: Create Lightning wallets; pay/receive invoices; optional node connection; channel-lite approach first.

### **12. PSBT Import/Export + Hardware Wallets (Coldcard/Ledger/Trezor)**
- **Status**: ❌ **Not implemented**
- **Label**: Larger
- **Notes**: PSBT via file/QR/SD; offline signing; wallet descriptor support.

### **13. Multisig Vaults (2-of-3, 3-of-5) + Cosigner Management**
- **Status**: ❌ **Not implemented**
- **Label**: Larger
- **Notes**: Create and manage multisig wallets; PSBT flows with hardware cosigners; recovery docs.

### **14. Privacy Transport & Protocols (Tor, PayJoin, CoinJoin, Stealth Addresses)**
- **Status**: ❌ **Not implemented**
- **Label**: Larger
- **Notes**: Tor proxy option; PayJoin for collaborative spends; optional CoinJoin; stealth/scan key receive.
