# Firebase Crashlytics Integration

This document describes the Firebase Crashlytics integration for the BitSleuth Wallet React Native app.

## Overview

Firebase Crashlytics has been integrated to provide comprehensive crash reporting and error tracking for both iOS and Android versions of the app. This helps identify and fix issues that users encounter in production.

## What's Included

### 1. Dependencies
- `@react-native-firebase/app` - Core Firebase SDK
- `@react-native-firebase/crashlytics` - Crashlytics SDK

### 2. Configuration Files
- `ios/BitSleuthWallet/GoogleService-Info.plist` - Firebase configuration for iOS
- `android/app/google-services.json` - Firebase configuration for Android
- `app.json` - Expo plugin configuration for Firebase
- `android/build.gradle` - Project-level Gradle configuration with Firebase plugins
- `android/app/build.gradle` - App-level Gradle configuration with Firebase dependencies

### 3. Code Integration
- `app/_layout.tsx` - Main app initialization with Crashlytics setup
- `services/crashlytics-service.ts` - Utility service for Crashlytics operations
- `app/(tabs)/settings.tsx` - Test interface for Crashlytics features

## Features

### Automatic Crash Reporting
- All unhandled errors are automatically reported to Firebase
- Error boundary catches React component errors
- Native iOS crashes are captured

### Custom Error Tracking
- Manual error reporting with custom context
- User identification for better debugging
- Custom attributes for filtering and analysis

### Testing Interface
The settings screen includes a "Crashlytics Testing" section with:
- **Test Log** - Send custom log messages
- **Test Error** - Send test error reports
- **Test Crash** - Force app crash for testing

## Usage

### Basic Error Reporting
```typescript
import crashlyticsService from '@/services/crashlytics-service';

// Report an error
try {
  // Some operation that might fail
} catch (error) {
  crashlyticsService.recordError(error, {
    context: 'wallet_operation',
    userId: 'user123'
  });
}
```

### Custom Logging
```typescript
// Log custom messages
crashlyticsService.log('User performed wallet operation');
```

### Setting User Context
```typescript
// Set user ID for better crash tracking
crashlyticsService.setUserId('user123');

// Set custom attributes
crashlyticsService.setAttributes({
  walletType: 'bitcoin',
  version: '1.1.6'
});
```

### Wallet-Specific Tracking
```typescript
// Track wallet operations
crashlyticsService.trackWalletOperation('send_transaction', 'wallet123', true);

// Track transaction events
crashlyticsService.trackTransaction('send', '0.001', true);

// Track authentication events
crashlyticsService.trackAuthEvent('login', 'biometric', true);
```

## Configuration

### iOS Setup
The iOS configuration is handled automatically through:
1. `GoogleService-Info.plist` file in the iOS project
2. Expo plugins in `app.json`

### Android Setup
The Android configuration includes:
1. `google-services.json` file in the Android project
2. Google Services plugin in `android/build.gradle`
3. Firebase Crashlytics plugin in `android/app/build.gradle`
4. Firebase BOM and Crashlytics dependencies in `android/app/build.gradle`
5. Expo plugins in `app.json`

### Firebase Console
- **Project**: bitsleuth
- **Console**: https://console.firebase.google.com/project/bitsleuth
- **Crashlytics Dashboard**: https://console.firebase.google.com/project/bitsleuth/crashlytics

## Testing

### Local Testing
1. Run the app: `npm run ios` (for iOS) or `npm run android` (for Android)
2. Navigate to Settings > Crashlytics Testing
3. Use the test buttons to verify functionality
4. Check the Firebase Console for reports

### Test Script
Run the verification script:
```bash
node scripts/test-crashlytics.js
```

## Privacy Considerations

- Crash reports include stack traces and device information
- User data is anonymized by default
- Custom attributes should not include sensitive information
- Crashlytics collection can be disabled for privacy-sensitive users

## Troubleshooting

### Common Issues

1. **Crashlytics not working in debug mode**
   - Crashlytics is disabled by default in debug builds
   - Use `setCrashlyticsCollectionEnabled(true)` to enable

2. **Reports not appearing in console**
   - Reports can take up to 5 minutes to appear
   - Ensure the app is properly configured with Firebase
   - Check that the app is not running in debugger mode

3. **Build errors**
   - Ensure all dependencies are installed: `npm install --legacy-peer-deps`
   - Clean and rebuild: `expo run:ios --clear` or `expo run:android --clear`
   - For Android: Check that Google Services plugin is properly applied

### Debug Logging
Enable debug logging to troubleshoot issues:
```typescript
// In your app initialization
crashlytics().setCrashlyticsCollectionEnabled(true);
console.log('Crashlytics enabled:', crashlytics().isCrashlyticsCollectionEnabled());
```

## Best Practices

1. **Error Context**: Always provide meaningful context when reporting errors
2. **User Privacy**: Don't include sensitive user data in crash reports
3. **Testing**: Use the test interface to verify functionality before release
4. **Monitoring**: Regularly check the Firebase Console for new issues
5. **Version Tracking**: Include version information in custom attributes

## Support

For issues with the Crashlytics integration:
1. Check the Firebase Console for error details
2. Review the test script output
3. Check the React Native Firebase documentation
4. Verify the iOS configuration files

## References

- [Firebase Crashlytics Documentation](https://firebase.google.com/docs/crashlytics)
- [React Native Firebase Crashlytics](https://rnfirebase.io/crashlytics/usage)
- [Expo Firebase Integration](https://docs.expo.dev/guides/using-firebase/)
