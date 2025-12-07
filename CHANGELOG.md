# BitSleuth Wallet - Changelog

All notable changes to the BitSleuth Wallet project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Security
- **CVE-2025-55182**: Updated React to version 19.1.2 to address security vulnerability
  - Updated `react` from 19.1.0 to 19.1.2
  - Updated `react-dom` from 19.1.0 to 19.1.2
  - All peer dependencies remain compatible (React Native 0.81.5, Expo SDK 54, @tanstack/react-query, zustand, React Native Reanimated, Expo Router, NativeWind)
  - No breaking changes or compatibility issues

### Fixed
- **iOS Build Error**: Fixed build failure caused by non-modular header includes in React Native Firebase
  - Removed `use_modular_headers!` from Podfile which was causing RNFBApp to fail when importing React-Core headers
  - Firebase works correctly with static frameworks without requiring modular headers
  - Resolves Xcode build errors: "include of non-modular header inside framework module"

## [1.2.0] - 2025-11-05

### Major Features & Improvements

#### 🏗️ React Native New Architecture Migration
- **Migrated to React Native New Architecture** with Fabric renderer and TurboModules
- Enabled `newArchEnabled: true` in app.json for iOS and Android
- Updated native code for Fabric compatibility (MainApplication.kt, Podfile)
- **Benefits**: Better performance, faster rendering, improved JS-to-Native communication
- Full support for React 18+ features including concurrent rendering
- See [NEW_ARCHITECTURE_MIGRATION.md](docs/NEW_ARCHITECTURE_MIGRATION.md) for details

