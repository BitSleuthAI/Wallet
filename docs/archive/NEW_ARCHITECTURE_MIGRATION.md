# Expo New Architecture Migration Guide

This document outlines the migration from Expo Legacy Architecture to Expo New Architecture (React Native's new architecture with Fabric and TurboModules).

## What Changed

### Configuration Files

#### 1. app.json
- Set `newArchEnabled: true` at the top level of the Expo config
- Updated `ios.googleServicesFile` path from `./ios/BitSleuthWallet/GoogleService-Info.plist` to `./GoogleService-Info.plist` (root directory) for compatibility with prebuild

#### 2. Android (android/gradle.properties)
- Changed `newArchEnabled=false` to `newArchEnabled=true`
- Added `edgeToEdgeEnabled=true` for edge-to-edge display support
- Enabled `org.gradle.parallel=true` for faster builds

#### 3. iOS (ios/Podfile.properties.json)
- Changed `"newArchEnabled": "false"` to `"newArchEnabled": "true"`
- Added `"ios.forceStaticLinking": "[]"` for better compatibility

#### 4. Native Code Updates
- **Android MainApplication.kt**: Updated to use the new architecture entry point with `loadReactNative(this)` and `DefaultNewArchitectureEntryPoint`
- **iOS Podfile**: Updated to properly configure environment variables for the New Architecture (`RCT_NEW_ARCH_ENABLED`, `RCT_USE_RN_DEP`, `RCT_USE_PREBUILT_RNCORE`)

## Benefits of New Architecture

1. **Better Performance**: Fabric renderer provides faster rendering and smoother animations
2. **Improved Interoperability**: TurboModules enable better JavaScript-to-Native communication
3. **Modern React Features**: Full support for React 18+ features like concurrent rendering
4. **Future-Proof**: All new React Native development is focused on the New Architecture

## Building the Project

### Prerequisites
- Node.js 18+ 
- Expo CLI (`npm install -g expo-cli` or use `npx expo`)
- For iOS: Xcode 14+ and CocoaPods
- For Android: Android Studio with SDK 35 and JDK 17

### iOS Build

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install iOS pods (macOS only):
   ```bash
   cd ios && pod install && cd ..
   ```

3. Run the app:
   ```bash
   npm run ios
   ```

### Android Build

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run android
   ```

### Using EAS Build

For production builds, use EAS Build which handles all the native dependencies:

```bash
# Development build
eas build --profile development --platform all

# Preview build
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all
```

## Troubleshooting

### iOS Build Issues

1. **Pods not installing**: Clean and reinstall
   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod install
   cd ..
   ```

2. **Xcode build fails**: Clean build folder
   - Open Xcode
   - Product → Clean Build Folder
   - Try building again

### Android Build Issues

1. **Gradle sync fails**: Clean and rebuild
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

2. **NDK/SDK issues**: Ensure you have the correct SDK version (35) and NDK version installed

### General Issues

1. **Metro bundler cache**: Clear cache and restart
   ```bash
   npm start -- --clear
   ```

2. **Node modules**: Reinstall dependencies
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## Compatibility Notes

- All Expo SDK 54 modules are compatible with the New Architecture
- Firebase Crashlytics is configured and compatible
- Custom native modules may need updates for New Architecture compatibility
- React Native 0.81.5 with Hermes is fully supported

## References

- [Expo New Architecture Documentation](https://docs.expo.dev/guides/new-architecture/)
- [React Native New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [Fabric Renderer](https://reactnative.dev/architecture/fabric-renderer)
- [TurboModules](https://reactnative.dev/architecture/turbo-modules)

## Verification

To verify the New Architecture is enabled:

1. Check Android:
   ```bash
   cat android/gradle.properties | grep newArchEnabled
   # Should output: newArchEnabled=true
   ```

2. Check iOS:
   ```bash
   cat ios/Podfile.properties.json | grep newArchEnabled
   # Should output: "newArchEnabled": "true"
   ```

3. Check app.json:
   ```bash
   cat app.json | grep newArchEnabled
   # Should output: "newArchEnabled": true
   ```
