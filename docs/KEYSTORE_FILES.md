# Keystore Files in BitSleuth Wallet

This document provides a comprehensive overview of keystore file configuration in the BitSleuth Wallet repository.

## Overview

Keystores are used in Android development to sign applications. This repository does **not** include keystore files in version control. Each developer generates their own debug keystore locally for development purposes. Production keystores are intentionally excluded from version control for security reasons.

## Keystore Files Configuration

### 1. Android Debug Keystore
**Location:** `android/app/debug.keystore` (not included in repository)

**Type:** Java KeyStore (JKS)

**Status:** This file is **NOT** tracked in version control and is excluded via `.gitignore`. Each developer generates their own debug keystore locally.

**Purpose:** Used for signing debug and development builds of the Android application.

**Default Credentials:**
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

**How to Generate:** Android Studio and Gradle automatically generate a debug keystore when building the app if one doesn't exist. Alternatively, you can manually create one using:
```bash
keytool -genkey -v -keystore android/app/debug.keystore \
  -alias androiddebugkey -keyalg RSA -keysize 2048 \
  -validity 10000 -storepass android -keypass android \
  -dname "CN=Android Debug,O=Android,C=US"
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
*.keystore                     # Android keystore files (including debug.keystore)
android/app/debug.keystore     # Explicitly ignore debug keystore

# iOS certificates and provisioning
*.p12                          # PKCS12 certificate files
*.p8                           # Apple AuthKey files
*.key                          # Private key files
*.mobileprovision              # iOS provisioning profiles
```

These patterns ensure that **all keystore files**, including debug.keystore, are never accidentally committed to version control. While the debug keystore uses default, publicly-known credentials, it is still excluded from version control to prevent confusion and maintain consistency.

**Important:** The `debug.keystore` is **NOT** tracked in version control. Each developer should generate their own debug keystore locally, or Android Studio will generate one automatically when building the app.

## Android-Specific Gitignore

The `android/.gitignore` file also explicitly excludes `debug.keystore` to ensure it is never tracked, regardless of where it is generated within the Android project directory. This provides defense-in-depth against accidentally committing keystore files.

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

The BitSleuth Wallet repository **does not contain any keystore files in version control**:
- **`android/app/debug.keystore`**: Generated locally by each developer for debug builds (not tracked in git)
- All keystore files (`.keystore`, `.jks`) are excluded via `.gitignore`

Production keystores must be generated separately with secure credentials and stored securely outside version control before releasing the application to end users.
