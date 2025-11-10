# Firebase Crashlytics Testing Guide

Quick guide to test the Firebase Crashlytics implementation in BitSleuth Wallet.

## Prerequisites

⚠️ **IMPORTANT:** Firebase Crashlytics does NOT work in Expo Go. You must build a development or production build.

## Quick Start

### Step 1: Build the App

Choose one of the following:

**iOS Development Build:**
```bash
npx expo run:ios
```

**Android Development Build:**
```bash
npx expo run:android
```

**EAS Production Build:**
```bash
eas build --platform all --profile production
```

### Step 2: Access Test Tools

1. Open the app
2. Navigate to: **Settings → About BitSleuth Wallet**
3. Scroll down to find: **🔧 Developer Tools** section
4. Expand the section to see test buttons

### Step 3: Test Non-Fatal Errors

1. Tap **"Test Non-Fatal Error"** button
2. Confirm the action in the dialog
3. You should see: "Non-fatal error sent to Crashlytics"
4. Open Firebase Console: https://console.firebase.google.com/project/bitsleuth/crashlytics
5. The error should appear within 30-60 seconds

**Expected in Firebase Console:**
- Error message: "Test non-fatal error from BitSleuth Wallet"
- Custom attributes showing platform, source, action, timestamp
- Stack trace with file names and line numbers

### Step 4: Test Fatal Crashes

1. Tap **"Test Fatal Crash"** button
2. Confirm the action in the **destructive** dialog
3. The app will crash after 1 second
4. **Restart the app** (crash reports are sent on next launch)
5. Wait 2-5 minutes
6. Check Firebase Console

**Expected in Firebase Console:**
- Fatal crash event
- Crash log with stack trace
- Symbolicated with file names and line numbers
- Session data and device information

### Step 5: Verify Crashlytics Status

In the Developer Tools section, check the **Crashlytics Status** box:

**Expected Status:**
- ✅ Enabled and ready
- Platform: ios or android
- Note about Expo Go (should not be in Expo Go)

## Verification Checklist

Use this checklist to verify the implementation:

- [ ] Built app with development or production build (not Expo Go)
- [ ] Developer Tools section is visible in About screen
- [ ] Crashlytics Status shows "✅ Enabled and ready"
- [ ] Test Non-Fatal Error button works and sends error to Firebase
- [ ] Error appears in Firebase Console with custom attributes
- [ ] Stack trace is symbolicated (shows file names and line numbers)
- [ ] Test Fatal Crash button works and crashes the app
- [ ] Crash report appears in Firebase Console after app restart
- [ ] Crash stack trace is symbolicated
- [ ] Device and session information is included in crash reports

## Firebase Console Access

**URL:** https://console.firebase.google.com/project/bitsleuth/crashlytics

**What to Check:**
1. **Issues Tab**: Shows all crashes and errors grouped by similarity
2. **Events Timeline**: Shows when crashes occurred
3. **Stack Traces**: Click on an issue to see detailed stack traces
4. **Device Info**: See device models, OS versions, memory usage
5. **Custom Attributes**: Check if your custom attributes appear

## Common Issues

### Issue: "❌ Not available (use dev build)"

**Cause:** Running in Expo Go or Firebase not initialized properly

**Solution:**
- Exit Expo Go
- Build with `npx expo run:ios` or `npx expo run:android`
- Clean build folders if needed:
  ```bash
  # iOS
  cd ios && pod deintegrate && pod install && cd ..
  
  # Android
  cd android && ./gradlew clean && cd ..
  ```

### Issue: Errors not appearing in Firebase Console

**Possible Causes:**
1. App not connected to internet
2. Firebase project ID mismatch
3. Google Services files not configured correctly

**Solution:**
1. Check internet connectivity
2. Run verification script:
   ```bash
   node scripts/test-firebase-connectivity.js
   ```
3. Verify GoogleService-Info.plist and google-services.json are correct
4. Rebuild the app

### Issue: Stack traces not symbolicated

**iOS:**
- Verify dSYM upload: Check Xcode build logs for "FirebaseCrashlytics" upload
- Ensure build script is running: Check Xcode Build Phases
- Wait 10-15 minutes for processing

**Android:**
- Verify ProGuard/R8 is enabled for release builds
- Check Gradle logs for "Crashlytics" mapping upload
- Ensure `minifyEnabled = true` in release build
- Wait 10-15 minutes for processing

### Issue: Developer Tools section not visible

**Cause:** Not running in development mode

**Solution:**
- Developer Tools only appear when `__DEV__ === true`
- Build with development configuration:
  ```bash
  npx expo run:ios --dev-client
  npx expo run:android --dev-client
  ```

## Advanced Testing

### Test Custom Error Logging

Add this code anywhere in your app:

```typescript
import crashlyticsService from '@/services/crashlytics-service';

try {
  // Your code
  throw new Error('Custom test error');
} catch (error) {
  crashlyticsService.recordError(error as Error, {
    screen: 'my_screen',
    action: 'my_action',
    customData: 'test_data',
  });
}
```

### Test Custom Logging

```typescript
crashlyticsService.log('User completed action');
crashlyticsService.log('Transaction amount: 0.001 BTC');
```

### Test Custom Attributes

```typescript
crashlyticsService.setAttributes({
  walletType: 'segwit',
  hasBackup: 'true',
  lastAction: 'send_transaction',
});
```

### Test User Identification

```typescript
crashlyticsService.setUserId('test_user_123');
```

### Test Wallet Operations

```typescript
crashlyticsService.trackWalletOperation('send_transaction', 'wallet_id', true);
crashlyticsService.trackTransaction('send', '0.001 BTC', true);
crashlyticsService.trackAuthEvent('login', 'biometric', true);
```

## Production Testing

### Before Release

1. Build production app: `eas build --platform all --profile production`
2. Install on test device
3. Verify Crashlytics is working
4. Test fatal crash (force close after crash, restart, check console)
5. Test non-fatal errors
6. Verify symbolication is working
7. Check Firebase Console for all reports

### Monitoring in Production

1. Set up Firebase alerts for critical crashes
2. Monitor crash-free rate (aim for 99%+)
3. Review new crashes daily
4. Check for patterns (specific devices, OS versions)
5. Fix high-priority crashes first

## Best Practices

1. ✅ Always test in development builds before production
2. ✅ Use custom attributes to add context to errors
3. ✅ Log important events before errors occur
4. ✅ Monitor Firebase Console regularly
5. ✅ Fix crashes promptly
6. ✅ Test on multiple devices and OS versions
7. ✅ Verify symbolication before releasing
8. ❌ Don't force crashes in production code
9. ❌ Don't log sensitive user data
10. ❌ Don't ignore crash reports

## Need Help?

- Review full documentation: `docs/FIREBASE_CRASHLYTICS.md`
- Run verification scripts:
  ```bash
  node scripts/test-crashlytics-simple.js
  node scripts/test-firebase-connectivity.js
  ```
- Check Crashlytics service: `services/crashlytics-service.ts`
- Check Error Boundary: `app/_layout.tsx`

## Summary

✅ Firebase Crashlytics is fully configured and ready to use
✅ Test buttons available in development builds
✅ Symbol upload configured for iOS and Android
✅ Works with Hermes and New Architecture
✅ Compatible with EAS builds
✅ Privacy compliant (no analytics)

**Happy Testing! 🚀**
