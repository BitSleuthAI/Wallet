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
