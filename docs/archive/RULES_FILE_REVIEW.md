# .rules File Review Report

**Date:** January 8, 2026  
**Status:** ⚠️ Needs Improvements  
**Overall Score:** 6/10 - Functional but incomplete for Bitcoin wallet

---

## Executive Summary

The `.rules` file provides a good baseline for general security guardrails but has **critical gaps** specific to a Bitcoin wallet application. While it catches common secrets (API keys, tokens), it **does not protect against Bitcoin-specific sensitive data** (private keys, mnemonics, extended keys) and **misses critical Firebase configuration files**.

---

## What's Working Well ✅

1. **Solid Foundation**
   - Clear structure with severity levels (error, warning)
   - Good remediation guidance with code examples
   - Proper exclusion of test/example/placeholder values
   - Covers common secret patterns (AWS, GitHub, Google API keys)

2. **.env File Protection**
   - Correctly blocks `.env` files from being committed
   - Good remediation guidance for environment variables

3. **Config File Warnings**
   - Warns about suspicious keys in YAML/JSON files

4. **AI Assistant Guardrails**
   - Includes guidance for AI coding assistants
   - Provides safe placeholder patterns

---

## Critical Gaps ❌

### 1. Missing Firebase Configuration Files (HIGH PRIORITY)

**Current State:**
- `google-services.json` (Android Firebase config)
- `GoogleService-Info.plist` (iOS Firebase config)  
- `ServiceAccountBitSleuthWallet.json` (service account)

**Impact:** These files contain API keys and are only protected by `.gitignore`, not actively blocked by `.rules`. This creates a safety gap if someone modifies .gitignore.

**Recommendation:** Add new policy to explicitly block these files:

```yaml
- id: security.block_firebase_configs
  severity: error
  message: >
    Firebase configuration file detected. These files contain API keys and should never be committed.
    Ensure they are in .gitignore and obtain fresh copies from Firebase Console.
  applies_to:
    globs:
      - "**/google-services.json"
      - "**/GoogleService-Info.plist"
      - "**/ServiceAccount*.json"
  match:
    any:
      - regex: .+
  remediation:
    guidance: |
      Firebase configuration files must be kept out of version control:
      1. Add to .gitignore
      2. Obtain from Firebase Console for each environment
      3. Configure via CI/CD secrets for automated builds
      4. Use EAS Secrets for Expo builds
```

### 2. No Bitcoin-Specific Secret Patterns (HIGH PRIORITY)

**Missing Patterns:**
- **WIF Private Keys:** `5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ`
- **Extended Private Keys:** `xprv9s21ZrQH143K3QTDL...` (111+ chars)
- **Raw Private Keys:** 64-character hex strings assigned to variables

**Impact:** A developer could accidentally commit a private key in a test file or comment, leading to potential fund loss.

**Recommendation:** Add to `security.no_hardcoded_secrets` match patterns:

```yaml
- regex: \b(xprv|yprv|zprv)[a-zA-Z0-9]{107,}\b  # Extended private keys
- regex: \b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b   # WIF private keys
- regex: \b(privateKey|privKey|wif)\s*[:=]\s*["'][0-9A-Fa-f]{64}["']  # Hex private keys
```

### 3. Missing React Native/Expo Config Files (MEDIUM PRIORITY)

**Gaps:**
- `app.json` and `eas.json` may contain build secrets
- `.plist` files (iOS configuration)
- `.properties` files (Android configuration)

**Recommendation:** Extend file coverage in `security.suspicious_config_keys`:

```yaml
applies_to:
  globs:
    - "**/*.{yml,yaml,json}"
    - "**/app.json"
    - "**/eas.json"
    - "**/*.plist"
```

---

## Risk Assessment

| Risk | Current State | With Improvements | Priority |
|------|---------------|-------------------|----------|
| Firebase credentials leaked | Medium | Low | HIGH |
| Bitcoin private keys leaked | High | Low | HIGH |
| Mnemonics leaked | Medium | Medium | MEDIUM |
| Generic API keys leaked | Low | Low | ✅ OK |

---

## Testing Recommendations

### Positive Tests (should trigger alerts):

```bash
# Test WIF key detection
echo 'const key = "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ"' > test.js

# Test xprv detection
echo 'const xprv = "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi"' > test.js

# Test Firebase file blocking
git add google-services.json
```

### Negative Tests (should NOT trigger):

```bash
# Environment variables (safe)
echo 'const key = process.env.BITCOIN_PRIVATE_KEY' > test.js

# Placeholders (safe)
echo 'const example = "<YOUR_PRIVATE_KEY>"' > test.js

# Public keys are safe (xpub)
echo 'const xpub = "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz"' > test.js
```

---

## Action Items

1. ✅ **APPROVE** current structure and approach
2. ⚠️ **ADD** Firebase configuration file blocking (HIGH PRIORITY)
3. ⚠️ **ADD** Bitcoin private key patterns (HIGH PRIORITY)
4. ⚠️ **EXTEND** file coverage for React Native configs (MEDIUM)
5. ✅ **MAINTAIN** existing patterns and exclusions

---

## Conclusion

**The .rules file is a good start but requires Bitcoin-specific enhancements before production deployment.**

Implementing the critical improvements (Firebase file blocking and Bitcoin private key detection) will significantly reduce the risk of accidental secret exposure. These changes should be made before:
- Onboarding new developers
- Deploying to production
- Opening the repository to external contributors

---

## References

- [BIP32 Extended Keys](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [WIF Private Keys](https://en.bitcoin.it/wiki/Wallet_import_format)
- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/api-keys)
- [React Native Security](https://reactnative.dev/docs/security)
