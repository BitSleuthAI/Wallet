# BitSleuth Wallet

<div align="center">

**A professional-grade, non-custodial Bitcoin wallet for iOS and Android**

[![Version](https://img.shields.io/badge/version-1.1.6-blue.svg)](https://github.com/bitsleuth/wallet)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey.svg)](https://github.com/bitsleuth/wallet)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61dafb.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-000020.svg)](https://expo.dev/)
[![New Architecture](https://img.shields.io/badge/New%20Architecture-Enabled-green.svg)](https://reactnative.dev/architecture/landing-page)

*Self-custody Bitcoin wallet with enterprise-grade security and modern UX*

</div>

---

## 🚀 Overview

BitSleuth Wallet is a client-side Bitcoin wallet built with React Native and Expo, designed for iOS and Android platforms. All sensitive operations—seed generation, key derivation, transaction signing, and encryption—happen exclusively on your device. **Your private keys never leave your device**, ensuring complete control over your Bitcoin.

### Key Highlights

- 🔒 **Complete Self-Custody**: Non-custodial design with client-side cryptography
- 🎯 **Bitcoin Native**: BIP32/39/84 compliant with Native SegWit (Bech32) addresses
- 🎨 **Modern UX**: Beautiful, intuitive interface with dark/light themes
- 🔐 **Multi-Layer Security**: Biometric authentication, PIN protection, and auto-lock
- 💪 **Advanced Features**: Coin control, RBF/CPFP fee bumping, XPUB export
- 📱 **Cross-Platform**: Optimized for both iOS and Android
- 🌍 **Multi-Currency**: Real-time price conversion (USD, EUR, GBP)

---

## ✨ Features

### Core Wallet Features
- ✅ **Wallet Management**
  - Create unlimited wallets with BIP39 mnemonic generation
  - Import existing wallets (12/15/18/21/24-word mnemonics)
  - Custom wallet names and color themes
  - Switch between multiple wallets seamlessly
  
- ✅ **Bitcoin Transactions**
  - Send and receive Bitcoin with QR code support
  - Native SegWit (Bech32) addresses at `m/84'/0'/0'`
  - Custom transaction fee settings (slow/normal/fast/custom)
  - Real-time balance updates and confirmations
  
- ✅ **Transaction History**
  - Complete transaction history with detailed views
  - Transaction explorer with full details
  - Real-time status updates (pending/confirmed)
  - Multi-currency price display

### Advanced Features
- 🎯 **Coin Control**
  - Manual UTXO selection for transactions
  - Advanced privacy and fee optimization
  
- ⚡ **Fee Bumping**
  - Replace-By-Fee (RBF) for stuck transactions
  - Child-Pays-For-Parent (CPFP) support
  - Custom fee adjustment interface
  
- 🔑 **Extended Public Keys**
  - Generate and export XPUB/YPUB/ZPUB
  - Read-only wallet integration support
  
- 🏠 **Address Management**
  - View all generated addresses
  - Address details with balance and transaction history
  - Automatic address generation with gap limit management

### Security Features
- 🔐 **Multi-Factor Authentication**
  - Face ID / Touch ID biometric authentication
  - Secure PIN protection with configurable requirements
  - Auto-lock with customizable timeout (1min to 1hour)
  - Passkeys/WebAuthn support (experimental)
  
- 🛡️ **Privacy & Security**
  - Recovery phrase backup and verification
  - Secure local storage with encryption
  - No user tracking or analytics
  - Firebase Crashlytics ONLY for error reporting

### User Experience
- 🎨 **Beautiful Design**
  - Modern, intuitive interface
  - Automatic dark/light theme switching
  - Custom wallet color themes
  - Smooth animations and haptic feedback
  - Native iOS liquid glass effect on tabs (iOS 18+)
  
- 📊 **Real-Time Data**
  - Live Bitcoin price updates
  - Multi-currency support (USD, EUR, GBP)
  - Network fee recommendations
  - Transaction status notifications
  - Automatic data refresh on app updates (ensures fresh balance, transactions, addresses, and UTXOs after each update)

---

## 🛠 Tech Stack

### Core Framework
- **React Native** 0.81.5 - Cross-platform mobile framework with New Architecture enabled
- **Expo** SDK 54 - Development and build platform
- **TypeScript** 5.8 - Type-safe development
- **React** 19.1 - UI library

### Bitcoin & Cryptography
- **bitcoinjs-lib** 6.1.7 - Bitcoin transaction creation and signing
- **bip32** / **bip39** - HD wallet key derivation and mnemonic generation
- **@noble/secp256k1** 2.3 - Elliptic curve cryptography
- **@noble/hashes** 1.8 - Cryptographic hash functions
- **bech32** - Native SegWit address encoding

### State & Data Management
- **Zustand** 5.0 - Lightweight state management
- **@tanstack/react-query** 5.87 - Server state and caching
- **AsyncStorage** 2.1 - Secure local data persistence

### UI & Navigation
- **Expo Router** 5.1 - File-based navigation
- **NativeWind** 4.1 - Tailwind CSS for React Native
- **React Navigation** 7.1 - Navigation library
- **Lucide React Native** - Modern icon set
- **React Native Reanimated** 4.1 - Smooth animations
- **Expo Glass Effect** 0.1.4 - Native iOS liquid glass effect (iOS 18+)

### Platform Services
- **Expo Local Authentication** - Biometric authentication (Face ID, Touch ID)
- **Expo Camera** - QR code scanning
- **Expo Haptics** - Tactile feedback
- **React Native Biometrics** - Advanced biometric features
- **Firebase Crashlytics** - Error tracking (NO analytics)

### External APIs
- **Blockstream Esplora API** - Transaction data, UTXOs, and network fees
- **CoinGecko API** - Real-time Bitcoin market data

---

## 📋 Requirements

### Development Environment
- **Node.js** 18.17+ (Node 20 recommended)
- **npm** or **bun** package manager
- **Expo CLI** (installed automatically with dependencies)

### Mobile Platforms
- **iOS**: macOS with Xcode 15+ (for iOS development)
- **Android**: Android Studio with SDK 34+ (for Android development)
- **Testing**: Expo Go app or configured simulator/emulator

### Firebase Setup (Required)
- Firebase project with iOS and Android apps configured
- `google-services.json` (Android) in `android/app/`
- `GoogleService-Info.plist` (iOS) in `ios/BitSleuthWallet/`
- **ONLY Firebase Crashlytics enabled** (Analytics must be disabled)

---

## 🚀 Getting Started

> **New Architecture Enabled**: This project uses React Native's New Architecture (Fabric renderer and TurboModules) for improved performance. See [NEW_ARCHITECTURE_MIGRATION.md](NEW_ARCHITECTURE_MIGRATION.md) for details.

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/bitsleuth/wallet.git
cd wallet

# Install dependencies
npm install
# or
bun install

# Install iOS dependencies (required for native modules like expo-glass-effect)
cd ios && pod install && cd ..
```

### 2. Firebase Configuration

Ensure you have the required Firebase configuration files:

- **Android**: Place `google-services.json` in `android/app/`
- **iOS**: Place `GoogleService-Info.plist` in `ios/BitSleuthWallet/`

⚠️ **Important**: Only Firebase Crashlytics is permitted. Google Analytics is **prohibited** for privacy reasons.

### 3. Development

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Start with tunnel (for physical devices)
npm run start-tunnel
```

### 4. Building for Production

```bash
# iOS Production Build
eas build --platform ios --profile production

# Android Production Build
eas build --platform android --profile production

# Build both platforms
eas build --platform all --profile production
```

---

## 📁 Project Structure

```
bitsleuth-wallet/
├── app/                          # Screens and navigation (Expo Router)
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── index.tsx            # Home/Wallet screen
│   │   ├── send.tsx             # Send Bitcoin
│   │   ├── receive.tsx          # Receive Bitcoin
│   │   └── settings.tsx         # App settings
│   ├── wallet-setup.tsx         # Wallet creation/import
│   ├── transaction-details.tsx  # Transaction detail view
│   ├── coin-control.tsx         # UTXO selection
│   ├── fee-bump.tsx             # RBF fee bumping
│   ├── cpfp-bump.tsx            # CPFP fee bumping
│   ├── generate-xpub.tsx        # XPUB export
│   └── ...                      # Additional screens
│
├── services/                     # Core business logic
│   ├── wallet-service.ts        # Wallet creation and management
│   ├── bitcoin-service.ts       # Bitcoin network interactions
│   ├── esplora-service.ts       # Blockstream API client
│   ├── fee-service.ts           # Transaction fee estimation
│   ├── rbf-service.ts           # Replace-By-Fee logic
│   ├── cpfp-service.ts          # Child-Pays-For-Parent logic
│   ├── secure-auth-service.ts   # Authentication management
│   ├── crypto-polyfill.ts       # Cryptographic polyfills
│   └── ...                      # Additional services
│
├── components/                   # Reusable UI components
│   ├── WalletCard.tsx           # Wallet display card
│   ├── TransactionItem.tsx      # Transaction list item
│   ├── QRScanner.tsx            # QR code scanner
│   ├── PinUnlockScreen.tsx      # PIN entry screen
│   └── ...                      # Additional components
│
├── hooks/                        # Custom React hooks
│   ├── wallet-store.ts          # Zustand wallet state
│   ├── auto-lock-store.ts       # Auto-lock state management
│   └── use-performance-monitor.ts # Performance tracking
│
├── constants/                    # App constants
│   ├── themes.ts                # Theme definitions
│   └── wallet-colors.ts         # Wallet color schemes
│
├── types/                        # TypeScript definitions
│   └── wallet.ts                # Wallet-related types
│
├── android/                      # Android native code
├── ios/                          # iOS native code
└── assets/                       # Images and static files
```

---

## 🔒 Security Model

### Data Storage
- **Mnemonics**: Encrypted and stored locally using `AsyncStorage`
- **Private Keys**: Never stored—derived on-demand from mnemonic
- **PINs**: Hashed and stored securely on device
- **Biometrics**: Device keychain integration (Secure Enclave/Keystore)

### Network Security
- All Bitcoin operations are signed locally on device
- Private keys **never transmitted** over network
- HTTPS-only API communication
- No third-party analytics or tracking

### Authentication Flow
1. User sets up PIN during first launch
2. Optional biometric authentication (Face ID/Touch ID)
3. Auto-lock after configurable timeout
4. PIN/Biometric required to access wallet

### Recovery & Backup
- BIP39 mnemonic phrase is the master backup
- Users must securely backup their recovery phrase
- Recovery phrase can restore wallet on any device
- No cloud backup of sensitive data

### ⚠️ Important Security Notes

- **This is prototype software**: Perform your own security audit before using with significant funds
- **Backup your mnemonic**: Loss of mnemonic phrase means permanent loss of funds
- **Secure your device**: Use device encryption and strong passwords
- **Test with small amounts**: Always test wallet functionality with small amounts first
- **No recovery mechanism**: If you lose your PIN and mnemonic, funds cannot be recovered

---

## 🌐 API Integrations

### Blockstream Esplora API
- **Purpose**: Transaction broadcasting, UTXO fetching, balance queries
- **Endpoint**: `https://blockstream.info/api/`
- **Rate Limits**: Public API with reasonable rate limits
- **Fallback**: Consider adding alternative block explorers for redundancy

### CoinGecko API
- **Purpose**: Real-time Bitcoin price data in multiple currencies
- **Endpoint**: `https://api.coingecko.com/api/v3/`
- **Rate Limits**: Free tier with rate limits
- **Caching**: Prices cached locally to reduce API calls

### Firebase Crashlytics
- **Purpose**: Error tracking and crash reporting ONLY
- **Privacy**: No user behavior tracking or analytics
- **Data Collected**: Stack traces, device info, app version
- **Opt-out**: Crashlytics can be disabled for development builds

---

## 🧪 Testing

### Manual Testing
```bash
# Test Firebase Crashlytics
node scripts/test-crashlytics.js

# Test biometric authentication
node scripts/test-biometric.js

# Test Firebase connectivity
node scripts/test-firebase-connectivity.js
```

### Test Scenarios
- ✅ Wallet creation with new mnemonic
- ✅ Wallet import with existing mnemonic
- ✅ Send/receive transactions on mainnet
- ✅ PIN and biometric authentication
- ✅ Fee bumping (RBF and CPFP)
- ✅ Multi-wallet management
- ✅ Auto-lock functionality
- ✅ Recovery phrase backup

---

## 🐛 Troubleshooting

### Common Issues

**Metro bundler won't start**
```bash
# Clear cache and restart
npx expo start -c
```

**iOS build fails**
```bash
# Reinstall pods
cd ios && pod deintegrate && pod install && cd ..
```

**Android build fails**
```bash
# Clean Gradle build
cd android && ./gradlew clean && cd ..
```

**Firebase not working**
- Verify `google-services.json` (Android) is in `android/app/`
- Verify `GoogleService-Info.plist` (iOS) is in `ios/BitSleuthWallet/`
- Ensure only Crashlytics is enabled (not Analytics)

**Biometric authentication not working**
- Check device supports biometrics (Face ID/Touch ID)
- Verify permissions in `Info.plist` (iOS) and `AndroidManifest.xml` (Android)
- Ensure user has enrolled biometrics on their device

---

## 🔄 CI/CD & Deployment

This project uses **EAS (Expo Application Services)** for building and deployment.

### Build Profiles
- **Development**: Debug builds for testing
- **Preview**: Release builds for internal testing
- **Production**: Optimized builds for app stores

### Deployment Commands
```bash
# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

---

## 📝 Scripts Reference

| Command | Description |
|---------|-------------|
| `npm start` | Start Metro bundler |
| `npm run android` | Run on Android emulator |
| `npm run ios` | Run on iOS simulator |
| `npm run start-tunnel` | Start with tunnel for physical devices |
| `npm run lint` | Run ESLint code linting |

---

## 🤝 Contributing

This is proprietary software owned by BitSleuth. Contributions are limited to authorized BitSleuth personnel only.

### Development Guidelines
- Follow TypeScript best practices
- Write clean, documented code
- Test thoroughly before submitting changes
- Ensure all linting passes before commits
- Never add Google Analytics or user tracking
- Always prioritize security and privacy

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Use functional components with hooks
- Keep components small and focused
- Document complex logic with comments

---

## 📄 Privacy Policy

### Google Services Policy (CRITICAL)

| Service | Status | Purpose |
|---------|--------|---------|
| ✅ Firebase Crashlytics | **PERMITTED** | Essential error tracking and crash reporting |
| ❌ Google Analytics | **PROHIBITED** | User behavior tracking is not allowed |
| ❌ Firebase Analytics | **PROHIBITED** | User behavior tracking is not allowed |

**Rationale**: Bitcoin wallet privacy is paramount. We **never** track user behavior, transaction patterns, or personal information. Only crash reports are collected to improve app stability.

**Enforcement**: All contributors and AI agents must verify this policy before adding any Google or Firebase services.

---

## 📜 License

**PROPRIETARY SOFTWARE**

Copyright © 2025 BitSleuth. All rights reserved.

This software is the proprietary and confidential information of BitSleuth. It is provided solely for use by BitSleuth and its authorized personnel. This software is not intended for public distribution or open source use.

**Restrictions:**
- No redistribution or copying without explicit permission
- No reverse engineering or decompilation
- No commercial use without licensing agreement
- All rights reserved by BitSleuth

For licensing inquiries, contact: **legal@bitsleuth.ai**

---

## 🙏 Acknowledgments

- Built with React Native and Expo
- Bitcoin functionality powered by bitcoinjs-lib
- Cryptography by Noble libraries
- Block explorer data from Blockstream
- Market data from CoinGecko

---

## 📞 Support

For support inquiries, please contact:
- **Email**: support@bitsleuth.ai
- **Website**: https://bitsleuth.ai

---

<div align="center">

**Built with ❤️ by BitSleuth**

*Self-custody your Bitcoin. Own your financial freedom.*

</div>
