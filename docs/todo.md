### **3. Transaction Cancellation**
- **Status**: ❌ **Explicitly marked as "Coming Soon"**
- **Location**: `app/fee-bump.tsx:155-171`
- **Issue**: Shows alert "Feature Coming Soon, Transaction cancellation will be available in a future update"
- **Impact**: Users cannot cancel pending transactions

### **4. Child-Pays-for-Parent (CPFP)**
- **Status**: ❌ **UI only, no implementation**
- **Location**: `app/fee-settings.tsx:507-512`
- **Issue**: Only has UI toggle, no backend logic to create CPFP transactions
- **Impact**: CPFP fee bumping not functional

### **5. Custom Transaction Fees**
- **Status**: ⚠️ **Partially functional**
- **Location**: `app/fee-settings.tsx` and `app/(tabs)/send.tsx`
- **Issue**: UI allows setting custom fees, but actual transaction creation not implemented
- **Impact**: Custom fee settings don't affect actual transactions

### **6. Auto-Adjust Fees**
- **Status**: ❌ **UI only**
- **Location**: `app/fee-settings.tsx:515-520`
- **Issue**: Toggle exists but no logic to automatically adjust fees based on network conditions
- **Impact**: Feature doesn't work

### **7. Fee Limits (Max Fee Rate/Dust Threshold)**
- **Status**: ❌ **UI only**
- **Location**: `app/fee-settings.tsx:523-592`
- **Issue**: Settings exist but not enforced during transaction creation
- **Impact**: Limits not applied to actual transactions

### **8. Passkeys & Security Keys**
- **Status**: ❌ **Mock implementation**
- **Location**: `app/passkeys-security.tsx:122-247`
- **Issue**: 
  - Web implementation uses mock WebAuthn with hardcoded challenge
  - Mobile implementation just registers device biometric without actual cryptographic verification
  - FIDO key registration is simulated without hardware verification
- **Impact**: Security keys don't provide actual cryptographic security

### **9. Multi-Factor Authentication (MFA)**
- **Status**: ❌ **UI only**
- **Location**: `app/passkeys-security.tsx:367-381`
- **Issue**: Validation logic exists but no actual MFA enforcement during transactions
- **Impact**: MFA setting doesn't affect transaction security

### **10. Biometric Security for Transactions**
- **Status**: ❌ **Not implemented**
- **Location**: `app/passkeys-security.tsx:535-553`
- **Issue**: Setting exists but no enforcement during transaction signing
- **Impact**: Biometric requirement for transactions not functional