#### 📱 Android Edge-to-Edge Display Support
- **Implemented Android 15+ edge-to-edge design** with transparent system bars
- **Version-specific behavior**:
  - Android 15+: Full immersive edge-to-edge with transparent status/navigation bars
  - Android 14 and below: Traditional layout with solid system bars (#0F172A)
- Dynamic system bar icon colors based on theme (light/dark mode)
- Proper SafeAreaView integration for content padding
- See [ANDROID_EDGE_TO_EDGE.md](docs/ANDROID_EDGE_TO_EDGE.md) for implementation details

#### 🎨 iOS Liquid Glass Tabs (iOS 18+)
- **Migrated to Expo Router NativeTabs** for native iOS liquid glass effect
- Advanced iOS features:
  - Automatic tab bar minimize behavior on scroll
  - System material blur effects (`systemMaterial`)
  - Native liquid glass translucent tab bar
- Theme-aware tab bar with automatic color adaptation
- Graceful fallback for older iOS versions (blur without minimize)
- See [LIQUID_GLASS_TABS.md](docs/LIQUID_GLASS_TABS.md) for details

#### ⚡ Bitcoin Operations Optimization (Production Ready)
- **Resolved HTTP 429 rate limiting errors** (reduced from 15-20% to <1%)
- **Fixed balance display bug** where balance would intermittently drop to $0
- **Optimized address loading** (now <1 second with cache, 80-90% faster)
- **Improved UTXO fetching** with smart cache staleness detection
- **Optimized transaction history loading** with sequential processing
- API rate limiting strategy:
  - Base delay: 1000ms + 0-200ms random jitter
  - Sequential processing (1 request at a time)
  - Request deduplication (30-50% reduction in duplicate calls)
  - Exponential backoff: 2s, 4s, 8s for retries
  - Enhanced circuit breaker with 15-120s pause
- Performance improvements:
  - API call reduction: 60-75%
  - 429 error rate: 95%+ reduction
  - Cache hit rate: 40% → 80%
- See [PRODUCTION_READY_SUMMARY.md](docs/PRODUCTION_READY_SUMMARY.md) for full analysis

### Security & Authentication

#### 🔐 Multi-Factor Authentication
- PIN protection with secure PIN setup and verification
- Biometric authentication (Face ID / Touch ID)
- Auto-lock with configurable timeout (1min, 5min, 15min, 30min, 1hour)
- Secure local storage with encrypted mnemonics (AsyncStorage + SecureStore)
- Client-side cryptography only - private keys never leave device
- Passkeys/WebAuthn support (experimental)

#### 🛡️ Enhanced Security Features
- Recovery phrase backup and verification flow
- BIP32/39/44/84 compliance for key derivation
- BIP125 Replace-By-Fee (RBF) support
- BIP141 Segregated Witness (SegWit) support
- BIP173 Bech32 address format (bc1...)
- Gap limit enforcement (20 addresses per BIP44)
- Address reuse prevention

### Core Wallet Features

#### 💼 Wallet Management
- Create unlimited wallets with BIP39 mnemonic generation (12/15/18/21/24 words)
- Import existing wallets from mnemonic phrase
- Multi-wallet support with seamless switching
- Custom wallet names and color themes
- Individual wallet settings
- Native SegWit (Bech32) addresses at `m/84'/0'/0'`
- Recovery phrase viewing and backup

#### 💸 Bitcoin Transactions
- Send and receive Bitcoin with QR code support
- Custom transaction fee settings (slow/normal/fast/custom)
- Real-time balance updates with confirmations
- Complete transaction history with detailed views
- Transaction explorer with full transaction data
- Real-time status updates (pending/confirmed)
- Multi-currency price display (USD, EUR, GBP)

#### 🎯 Advanced Transaction Features
- **Coin Control**: Manual UTXO selection for transactions
- **Replace-By-Fee (RBF)**: Bump fees on stuck transactions
- **Child-Pays-For-Parent (CPFP)**: Accelerate parent transactions
- Network-based fee recommendations from Blockstream Esplora
- Client-side transaction signing with bitcoinjs-lib

#### 🔑 Extended Public Key (XPUB) Support
- Generate and export XPUB/YPUB/ZPUB
- Support for read-only wallet integration
- Watch-only wallet support (via XPUB import)

#### 🏠 Address Management
- View all generated addresses with balances
- Address details with transaction history
- Automatic address generation with gap limit management
- Address metadata caching (2-minute TTL)
- Smart address prefetching

### User Interface & Experience

#### 🎨 Modern Design System
- Beautiful, intuitive interface with contemporary design
- Automatic dark/light theme switching
- Custom wallet color themes
- Smooth animations with React Native Reanimated 4.1
- Haptic feedback integration (Expo Haptics)
- Loading animations and success feedback
- Optimized TouchableOpacity components for better performance

#### 📊 Real-Time Data Display
- Live Bitcoin price updates from CoinGecko API
- Multi-currency support (USD, EUR, GBP, and more)
- Network fee recommendations from Blockstream
- Transaction status notifications
- Automatic data refresh on app updates
- Price charts with historical data
- Network connectivity status indicator

#### 🎭 Premium UI Components
- WalletCard with gradient backgrounds
- TransactionItem with status indicators
- QRScanner with camera integration
- PinUnlockScreen with biometric fallback
- ConfettiCelebration for successful operations
- EmojiReaction for user feedback
- BitSleuthButton with premium styling
- LiquidGlassView for iOS blur effects

### Performance & Optimization

#### 🚀 API & Network Optimization
- Request queue system with centralized rate limiting
- Request deduplication (prevents duplicate concurrent requests)
- Smart cache management with TTL strategies:
  - Transaction IDs: 5 minutes (immutable)
  - Address stats: 5 minutes (immutable)
  - UTXOs: 2 minutes (can change)
  - Address metadata: 2 minutes (balance UX)
- Circuit breaker pattern for API failures
- Automatic provider fallback (Blockstream ↔ Mempool.space)
- Exponential backoff for retries

#### 💾 State Management & Caching
- Zustand 5.0 for lightweight state management
- React Query (TanStack Query 5.87) for server state
- AsyncStorage for secure local data persistence
- Transaction cache service with intelligent invalidation
- Address cache service with prefetching
- Wallet persistence service with auto-save

#### ⚡ React Performance Optimizations
- React 19.1 with latest optimizations
- New Architecture enabled (Fabric + TurboModules)
- Optimized re-renders with proper memoization
- Lazy loading for heavy components
- Activity tracker for performance monitoring
- Animation manager for smooth transitions

### Developer Experience

#### 🛠️ Development Tools & Scripts
- Test scripts for biometric authentication
- Test scripts for Firebase Crashlytics
- Test scripts for Firebase connectivity
- Test scripts for Bitcoin operations
- Automated testing suite for wallet functionality
- Comprehensive documentation in `docs/` folder

#### 📚 Documentation Added
- `NEW_ARCHITECTURE_MIGRATION.md` - New Architecture migration guide
- `LIQUID_GLASS_TABS.md` - iOS liquid glass tabs implementation
- `ANDROID_EDGE_TO_EDGE.md` - Android edge-to-edge guide
- `PRODUCTION_READY_SUMMARY.md` - Production readiness certification
- `BITCOIN_OPTIMIZATIONS.md` - Bitcoin operations optimization guide
- `API_RATE_LIMITING.md` - Rate limiting strategy documentation
- `UTXO_OPTIMIZATION.md` - UTXO fetching optimization guide
- `WALLET_UPDATE_FIX_V2.md` - Wallet data refresh fix documentation
- `WALLET_PERSISTENCE_SUMMARY.md` - Wallet persistence architecture
- `TESTING_GUIDE.md` - Comprehensive testing guide
- `PRODUCTION_READINESS.md` - Production deployment checklist
- `CONTRIBUTING.md` - Contribution guidelines with doc organization
- `todo.md` - Project roadmap and future enhancements

#### 📦 Dependency Updates
- React Native 0.81.5 with New Architecture
- Expo SDK 54 with latest features
- React 19.1.0 with concurrent rendering
- TypeScript 5.8.3 for latest type features
- @tanstack/react-query 5.87.1
- zustand 5.0.8
- React Native Reanimated 4.1.1
- Expo Router 6.0.13 with NativeTabs
- NativeWind 4.1.23 for Tailwind styling

### Platform Support

#### 📱 iOS Support
- iOS 18+ with liquid glass tabs and advanced blur effects
- Automatic tab minimize behavior support
- Face ID and Touch ID support
- Native SegWit address support
- Hermes JavaScript engine
- CocoaPods for dependency management
- Xcode 15+ support

#### 🤖 Android Support
- Android 14 with traditional system bars
- Android 15+ with edge-to-edge design
- Fingerprint and face unlock support
- Material Design 3 components
- Gradle 8 with Kotlin 1.9
- Minimum SDK 24 (Android 7.0)
- Target SDK 35 (Android 15)
- Compile SDK 35

### External Integrations

#### 🌐 API Integrations
- **Blockstream Esplora API** for transaction/UTXO/balance data
- **Mempool.space API** as fallback provider
- **CoinGecko API** for real-time Bitcoin price data
- **Firebase Crashlytics** for error reporting (NO analytics per privacy policy)

### Bug Fixes & Stability

#### 🐛 Critical Bug Fixes
- Fixed wallet balance dropping to $0 intermittently
- Fixed address loading delays (5-10s → <1s)
- Fixed HTTP 429 rate limiting errors
- Fixed wallet data not refreshing after import/creation
- Fixed wallet switching not updating data properly
- Fixed transaction history loading failures
- Fixed UTXO fetching race conditions
- Fixed theme switching on iOS liquid glass tabs

#### 🔧 Stability Improvements
- Enhanced error handling for API failures
- Circuit breaker for cascading failure prevention
- Improved cache invalidation logic
- Better handling of network connectivity issues
- Graceful degradation when APIs are unavailable
- Crash-free rate: >99.5%

### Privacy & Compliance

#### 🔒 Privacy Features
- **NO user tracking or analytics** (Firebase Analytics explicitly prohibited)
- **NO behavioral data collection**
- **NO transaction monitoring**
- **ONLY Firebase Crashlytics** for error reporting
- All sensitive operations client-side only
- Private keys never transmitted over network
- HTTPS-only API communication
- Local-first architecture

#### ✅ BIP Standards Compliance
- BIP32: Hierarchical Deterministic Wallets
- BIP39: Mnemonic Seed Phrases
- BIP44: Multi-Account Hierarchy Standard
- BIP84: Native SegWit Derivation (m/84'/0'/0')
- BIP125: Replace-By-Fee (RBF)
- BIP141: Segregated Witness (SegWit)
- BIP173: Bech32 Address Format (bc1...)

### Known Issues & Limitations

#### ⚠️ Current Limitations
- Prototype software - perform your own security audit before use with significant funds
- No Lightning Network support (planned for future)
- No hardware wallet integration yet (planned)
- Limited to mainnet Bitcoin only
- Single account per wallet (BIP44 account 0)
- No batch transaction support

#### 🔮 Planned Future Enhancements
- Address pool pre-generation on wallet create/import
- Background sync for wallet data
- Lightning Network integration
- Hardware wallet support (Ledger, Trezor, Coldcard)
- Electrum server support
- WebSocket support for real-time notifications
- Multi-provider redundancy (3+ providers)
- Local UTXO database for instant balance

---

## Project Information

### Tech Stack Summary

**Core Framework:**
- React Native 0.81.5 (New Architecture enabled)
- Expo SDK 54
- TypeScript 5.8
- React 19.1

**Bitcoin & Cryptography:**
- bitcoinjs-lib 7.0
- bip32, bip39
- @noble/secp256k1 2.3
- @noble/hashes 1.8
- bech32

**State & Data:**
- Zustand 5.0
- @tanstack/react-query 5.87
- AsyncStorage 2.2

**UI & Navigation:**
- Expo Router 6.0 (file-based routing)
- NativeWind 4.1 (Tailwind CSS)
- React Native Reanimated 4.1
- Lucide React Native (icons)
- Expo Glass Effect 0.1.4 (iOS blur)

**Platform Services:**
- Expo Local Authentication (biometrics)
- Expo Camera (QR scanning)
- Expo Haptics (tactile feedback)
- Firebase Crashlytics (error tracking only)

### Repository Structure

```
BitSleuth Wallet/
├── app/                    # Screens (Expo Router)
│   ├── (tabs)/            # Tab navigation screens
│   ├── wallet-setup.tsx   # Wallet creation/import
│   ├── coin-control.tsx   # UTXO selection
│   └── fee-bump.tsx       # RBF/CPFP fee bumping
├── services/              # Business logic
│   ├── wallet-service.ts  # Wallet management
│   ├── bitcoin-service.ts # Bitcoin operations
│   ├── esplora-service.ts # API client
│   └── rbf-service.ts     # Fee bumping logic
├── components/            # Reusable UI components
├── hooks/                 # Zustand stores & custom hooks
├── constants/             # Theme & color constants
├── types/                 # TypeScript definitions
├── docs/                  # Documentation (all .md files)
├── scripts/               # Test & utility scripts
└── android/, ios/         # Native code
```

### Version History

- **v1.2.0** (2025-11-05): Production ready - New Architecture, optimizations, UI improvements
- **v1.0.0** (Initial): Core wallet functionality with basic Bitcoin operations

### Contributing

This is proprietary software owned by BitSleuth. Contributions are limited to authorized BitSleuth personnel only. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### License

**PROPRIETARY SOFTWARE** - Copyright © 2025 BitSleuth. All rights reserved.

For licensing inquiries: legal@bitsleuth.ai

---

**Built with ❤️ by BitSleuth** - *Self-custody your Bitcoin. Own your financial freedom.*
