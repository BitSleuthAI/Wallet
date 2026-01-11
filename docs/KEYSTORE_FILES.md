# Keystore Files in BitSleuth Wallet

This document provides a comprehensive overview of keystore files found in the BitSleuth Wallet repository and their purposes.

## Overview

Keystores are used in Android development to sign applications. This repository contains a debug keystore for development purposes. Production keystores are intentionally excluded from version control for security reasons.

## Keystore Files Found

### 1. Android Debug Keystore
**Location:** `android/app/debug.keystore`

**Type:** Java KeyStore (JKS)

**Size:** 2.3 KB

**Purpose:** Used for signing debug and development builds of the Android application.

**Credentials:**
- **Store Password:** `android`
- **Key Alias:** `androiddebugkey`
- **Key Password:** `android`

**Usage:** Referenced in `android/app/build.gradle` (lines 100-106):
```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
}
```

**Security Note:** This is a standard Android debug keystore with default credentials. It should **NEVER** be used for production releases. These default credentials are publicly known and are only suitable for development and testing purposes.

## Production Keystore Configuration

### Current Setup
As noted in `android/app/build.gradle` (line 113-115):
```gradle
release {
    // Caution! In production, you need to generate your own keystore file.
    // see https://reactnative.dev/docs/signed-apk-android.
    signingConfig signingConfigs.debug
}
```

**⚠️ Important:** The release build currently uses the debug keystore. This is acceptable for development but **MUST** be replaced with a proper production keystore before releasing to the Google Play Store.

### Creating a Production Keystore

For production builds, you need to generate a secure keystore:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore my-release-key.keystore \
  -alias my-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Important Security Practices:**
1. Use a strong password (not the default 'android')
2. Store the keystore file securely (outside version control)
3. Back up the keystore file in a secure location
4. Never commit production keystores to Git
5. Keep credentials in environment variables or secure vaults

### Configuring Production Keystore

1. **Store keystore securely** outside the repository
2. **Update `android/app/build.gradle`:**
   ```gradle
   signingConfigs {
       release {
           if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
               storeFile file(MYAPP_RELEASE_STORE_FILE)
               storePassword MYAPP_RELEASE_STORE_PASSWORD
               keyAlias MYAPP_RELEASE_KEY_ALIAS
               keyPassword MYAPP_RELEASE_KEY_PASSWORD
           }
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
       }
   }
   ```

3. **Create `android/gradle.properties`** (not committed):
   ```properties
   MYAPP_RELEASE_STORE_FILE=/path/to/my-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=my-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=*****
   MYAPP_RELEASE_KEY_PASSWORD=*****
   ```

## Git Ignore Configuration

The repository's `.gitignore` file includes the following keystore-related exclusions:

```gitignore
# Android keystores
*.jks                          # Java KeyStore files (Android production keystores)
*.keystore                     # Android keystore files
!android/app/debug.keystore    # Exception: Allow debug keystore (safe, uses default credentials)

# iOS certificates and provisioning
*.p12                          # PKCS12 certificate files
*.p8                           # Apple AuthKey files
*.key                          # Private key files
*.mobileprovision              # iOS provisioning profiles
```

These patterns ensure that production keystores and other sensitive key material are never accidentally committed to version control, while allowing the debug keystore to remain tracked since it uses publicly-known default credentials.

**Important:** The `debug.keystore` is explicitly allowed via the negation pattern `!android/app/debug.keystore` because it's safe for version control.

## Android-Specific Gitignore

The `android/.gitignore` file does not explicitly exclude keystore files, as the root `.gitignore` covers them through the `*.keystore` and `*.jks` patterns. The debug keystore is intentionally tracked in version control (via the negation pattern `!android/app/debug.keystore`) as it uses default, publicly-known credentials and is safe to share.

## iOS-Specific Gitignore

The `ios/.gitignore` file does not explicitly exclude certificate files, as the root `.gitignore` covers iOS-specific certificate and provisioning files through patterns like `*.p12`, `*.p8`, `*.key`, and `*.mobileprovision`.

## Related Concepts

### Device Keystore vs. APK Signing Keystore

It's important to distinguish between:

1. **APK Signing Keystore** (this document): Used to sign the Android application package (.apk or .aab files). Required for app distribution.

2. **Android Device Keystore/Keychain** (referenced in README.md): The secure hardware-backed storage on Android devices used for:
   - Storing biometric authentication data
   - Secure Enclave integration
   - User's private keys and sensitive app data
   - This is NOT a file in the repository; it's a platform feature used at runtime

## EAS Build Configuration

The `eas.json` file configures Expo Application Services for cloud builds but does not explicitly reference keystores. EAS manages keystore generation and storage for production builds automatically when configured through the EAS dashboard.

For production builds with EAS:
- EAS can generate keystores automatically
- Or you can upload your own keystore through the EAS dashboard
- Credentials are stored securely in Expo's credential management system

## Best Practices

### DO:
✅ Use the debug keystore for development and testing  
✅ Generate a unique production keystore with strong passwords  
✅ Store production keystores outside version control  
✅ Back up production keystores in multiple secure locations  
✅ Use environment variables for keystore credentials  
✅ Document keystore locations in secure internal documentation  

### DON'T:
❌ Never commit production keystores to Git  
❌ Never use debug keystore for production releases  
❌ Never share production keystore passwords in plain text  
❌ Never lose your production keystore (apps cannot be updated without it)  
❌ Never use weak or default passwords for production keystores  

## Additional Resources

- [Android App Signing Documentation](https://developer.android.com/studio/publish/app-signing)
- [React Native Signed APK Guide](https://reactnative.dev/docs/signed-apk-android)
- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Keystore Security Best Practices](https://developer.android.com/training/articles/keystore)

## Summary

The BitSleuth Wallet repository contains only one keystore file:
- **`android/app/debug.keystore`**: Standard Android debug keystore for development

Production keystores are intentionally excluded and must be generated separately with secure credentials before releasing the application to end users.
