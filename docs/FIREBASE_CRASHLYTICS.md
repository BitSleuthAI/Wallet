# Firebase Crashlytics Integration Guide

This document describes the complete Firebase Crashlytics integration for the BitSleuth Wallet app.

## Overview

Firebase Crashlytics is fully integrated for both iOS and Android platforms with:
- ✅ Fatal crash reporting
- ✅ Non-fatal error logging
- ✅ Custom logging and attributes
- ✅ Symbol upload for iOS (dSYM)
- ✅ Mapping file upload for Android (ProGuard/R8)
- ✅ Hermes + New Architecture support
- ✅ EAS Build compatibility

## Prerequisites

- **DO NOT use Expo Go** - Crashlytics requires a development build or production build
- Build with: `npx expo run:ios` or `npx expo run:android`
- For EAS builds: `eas build --platform ios|android|all --profile production`

## Configuration

### iOS Configuration

**Files:**
- `ios/BitSleuthWallet/GoogleService-Info.plist` - Firebase configuration
- `ios/BitSleuthWallet/Info.plist` - Contains `FirebaseCrashlyticsCollectionEnabled = true`
- `ios/BitSleuthWallet/AppDelegate.swift` - Firebase initialization
- `ios/Podfile` - Firebase static framework configuration

**Build Script:**
The Xcode project includes a build phase script that automatically uploads dSYM files:
```bash
"${PODS_ROOT}/FirebaseCrashlytics/run"
```

**Key Settings:**
- Static frameworks: `$RNFirebaseAsStaticFramework = true`
- Modular headers enabled: `use_modular_headers!`
- New Architecture compatible
- Hermes enabled

### Android Configuration

**Files:**
- `android/app/google-services.json` - Firebase configuration
- `android/app/src/main/AndroidManifest.xml` - Contains `firebase_crashlytics_collection_enabled = true`
- `android/build.gradle` - Firebase Crashlytics Gradle plugin (3.0.3)
- `android/app/build.gradle` - Plugin application and ProGuard rules

**Gradle Plugins:**
```gradle
classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.3'
classpath 'com.google.gms:google-services:4.4.1'

// In app/build.gradle:
apply plugin: 'com.google.gms.google-services'
apply plugin: 'com.google.firebase.crashlytics'
```

**Mapping Files:**
The Crashlytics Gradle plugin automatically uploads ProGuard/R8 mapping files during release builds.

## Usage

### Crashlytics Service

The app includes a complete Crashlytics service wrapper at `services/crashlytics-service.ts`.

**Basic Usage:**

```typescript
import crashlyticsService from '@/services/crashlytics-service';

// Log a message
crashlyticsService.log('User completed transaction');

// Record a non-fatal error
try {
  // Some operation
} catch (error) {
  crashlyticsService.recordError(error as Error, {
    context: 'transaction_screen',
    action: 'send_bitcoin',
  });
}

// Set user identifier
crashlyticsService.setUserId('user_123');

// Set custom attributes
crashlyticsService.setAttributes({
  walletType: 'segwit',
  network: 'mainnet',
});

// Track wallet operations
crashlyticsService.trackWalletOperation('create_wallet', 'wallet_id_123', true);

// Track transactions
crashlyticsService.trackTransaction('send', '0.001 BTC', true);

// Track authentication events
crashlyticsService.trackAuthEvent('login', 'biometric', true);
```

### Test Crash UI

In development builds (`__DEV__ === true`), the About screen includes a developer tools section with:

1. **Test Non-Fatal Error** - Logs a test error to Crashlytics
2. **Test Fatal Crash** - Forces an app crash to test crash reporting
3. **Crashlytics Status** - Shows if Crashlytics is enabled and ready

**To access:**
1. Build a development build: `npx expo run:ios` or `npx expo run:android`
2. Navigate to Settings → About BitSleuth Wallet
3. Expand the "🔧 Developer Tools" section

### Error Boundary Integration

The app includes an error boundary in `app/_layout.tsx` that automatically reports unhandled errors to Crashlytics:

```typescript
class ErrorBoundary extends Component {
  static getDerivedStateFromError(error: Error) {
    // Report to Crashlytics
    crashlyticsService.recordError(error);
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    crashlyticsService.recordError(error, {
      errorBoundary: 'true',
      componentStack: errorInfo.componentStack,
    });
  }
}
```

## Testing

### Verification Scripts

Run these scripts to verify your configuration:

```bash
# Basic configuration check
node scripts/test-crashlytics-simple.js

# Detailed Firebase connectivity test
node scripts/test-firebase-connectivity.js
```

### Testing Crashlytics

1. **Build a development or production build:**
   ```bash
   # iOS
   npx expo run:ios
   
   # Android
   npx expo run:android
   
   # EAS Production Build
   eas build --platform all --profile production
   ```

2. **Test non-fatal errors:**
   - Use the test button in About screen (dev builds only)
   - Or call `crashlyticsService.recordError()` in your code
   - Check Firebase Console immediately

