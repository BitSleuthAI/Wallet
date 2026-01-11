# Build Guide for Contributors

This guide will help you set up your development environment and build BitSleuth Wallet from source.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Firebase Configuration](#firebase-configuration)
- [iOS Setup](#ios-setup)
- [Android Setup](#android-setup)
- [Running the App](#running-the-app)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required for All Platforms

- **Node.js** 18.17+ (Node 20 recommended)
  ```bash
  node --version  # Should be v18.17.0 or higher
  ```

- **npm** or **bun** package manager
  ```bash
  npm --version   # Should be v10.2.4 or higher
  ```

- **Git**
  ```bash
  git --version
  ```

### Required for iOS Development (macOS only)

- **macOS** (Monterey 12.0 or later)
- **Xcode** 15.0 or later
  - Install from the Mac App Store
  - Install Xcode Command Line Tools:
    ```bash
    xcode-select --install
    ```

- **CocoaPods**
  ```bash
  sudo gem install cocoapods
  pod --version
  ```

### Required for Android Development

- **Android Studio** with the following:
  - Android SDK Platform 35 (Android 15)
  - Android SDK Build-Tools 35.0.0
  - Android SDK Platform-Tools
  - Android Emulator (optional, for testing)

- **Java Development Kit (JDK)** 17 or higher
  ```bash
  java -version
  ```

- **Environment Variables** (add to `~/.bashrc`, `~/.zshrc`, or equivalent):
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
  # OR
  export ANDROID_HOME=$HOME/Android/Sdk  # Linux
  
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  export PATH=$PATH:$ANDROID_HOME/tools
  export PATH=$PATH:$ANDROID_HOME/tools/bin
  ```

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/BitSleuthAI/Wallet.git
cd Wallet
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

This will install all JavaScript dependencies including Expo, React Native, and other packages.

### 3. Install iOS Dependencies (macOS only)

```bash
cd ios
pod install
cd ..
```

This installs native iOS dependencies via CocoaPods.

## Firebase Configuration

**IMPORTANT**: You must set up your own Firebase project before running the app. The repository does not include Firebase configuration files for security reasons.

### Step-by-Step Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" or use an existing project
   - Follow the wizard to create your project
   - **IMPORTANT**: When asked about Google Analytics, select "Not now" or disable it (we don't use Analytics)

2. **Add iOS App to Firebase**
   - In Firebase Console, click the iOS icon
   - Enter iOS bundle ID: `com.bitsleuthwallet` (or your custom bundle ID)
   - Download `GoogleService-Info.plist`
   - Place it in **two locations**:
     ```
     ios/BitSleuthWallet/GoogleService-Info.plist
     GoogleService-Info.plist  (root directory)
     ```

3. **Add Android App to Firebase**
   - In Firebase Console, click the Android icon
   - Enter Android package name: `com.bitsleuthwallet` (or your custom package name)
   - Download `google-services.json`
   - Place it in **two locations**:
     ```
     android/app/google-services.json
     google-services.json  (root directory)
     ```

4. **Enable Firebase Services**
   
   In the Firebase Console, enable the following services:
   
   - **Crashlytics** (for error reporting)
     - Go to Crashlytics in the left sidebar
     - Click "Enable Crashlytics"
     - Follow the setup wizard
   
   - **Performance Monitoring** (for app performance)
     - Go to Performance in the left sidebar
     - Click "Get started"
     - Follow the setup wizard
   
   - **DISABLE Google Analytics** (privacy requirement)
     - Go to Project Settings > Integrations
     - If Analytics is enabled, disable it
     - This is a **strict requirement** for privacy compliance

5. **Verify Configuration**
   
   Run the Firebase connectivity test:
   ```bash
   node scripts/test-firebase-connectivity.js
   ```
   
   You should see:
   ```
   ✅ Firebase is properly configured!
   ✅ Crashlytics is enabled
   ✅ Performance Monitoring is enabled
   ✅ Analytics is DISABLED (correct for privacy)
   ```

For detailed Firebase setup instructions, see [FIREBASE_SETUP.md](archive/FIREBASE_SETUP.md).

## iOS Setup

### 1. Configure Xcode Project

Open the iOS project in Xcode:
```bash
cd ios
open BitSleuthWallet.xcworkspace  # Note: .xcworkspace, not .xcodeproj
```

### 2. Configure Signing

- In Xcode, select the project in the left sidebar
- Select the "BitSleuthWallet" target
- Go to "Signing & Capabilities" tab
- Select your development team
- Xcode will automatically manage provisioning profiles

### 3. Verify Pod Installation

If you encounter issues with pods:
```bash
cd ios
pod deintegrate
pod install
cd ..
```

## Android Setup

### 1. Open in Android Studio (Optional)

```bash
cd android
# Open this directory in Android Studio
```

### 2. Create Local Properties File

Create `android/local.properties`:
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk  # macOS
# OR
sdk.dir=/home/YOUR_USERNAME/Android/Sdk  # Linux
# OR  
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk  # Windows
```

### 3. Verify Gradle Build

```bash
cd android
./gradlew clean
./gradlew assembleDebug
cd ..
```

## Running the App

### Start Metro Bundler

In one terminal, start the Metro bundler:
```bash
npm start
```

This will show you a QR code and a menu of options.

### Run on iOS Simulator

In a new terminal:
```bash
npm run ios
```

Or specify a device:
```bash
npx expo run:ios --device "iPhone 15 Pro"
```

### Run on Android Emulator

Make sure you have an Android emulator running, then:
```bash
npm run android
```

Or use a specific emulator:
```bash
npx expo run:android --device emulator-5554
```

### Run on Physical Device

1. Start with tunnel mode for network access:
   ```bash
   npm run start-tunnel
   ```

2. Install Expo Go app on your device
3. Scan the QR code shown in the terminal

Alternatively, for full native builds on physical devices:
```bash
# iOS (requires USB connection and device registered in Apple Developer)
npm run ios --device

# Android (requires USB debugging enabled)
npm run android --device
```

## Building for Production

### Using Expo Application Services (EAS)

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Configure EAS Build**
   
   The project already includes `eas.json` configuration.

4. **Build for iOS**
   ```bash
   eas build --platform ios --profile production
   ```

5. **Build for Android**
   ```bash
   eas build --platform android --profile production
   ```

6. **Build for Both Platforms**
   ```bash
   eas build --platform all --profile production
   ```

### Local Production Builds

For iOS:
```bash
cd ios
xcodebuild -workspace BitSleuthWallet.xcworkspace \
  -scheme BitSleuthWallet \
  -configuration Release \
  -archivePath ./build/BitSleuthWallet.xcarchive \
  archive
```

For Android:
```bash
cd android
./gradlew bundleRelease
# APK will be at: android/app/build/outputs/bundle/release/app-release.aab
```

## Troubleshooting

### Common Issues

#### Metro Bundler Won't Start

```bash
# Clear cache and restart
npx expo start -c
```

#### iOS Build Fails

```bash
# Reinstall pods
cd ios
pod deintegrate
pod install
cd ..

# Clean build folder in Xcode
# Product > Clean Build Folder (Shift + Cmd + K)
```

#### Android Build Fails

```bash
# Clean Gradle build
cd android
./gradlew clean
cd ..

# Or with more aggressive cleaning
cd android
rm -rf .gradle
./gradlew clean
cd ..
```

#### Firebase Not Working

- Verify `google-services.json` is in `android/app/`
- Verify `GoogleService-Info.plist` is in `ios/BitSleuthWallet/`
- Check that only Crashlytics is enabled (not Analytics)
- Run the connectivity test: `node scripts/test-firebase-connectivity.js`

#### Biometric Authentication Not Working

- **iOS**: Check `Info.plist` has `NSFaceIDUsageDescription`
- **Android**: Check `AndroidManifest.xml` has biometric permissions
- Ensure device has biometrics enrolled
- Test with: `node scripts/test-biometric.js`

#### TypeScript Errors

```bash
# Regenerate TypeScript config
npx expo customize tsconfig.json

# Check for errors
npx tsc --noEmit
```

#### Dependency Issues

```bash
# Remove and reinstall
rm -rf node_modules package-lock.json
npm install

# On iOS, also reinstall pods
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### Getting Help

If you're still stuck:

1. **Check existing issues**: [GitHub Issues](https://github.com/BitSleuthAI/Wallet/issues)
2. **Search discussions**: [GitHub Discussions](https://github.com/BitSleuthAI/Wallet/discussions)
3. **Create a new issue**: Include:
   - Your OS and version
   - Node.js version
   - Xcode/Android Studio version
   - Complete error message
   - Steps you've already tried

## Next Steps

Once you have the app running:

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
2. Check [docs/ARCHITECTURE.md](ARCHITECTURE.md) to understand the codebase structure
3. Review open issues labeled `good-first-issue` for beginner-friendly tasks
4. Join the discussion on [GitHub Discussions](https://github.com/BitSleuthAI/Wallet/discussions)

## Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [bitcoinjs-lib Documentation](https://github.com/bitcoinjs/bitcoinjs-lib)
- [BIP Standards](https://github.com/bitcoin/bips)

---

**Happy building! 🚀**
