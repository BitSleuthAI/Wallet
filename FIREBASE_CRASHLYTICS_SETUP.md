# Firebase Crashlytics Setup Guide

## Current Status

✅ **Dependencies**: Firebase packages are installed  
✅ **Configuration Files**: Google services files are present  
✅ **App Configuration**: Firebase plugins are configured in app.json  
✅ **Service Implementation**: Crashlytics service is implemented  
❌ **Runtime Environment**: Currently running in Expo Go (Crashlytics unavailable)

## Why Crashlytics Isn't Working

**Firebase Crashlytics does NOT work in Expo Go.** This is expected behavior because:

1. **Native Code Requirement**: Crashlytics requires native compilation
2. **Expo Go Sandbox**: Expo Go runs in a sandboxed environment that doesn't support native Firebase modules
3. **Development Build Required**: You need a custom development build or production build

## Solutions

### Option 1: Create a Development Build (Recommended)

To test Crashlytics, you need to create a development build:

#### For iOS:
```bash
# Install EAS CLI if you haven't already
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Build for iOS device/simulator
eas build --platform ios --profile development

# Or run locally (requires Xcode)
npx expo run:ios
```

#### For Android:
```bash
# Build for Android device/emulator
eas build --platform android --profile development

# Or run locally (requires Android Studio)
npx expo run:android
```

### Option 2: Test in Production Build

Crashlytics works in production builds:

```bash
# Build for production
eas build --platform all --profile production
```

## Configuration Details

### ✅ Dependencies (Already Installed)
```json
{
  "@react-native-firebase/app": "^23.2.0",
  "@react-native-firebase/crashlytics": "^23.3.0"
}
```

### ✅ App Configuration (Already Configured)
```json
{
  "plugins": [
    [
      "@react-native-firebase/app",
      {
        "ios": {
          "useFrameworks": "static",
          "googleServicesFile": "./ios/BitSleuthWallet/GoogleService-Info.plist"
        },
        "android": {
          "googleServicesFile": "./android/app/google-services.json"
        }
      }
    ],
    "@react-native-firebase/crashlytics"
  ]
}
```

### ✅ Configuration Files (Already Present)
- **Android**: `android/app/google-services.json`
- **iOS**: `ios/BitSleuthWallet/GoogleService-Info.plist`
- **Project ID**: `bitsleuth`

## Testing Crashlytics

### Current Behavior in Expo Go
When you click the test buttons in Settings > Crashlytics Testing:
- **Test Log**: Shows "Expo Go - Unavailable" message
- **Test Error**: Shows "Expo Go - Unavailable" message  
- **Test Crash**: Shows "Expo Go - Unavailable" message
- **Console**: Shows mock Crashlytics logs

### Expected Behavior in Development/Production Build
Once you create a development build:
- **Test Log**: Sends log to Firebase Console
- **Test Error**: Records error in Firebase Console
- **Test Crash**: Forces app crash and reports to Firebase
- **Console**: Shows "Live" status instead of "Mock"

## Verification Steps

### 1. Check Current Environment
The app automatically detects the environment:
```typescript
// In crashlytics-service.ts
const envInfo = crashlyticsService.getEnvironmentInfo();
console.log('Environment:', envInfo);
// { isExpoGo: true, isInitialized: false, platform: 'ios' }
```

### 2. Firebase Console
Once running in a development build:
1. Go to [Firebase Console](https://console.firebase.google.com/project/bitsleuth/crashlytics)
2. Navigate to Crashlytics section
3. Test the buttons in Settings
4. Check for logs, errors, and crash reports

## Troubleshooting

### If Crashlytics Still Doesn't Work in Development Build

1. **Check Firebase Project Configuration**:
   - Ensure bundle ID matches: `ai.bitsleuth.wallet`
   - Verify GoogleService files are correctly placed

2. **Check Console Logs**:
   ```
   ✅ Firebase Crashlytics module loaded successfully
   📱 Firebase App Name: [DEFAULT]
   🔧 Firebase Project ID: bitsleuth
   ✅ Crashlytics service initialized successfully
   ```

3. **Verify Build Configuration**:
   - Make sure you're not running in Expo Go
   - Check that native modules are properly linked

4. **Test Network Connectivity**:
   - Ensure device has internet connection
   - Check if Firebase services are accessible

## Next Steps

1. **Create Development Build**: Use `npx expo run:ios` or `npx expo run:android`
2. **Test Crashlytics**: Use the test buttons in Settings
3. **Verify in Firebase Console**: Check for logs and crash reports
4. **Deploy to Production**: Once verified, deploy with confidence

## Additional Resources

- [React Native Firebase Documentation](https://rnfirebase.io/crashlytics/usage)
- [Expo Development Builds](https://docs.expo.dev/development/build/)
- [Firebase Console](https://console.firebase.google.com/project/bitsleuth/crashlytics)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

**Summary**: Your Firebase Crashlytics is properly configured but requires a development build to function. The "not working" behavior in Expo Go is completely expected and normal.