3. **Test fatal crashes:**
   - Use the test crash button in About screen (dev builds only)
   - Or call `crashlyticsService.crash()` in your code
   - **Important:** Crash reports are sent on the NEXT app launch
   - Close and restart the app after a crash
   - Check Firebase Console after restart

### Firebase Console

Monitor crashes and errors at:
```
https://console.firebase.google.com/project/bitsleuth/crashlytics
```

**What to expect:**
- Non-fatal errors appear within seconds
- Fatal crashes appear after the next app launch
- Symbolicated stack traces (with file names and line numbers)
- Custom attributes and logs attached to crash reports
- User identifiers and session data

## EAS Build Configuration

### iOS dSYM Upload

The Crashlytics build phase script in Xcode automatically uploads dSYMs during builds. For EAS builds, ensure:

```json
// eas.json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  }
}
```

### Android Mapping Files

The Firebase Crashlytics Gradle plugin automatically uploads ProGuard/R8 mapping files. Configuration in `android/app/build.gradle`:

```gradle
buildTypes {
  release {
    minifyEnabled true
    proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
  }
}

apply plugin: 'com.google.firebase.crashlytics'
```

## Symbolication

### iOS (dSYM)

**Automatic Upload:**
- Enabled via Xcode build phase script
- Runs after every archive build
- Uploads to Firebase automatically

**Manual Upload (if needed):**
```bash
# Find dSYM files
find ~/Library/Developer/Xcode/Archives -name "*.dSYM"

# Upload manually
/path/to/Pods/FirebaseCrashlytics/upload-symbols \
  -gsp /path/to/GoogleService-Info.plist \
  -p ios /path/to/dSYMs
```

### Android (ProGuard/R8)

**Automatic Upload:**
- Enabled via Crashlytics Gradle plugin
- Runs during release builds
- Uploads mapping.txt automatically

**Manual Upload (if needed):**
```bash
# Find mapping file
find android/app/build -name "mapping.txt"

# Upload via Firebase CLI
firebase crashlytics:symbols:upload \
  --app=1:510465233305:android:17c91346ecafeaaf85c308 \
  android/app/build/outputs/mapping/release/mapping.txt
```

### Hermes Source Maps

For Hermes-enabled builds, React Native automatically generates source maps during bundling. The Crashlytics integration handles these automatically.

## Troubleshooting

### Crashlytics Not Working

1. **Check if using Expo Go:**
   - Crashlytics does NOT work in Expo Go
   - Build with `npx expo run:ios` or `npx expo run:android`

2. **Verify configuration:**
   ```bash
   node scripts/test-crashlytics-simple.js
   ```

3. **Check service status:**
   ```typescript
   console.log(crashlyticsService.isAvailable()); // Should be true
   console.log(crashlyticsService.getEnvironmentInfo());
   ```

4. **Enable verbose logging:**
   ```bash
   # iOS
   adb logcat | grep -i firebase
   
   # Android
   adb logcat | grep -i firebase
   ```

### Crash Reports Not Appearing

1. **Fatal crashes:**
   - Reports are sent on NEXT app launch
   - Close and restart the app after a crash
   - Wait 2-5 minutes for processing

2. **Check Firebase Console:**
   - Go to Crashlytics dashboard
   - Select your app (iOS or Android)
   - Check "Issues" tab

3. **Verify network connectivity:**
   - Crashlytics requires internet to send reports
   - Reports are cached if offline and sent when online

### Missing Symbolication

1. **iOS:**
   - Verify dSYM upload: Check Xcode build logs
   - Verify GoogleService-Info.plist is in project
   - Check Firebase Console → Settings → dSYMs

2. **Android:**
   - Verify ProGuard/R8 is enabled for release builds
   - Check Crashlytics Gradle plugin is applied
   - Verify mapping.txt is generated in build output

3. **Hermes:**
   - Ensure Hermes is enabled in app.json
   - Verify source maps are generated during bundling
   - Check that `hermesEnabled` is true in build config

### Build Errors

1. **iOS - Pod Install Issues:**
   ```bash
   cd ios
   pod deintegrate
   pod install
   cd ..
   ```

2. **Android - Gradle Issues:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

3. **New Architecture Conflicts:**
   - Verify `$RNFirebaseAsStaticFramework = true` in Podfile
   - Check `use_modular_headers!` is enabled
   - Verify `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES`

## Best Practices

1. **Always test in development builds before production**
2. **Use custom attributes to add context to errors**
3. **Set user identifiers for debugging (but respect privacy)**
4. **Log important events before errors occur**
5. **Don't force crashes in production code**
6. **Monitor Crashlytics dashboard regularly**
7. **Set up alerts for critical crashes**
8. **Review and fix crashes promptly**

## Privacy Considerations

- User identifiers are set to 'anonymous' by default
- Only crash-related data is collected
- No personal information is sent
- No analytics or tracking beyond crash reporting
- Users cannot opt-out (crash reporting is essential for app quality)

## References

- [Firebase Crashlytics Documentation](https://firebase.google.com/docs/crashlytics)
- [React Native Firebase Crashlytics](https://rnfirebase.io/crashlytics/usage)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Hermes Documentation](https://reactnative.dev/docs/hermes)
