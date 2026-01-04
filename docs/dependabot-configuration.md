# Dependabot Configuration for React Native + Expo

## Overview

This document explains the Dependabot configuration for the BitSleuth Wallet, a React Native + Expo mobile application.

## Configuration File

The Dependabot configuration is located at `.github/dependabot.yml` and is configured to manage dependencies across four package ecosystems:

1. **npm** - JavaScript/TypeScript dependencies
2. **CocoaPods** - iOS native dependencies
3. **Gradle** - Android native dependencies
4. **GitHub Actions** - CI/CD workflow dependencies

## Package Ecosystems

### 1. NPM (JavaScript/TypeScript)

**Directory:** `/`  
**Schedule:** Weekly on Mondays at 09:00  
**PR Limit:** 10

#### Dependency Groups

We group related packages to reduce PR noise and ensure compatibility:

- **development-dependencies**: All dev dependencies with minor/patch updates
- **expo-sdk**: All Expo SDK packages that must be updated together
  - `expo`, `expo-*`, `@expo/*`
  - **Critical**: Expo packages are tightly coupled and should be updated in sync
- **react-native-firebase**: All Firebase packages for React Native
  - `@react-native-firebase/*`
  - Ensures Firebase modules remain compatible
- **babel**: All Babel-related packages
  - `@babel/*`, `babel-*`
  - Babel packages often have interdependencies
- **bitcoin**: All Bitcoin protocol and cryptographic packages
  - `bitcoinjs-lib`, `bip32`, `bip39`, `@scure/bip32`, `react-native-bip32-utils`
  - `@noble/*`, `tiny-secp256k1`, `bech32`, `bs58check`
  - **Critical**: Bitcoin protocol packages must maintain compatibility for wallet operations

#### Why These Groups?

**Expo SDK Grouping:**
- Expo SDK packages are interdependent and released together
- Updating individual packages can cause compatibility issues
- Example: `expo-router` requires specific versions of `expo` core

**React Native Firebase Grouping:**
- Firebase modules for React Native share common dependencies
- Must maintain version compatibility across modules
- Example: `@react-native-firebase/app` is required by all Firebase modules

**Babel Grouping:**
- Babel packages are part of a monorepo with shared versioning
- Mixing versions can cause compilation issues

**Bitcoin Protocol Grouping:**
- Bitcoin protocol packages (`bitcoinjs-lib`, `bip32`, `bip39`) work together for wallet operations
- Cryptographic primitives (`@noble/*`, `tiny-secp256k1`) must be compatible with Bitcoin libraries
- Encoding libraries (`bech32`, `bs58check`) need to match Bitcoin protocol versions
- Updating these packages independently can break transaction signing and address generation
- Example: `bitcoinjs-lib` v7 requires specific versions of `bip32` and `tiny-secp256k1`

### 2. CocoaPods (iOS)

**Directory:** `/ios`  
**Schedule:** Weekly on Mondays at 09:00  
**PR Limit:** 5

CocoaPods manages native iOS dependencies including:
- React Native pods
- Expo modules
- Firebase iOS SDKs
- Other native iOS libraries

**Labels:** `dependencies`, `ios`, `native`

### 3. Gradle (Android)

**Directory:** `/android`  
**Schedule:** Weekly on Mondays at 09:00  
**PR Limit:** 5

Gradle manages native Android dependencies including:
- React Native Android libraries
- Expo modules
- Firebase Android SDKs
- Google Play Services
- Other native Android libraries

**Labels:** `dependencies`, `android`, `native`

### 4. GitHub Actions

**Directory:** `/`  
**Schedule:** Monthly  
**PR Limit:** Default (5)

Manages GitHub Actions workflow dependencies to keep CI/CD pipelines secure and up-to-date.

**Labels:** `dependencies`, `github-actions`

## Changes from Previous Configuration

### Removed
- **radix-ui grouping**: Radix UI is a web-only component library not relevant for React Native mobile apps

### Added
- **CocoaPods ecosystem**: Critical for iOS native dependency management
- **Gradle ecosystem**: Critical for Android native dependency management
- **expo-sdk grouping**: Essential for Expo SDK compatibility
- **react-native-firebase grouping**: Ensures Firebase module compatibility
- **babel grouping**: Prevents Babel version conflicts

### Modified
- Updated npm label from `security` to `npm` for better categorization
- Added clarifying comments for React Native + Expo context

## Best Practices

### For Reviewers

When reviewing Dependabot PRs:

1. **Expo SDK updates**: Test thoroughly on both iOS and Android
2. **Firebase updates**: Verify native module linking still works
3. **Babel updates**: Run a full build to ensure no compilation errors
4. **Native dependencies**: Test on physical devices when possible

### PR Limits

We use conservative PR limits for native ecosystems (5 PRs each) because:
- Native updates often require manual testing
- Build times are longer for native code
- Platform-specific issues may arise

### Update Frequency

- **npm/CocoaPods/Gradle**: Weekly to stay current with security patches
- **GitHub Actions**: Monthly as workflow changes are less frequent

## Troubleshooting

### Dependabot Fails to Create PR

1. Check that directories exist (`/ios` has `Podfile`, `/android` has `build.gradle`)
2. Verify YAML syntax is valid
3. Check GitHub's Dependabot logs in the repository's Insights > Dependency graph > Dependabot

### Conflicting Updates

If Expo SDK updates conflict with other dependencies:
1. Prioritize Expo SDK updates first
2. Check [Expo SDK compatibility](https://docs.expo.dev/) docs
3. May need to pin certain packages temporarily

### Native Build Failures

After native dependency updates:
1. **iOS**: Run `cd ios && pod install && cd ..`
2. **Android**: Run `cd android && ./gradlew clean && cd ..`
3. Clear Metro cache: `npx expo start -c`

## References

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Expo SDK Versioning](https://docs.expo.dev/versions/latest/)
- [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/)
