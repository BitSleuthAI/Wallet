# Firebase Integration Guide

BitSleuth Wallet integrates with Firebase to provide comprehensive monitoring, error reporting, and release tracking capabilities. This guide covers all Firebase features integrated into the app.

## Overview

The app uses two Firebase services:

1. **Firebase Crashlytics** - Real-time error reporting, crash analytics, and release monitoring
2. **Firebase Performance Monitoring** - App performance tracking and optimization

## Architecture

All Firebase services are managed through a unified service layer:

```
services/
├── crashlytics-service.ts       # Error reporting, crash tracking, and release monitoring
├── performance-service.ts       # Performance monitoring and metrics
└── firebase-service.ts          # Unified Firebase service wrapper
```

## Firebase Crashlytics

### Features

- **Crash Reporting**: Automatic crash detection and reporting
- **Error Logging**: Manual error reporting with custom context
- **Release Monitoring**: Automatic tracking of crash-free statistics per app version
- **Custom Attributes**: Tag errors with wallet/transaction metadata
- **User Identification**: Track errors per user (anonymized)

### Usage

```typescript
import crashlyticsService from '@/services/crashlytics-service';

// Log a non-fatal error
crashlyticsService.recordError(error, {
  operation: 'send_transaction',
  walletId: wallet.id,
});

// Log custom messages
crashlyticsService.log('User initiated transaction');

// Set custom attributes
crashlyticsService.setAttributes({
  walletType: 'native_segwit',
  platform: Platform.OS,
});

// Track wallet operations
crashlyticsService.trackWalletOperation('create', walletId, true);

// Track transactions
crashlyticsService.trackTransaction('send', amount, success);

// Track authentication events
crashlyticsService.trackAuthEvent('login', 'biometric', true);
```

### Configuration

Crashlytics is configured in `firebase.json`:

```json
{
  "react-native": {
    "crashlytics_collection_enabled": false,
    "crashlytics_debug_enabled": true,
    "crashlytics_disable_auto_disabler": true
  }
}
```

**Note**: Crashlytics collection is disabled by default and enabled programmatically at runtime to respect user privacy.

## Firebase Performance Monitoring

### Features

- **Automatic Traces**: App startup, screen rendering
- **Custom Traces**: Track specific operations (wallet creation, transactions)
- **HTTP Metrics**: Monitor Bitcoin API calls and network performance
- **Custom Metrics**: Add custom performance data to traces

### Usage

```typescript
import performanceService from '@/services/performance-service';

// Track wallet operations
const stopTrace = await performanceService.trackWalletOperation('create');
// ... perform operation
await stopTrace();

// Track API calls
const apiMetric = await performanceService.trackBitcoinAPICall(
  'https://blockstream.info/api/tx/...',
  'GET'
);
await apiMetric.start();
// ... make API call
await apiMetric.success(responseSize);

// Track screen rendering
const stopScreenTrace = await performanceService.trackScreenRender('SendScreen');
// ... screen renders
await stopScreenTrace();

// Custom traces
const trace = await performanceService.startTrace('custom_operation');
trace.putAttribute('operation_type', 'utxo_selection');
trace.putMetric('utxo_count', 5);
await trace.stop();
```

### Configuration

Performance Monitoring is configured in `firebase.json`:

```json
{
  "react-native": {
    "perf_auto_collection_enabled": true,
    "perf_collection_deactivated": false
  }
}
```

### Android Configuration

The Performance plugin is automatically applied in `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.firebase.firebase-perf'
```

### iOS Configuration

Performance Monitoring pods are automatically linked via CocoaPods autolinking.

## Unified Firebase Service

For convenience, all Firebase services are accessible through a single unified service:

```typescript
import firebaseService from '@/services/firebase-service';

// Initialize all Firebase services
await firebaseService.initialize();

// Check status
const status = firebaseService.getStatus();
console.log('Crashlytics:', status.crashlytics);
console.log('Performance:', status.performance);

// Track wallet operation (combined performance + crashlytics)
await firebaseService.trackWalletOperation('create', walletId, async () => {
  // Your wallet creation logic here
});

// Track transaction operation (combined performance + crashlytics)
await firebaseService.trackTransactionOperation('send', amount, async () => {
  // Your transaction logic here
});

// Track screen views
const stopTrace = await firebaseService.trackScreenView('HomeScreen');
// Screen renders...
await stopTrace();
```

