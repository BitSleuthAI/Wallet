# Android Firebase Crashlytics Setup Guide

This guide provides specific instructions for setting up and testing Firebase Crashlytics on Android for the BitSleuth Wallet app.

## Android-Specific Configuration

### 1. Gradle Configuration

The Android build system has been configured with the following Firebase plugins and dependencies:

#### Project-level `android/build.gradle`:
```gradle
buildscript {
  dependencies {
    classpath('com.google.gms:google-services:4.4.0')
    classpath('com.google.firebase:firebase-crashlytics-gradle:2.9.9')
  }
}
```

#### App-level `android/app/build.gradle`:
```gradle
apply plugin: "com.google.gms.google-services"
apply plugin: "com.google.firebase.crashlytics"

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-crashlytics'
    implementation 'com.google.firebase:firebase-analytics'
}
```

### 2. Firebase Configuration

The `android/app/google-services.json` file contains the Android-specific Firebase configuration with:
- Project ID: `bitsleuth`
- Package name: `ai.bitsleuth.wallet`
- App ID: `1:510465233305:android:17c91346ecafeaaf85c308`

### 3. Expo Configuration

The `app.json` includes Android-specific Firebase configuration:
```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-firebase/app",
        {
          "android": {
            "googleServicesFile": "./android/app/google-services.json"
          }
        }
      ],
      "@react-native-firebase/crashlytics"
    ]
  }
}
```

## Android-Specific Features

### 1. Automatic Data Collection
Android Crashlytics automatically collects:
- ANR (Application Not Responding) reports
- Native crashes
- Background crashes
- ANR traces

### 2. Enhanced Error Reporting
The Android implementation includes:
- Automatic crash collection enabled by default
- Platform-specific attributes
- Enhanced breadcrumb logging

### 3. Build Variants
The Android build supports both debug and release variants with Crashlytics enabled in both.

## Testing on Android

### 1. Build and Run
```bash
# Clean build
expo run:android --clear

# Or using npm
npm run android
```

### 2. Test Crashlytics Features
1. Open the app on Android device/emulator
2. Navigate to Settings > Crashlytics Testing
3. Test the following features:
   - **Test Log**: Sends custom log messages
   - **Test Error**: Sends test error reports
   - **Test Crash**: Forces app crash for testing

### 3. Verify in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/project/bitsleuth/crashlytics)
2. Check for crash reports (may take up to 5 minutes)
3. Look for Android-specific data like:
   - Device information
   - Android version
   - App version
   - Custom attributes

## Android-Specific Troubleshooting

### 1. Build Issues
If you encounter build errors:

```bash
# Clean everything
cd android
./gradlew clean
cd ..

# Rebuild
expo run:android --clear
```

### 2. Google Services Plugin Issues
Ensure the Google Services plugin is properly applied:
- Check `android/build.gradle` has the plugin classpath
- Check `android/app/build.gradle` applies the plugin
- Verify `google-services.json` is in the correct location

### 3. ProGuard/R8 Issues
If using code obfuscation, add these rules to `android/app/proguard-rules.pro`:
```proguard
-keepattributes SourceFile,LineNumber
-keep public class * extends java.lang.Exception
-keep class com.google.firebase.crashlytics.** { *; }
-dontwarn com.google.firebase.crashlytics.**
```

### 4. Debug vs Release Testing
- **Debug builds**: Crashlytics is enabled but may have limited functionality
- **Release builds**: Full Crashlytics functionality is available
- Test both variants to ensure proper functionality

## Android-Specific Best Practices

### 1. ANR Monitoring
Android Crashlytics automatically monitors for ANRs. To help with debugging:
```typescript
// Add custom attributes before potentially slow operations
crashlyticsService.setAttribute('operation', 'wallet_sync');
// Perform operation
crashlyticsService.setAttribute('operation', 'completed');
```

### 2. Background Crash Handling
Android apps can crash in the background. Ensure proper error handling:
```typescript
// Wrap background operations in try-catch
try {
  // Background operation
} catch (error) {
  crashlyticsService.recordError(error, {
    context: 'background_operation',
    platform: 'android'
  });
}
```

### 3. Memory Management
Android has different memory constraints. Monitor memory-related crashes:
```typescript
crashlyticsService.setAttribute('memory_usage', 'high');
```

## Verification Checklist

- [ ] Android app builds successfully
- [ ] Firebase configuration files are in place
- [ ] Gradle plugins are applied correctly
- [ ] Test crash appears in Firebase Console
- [ ] Custom logs appear in Firebase Console
- [ ] Error reports include Android-specific data
- [ ] Both debug and release builds work

## References

- [Firebase Android Crashlytics Documentation](https://firebase.google.com/docs/crashlytics/get-started?platform=android)
- [React Native Firebase Android Setup](https://rnfirebase.io/crashlytics/usage)
- [Android Gradle Plugin Documentation](https://developer.android.com/studio/build/gradle-plugin)
