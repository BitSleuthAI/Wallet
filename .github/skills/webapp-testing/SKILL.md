---
name: webapp-testing
description: Toolkit for interacting with and testing React Native + Expo mobile applications on iOS and Android. Supports verifying app functionality, debugging UI behavior, running the development server, and testing mobile-specific features.
---

# Mobile App Testing (React Native + Expo)

This skill enables comprehensive testing and debugging of React Native mobile applications built with Expo for iOS and Android platforms.

## When to Use This Skill

Use this skill when you need to:
- Start and test the Expo development server
- Verify mobile app functionality on iOS/Android simulators or physical devices
- Debug React Native UI behavior and interactions
- Test mobile-specific features (biometrics, camera, QR scanning)
- Validate Bitcoin wallet operations and transactions
- Check navigation flows and screen transitions
- Test authentication flows (PIN, biometric, auto-lock)
- Verify wallet creation, import, and management features

## Prerequisites

- Node.js 18.17+ (Node 20 recommended) installed on the system
- npm or bun package manager
- Expo CLI (installed automatically with dependencies)
- **For iOS testing**: macOS with Xcode 15+
- **For Android testing**: Android Studio with SDK 34+
- **For device testing**: Expo Go app or configured simulator/emulator
- Firebase configuration files (`google-services.json` for Android, `GoogleService-Info.plist` for iOS)

## Core Capabilities

### 1. Development Server Management
- Start Metro bundler with `npm start`
- Run on iOS simulator with `npm run ios`
- Run on Android emulator with `npm run android`
- Start with tunnel for physical devices with `npm run start-tunnel`
- Clear cache and restart with `npx expo start -c`

### 2. Mobile App Testing
- Test wallet creation and import flows
- Verify Bitcoin send/receive transactions
- Test QR code scanning functionality
- Validate biometric authentication (Face ID, Touch ID)
- Test PIN setup and verification
- Verify auto-lock functionality
- Test multi-wallet management
- Validate fee bumping (RBF/CPFP)
- Test coin control and UTXO selection

### 3. Debugging & Troubleshooting
- View Metro bundler logs
- Inspect React Native error boundaries
- Test Firebase Crashlytics integration
- Debug iOS/Android specific issues
- Clear build caches
- Reinstall dependencies and pods

## Usage Examples

### Example 1: Start Development Server
```bash
# Start Metro bundler
npm start

# Or with cache clear for troubleshooting
npx expo start -c
```

### Example 2: Run on iOS Simulator
```bash
# Run the app on iOS simulator
npm run ios

# Or with debug mode
npm run ios-debug
```

### Example 3: Run on Android Emulator
```bash
# Run the app on Android emulator
npm run android

# Or clean build
cd android && ./gradlew clean && cd .. && npm run android
```

### Example 4: Test on Physical Device with Tunnel
```bash
# Start with tunnel mode for physical device testing
npm run start-tunnel
# Scan QR code with Expo Go app
```

### Example 5: Test Specific Features
```bash
# Test Firebase Crashlytics
node scripts/test-crashlytics-simple.js

# Test biometric authentication
node scripts/test-biometric.js

# Test Firebase connectivity
node scripts/test-firebase-connectivity.js
```

## Guidelines

1. **Always start fresh** - Clear cache with `npx expo start -c` when encountering unexpected behavior
2. **Test on both platforms** - iOS and Android may behave differently for native features
3. **Use physical devices for native features** - Biometrics, camera, and other hardware features require real devices
4. **Check Firebase configuration** - Ensure `google-services.json` and `GoogleService-Info.plist` are properly configured
5. **Monitor Metro bundler output** - Watch for errors and warnings during development
6. **Test with small Bitcoin amounts** - Always test wallet functionality with minimal funds first
7. **Verify security features** - Test PIN, biometric auth, and auto-lock on actual devices
8. **Test offline scenarios** - Verify app behavior when network is unavailable
9. **Use manual test scripts** - Run scripts in `/scripts` directory for specific feature validation

## Common Patterns

### Pattern: Troubleshoot Metro Bundler Issues
```bash
# Clear Metro cache and restart
npx expo start -c
```

### Pattern: Fix iOS Build Issues
```bash
# Reinstall CocoaPods dependencies
cd ios && pod deintegrate && pod install && cd ..
```

### Pattern: Fix Android Build Issues
```bash
# Clean Gradle build
cd android && ./gradlew clean && cd ..
```

### Pattern: Test Wallet Creation Flow
```bash
# Start app and manually test:
# 1. Launch app
# 2. Tap "Create New Wallet"
# 3. Set PIN
# 4. Backup recovery phrase
# 5. Verify wallet appears on home screen
```

### Pattern: Test Bitcoin Transaction
```bash
# Start app and manually test:
# 1. Navigate to Send screen
# 2. Scan or paste recipient address
# 3. Enter amount
# 4. Select fee level
# 5. Review and confirm transaction
# 6. Verify transaction appears in history
```

### Pattern: Test Authentication
```bash
# Start app and manually test:
# 1. Enable auto-lock in settings
# 2. Lock app or wait for timeout
# 3. Reopen app
# 4. Verify PIN/biometric prompt appears
# 5. Authenticate and verify access granted
```

### Pattern: Run Manual Test Scripts
```bash
# Test Firebase integration
node scripts/test-firebase-connectivity.js

# Test crashlytics reporting
node scripts/test-crashlytics-simple.js

# Test biometric setup
node scripts/test-biometric.js
```

## Testing Key Features

### Wallet Operations
- **Create Wallet**: Test BIP39 mnemonic generation and wallet creation
- **Import Wallet**: Test importing 12/15/18/21/24-word mnemonics
- **Multi-Wallet**: Test creating and switching between multiple wallets
- **Backup & Recovery**: Test recovery phrase backup and verification

### Bitcoin Transactions
- **Send**: Test sending Bitcoin with different fee levels
- **Receive**: Test generating and displaying receive addresses
- **Transaction History**: Test viewing transaction details and status
- **Fee Bumping**: Test RBF and CPFP fee bumping for stuck transactions

### Security & Authentication
- **PIN Setup**: Test PIN creation and verification
- **Biometric Auth**: Test Face ID/Touch ID setup and authentication
- **Auto-Lock**: Test auto-lock timeout and unlock flow
- **Recovery Phrase**: Test phrase backup and secure storage

### Advanced Features
- **Coin Control**: Test manual UTXO selection
- **XPUB Export**: Test extended public key generation
- **Address Management**: Test viewing all wallet addresses
- **Fee Settings**: Test custom fee configuration

## Limitations

- **Requires native environment**: Cannot test iOS features without macOS/Xcode
- **Simulators have limitations**: Some features (biometrics, camera) require physical devices
- **Network dependent**: Bitcoin operations require internet connectivity to Blockstream API
- **Manual testing required**: No automated E2E test framework currently configured
- **Platform-specific issues**: iOS and Android may have different behaviors for native modules
- **Firebase required**: App requires proper Firebase configuration to run
- **No web support**: This is a mobile-only app (iOS/Android), cannot run in browser