## Build Configuration

### Android

The Firebase plugins are configured in `android/build.gradle`:

```gradle
buildscript {
  dependencies {
    classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.6'
    classpath 'com.google.firebase:perf-plugin:2.0.1'
    classpath 'com.google.gms:google-services:4.4.1'
  }
}
```

And applied in `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'
apply plugin: 'com.google.firebase.firebase-perf'
apply plugin: 'com.google.firebase.crashlytics'
```

### iOS

Firebase pods are automatically linked via CocoaPods autolinking. The `GoogleService-Info.plist` file is referenced in `app.json`:

```json
{
  "expo": {
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

## Privacy & Analytics

**Important**: BitSleuth Wallet does NOT use Firebase Analytics. All analytics features are explicitly disabled:

```json
{
  "react-native": {
    "analytics_auto_collection_enabled": false,
    "analytics_collection_deactivated": false,
    "analytics_idfv_collection_enabled": false,
    "analytics_default_allow_analytics_storage": false,
    "analytics_default_allow_ad_storage": false,
    "analytics_default_allow_ad_user_data": false,
    "analytics_default_allow_ad_personalization_signals": false,
    "google_analytics_registration_with_ad_network_enabled": false,
    "google_analytics_automatic_screen_reporting_enabled": false
  }
}
```

Only the following Firebase services are used:
- **Crashlytics**: For error reporting and release monitoring (no user tracking)
- **Performance Monitoring**: For app performance metrics (no user tracking)

## Testing

### Test Script

Run the Firebase integration test script to verify configuration:

```bash
node scripts/test-firebase-performance.js
```

This script checks:
- Package dependencies
- Plugin configuration
- Build configuration (Android & iOS)
- Service file availability

### Manual Testing

1. **Crashlytics**:
   - Use the test buttons in the app to trigger test crashes
   - Check Firebase Console for crash reports

2. **Performance Monitoring**:
   - Navigate through the app
   - Perform wallet operations
   - Check Firebase Console for performance data

## Firebase Console

Access your Firebase project console at:
- **Project Overview**: https://console.firebase.google.com/project/YOUR_PROJECT_ID
- **Crashlytics**: https://console.firebase.google.com/project/YOUR_PROJECT_ID/crashlytics (includes Release Monitoring)
- **Performance**: https://console.firebase.google.com/project/YOUR_PROJECT_ID/performance

## Troubleshooting

### Crashlytics Not Reporting

1. Ensure you're testing with a release build (not debug)
2. Check that `crashlytics_collection_enabled` is set to `true` at runtime
3. Verify `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are present
4. Rebuild the app after configuration changes

### Performance Data Not Appearing

1. Performance data may take up to 24 hours to appear in Firebase Console
2. Ensure `perf_auto_collection_enabled` is set to `true`
3. Test with release builds for more accurate data
4. Check Firebase Console for any configuration errors

## Best Practices

1. **Error Handling**: Always use try-catch blocks and report errors to Crashlytics
2. **Performance Tracking**: Track long-running operations and API calls
3. **Privacy**: Never log sensitive information (private keys, mnemonics, addresses)
4. **Testing**: Test Firebase integration in development builds before production
5. **Release Monitoring**: Monitor crash-free statistics in Crashlytics for each app version

## Expo Go Limitations

Firebase services are **not available** in Expo Go. You must use a development build or production build to test Firebase features:

```bash
# Create development build
npx expo prebuild --clean
npx expo run:ios
npx expo run:android

# Or use EAS Build
eas build --profile development --platform all
```

## References

- [React Native Firebase Documentation](https://rnfirebase.io/)
- [Firebase Crashlytics](https://firebase.google.com/docs/crashlytics)
- [Firebase Performance Monitoring](https://firebase.google.com/docs/perf-mon)
