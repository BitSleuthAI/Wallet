---
name: developer-guide
description: Comprehensive guide to technical skills, knowledge areas, and competencies required for BitSleuth Wallet development. Covers React Native/Expo mobile development, Bitcoin protocol expertise, cryptography, security best practices, and platform-specific knowledge for building a professional-grade Bitcoin wallet.
---

# Required Skills for BitSleuth Wallet Development

This document outlines the technical skills, knowledge areas, and competencies required to effectively contribute to the **BitSleuth Wallet** project—a professional-grade, non-custodial Bitcoin mobile wallet built with React Native and Expo for iOS and Android.

---

## Table of Contents

1. [Core Mobile Development Skills](#core-mobile-development-skills)
2. [Bitcoin & Cryptocurrency Expertise](#bitcoin--cryptocurrency-expertise)
3. [Programming Languages & Frameworks](#programming-languages--frameworks)
4. [Platform-Specific Knowledge](#platform-specific-knowledge)
5. [Security & Cryptography](#security--cryptography)
6. [State Management & Architecture](#state-management--architecture)
7. [API Integration & Networking](#api-integration--networking)
8. [UI/UX Development](#uiux-development)
9. [Testing & Quality Assurance](#testing--quality-assurance)
10. [Build Systems & Deployment](#build-systems--deployment)
11. [Development Tools & Workflows](#development-tools--workflows)
12. [Soft Skills & Best Practices](#soft-skills--best-practices)

---

## Core Mobile Development Skills

### React Native (Advanced)
- **Core Concepts**: Deep understanding of React Native architecture, bridge, and native modules
- **New Architecture**: Experience with Fabric renderer and TurboModules (enabled in this project)
- **Performance Optimization**: Profiling, memory management, and rendering optimization
- **Platform APIs**: Working with device features (camera, biometrics, secure storage, haptics)
- **Native Bridges**: Understanding when and how to communicate with native iOS/Android code
- **Component Lifecycle**: Hooks, effects, and state management patterns
- **Debugging**: Chrome DevTools, React Native Debugger, Flipper

### Expo SDK (Intermediate to Advanced)
- **Expo Router**: File-based navigation system (v5.1+)
- **Expo Modules**: Working with managed and bare workflow
- **EAS (Expo Application Services)**: Building and deploying production apps
- **Expo Prebuild**: Generating and managing native projects
- **Expo Config**: App configuration via `app.json` and `app.config.js`
- **Over-the-Air Updates**: Understanding update strategies (not currently used for security)
- **Expo CLI**: Development server, tunneling, and device testing

### Mobile App Architecture
- **File-based Routing**: Expo Router patterns (`app/`, `(tabs)/`, modal screens)
- **Service Layer Pattern**: Separation of business logic from UI (see `services/`)
- **Component Composition**: Reusable, focused components with single responsibility
- **Cross-Platform Development**: Writing code that works on both iOS and Android
- **Performance Patterns**: Memoization, lazy loading, virtualized lists

---

## Bitcoin & Cryptocurrency Expertise

### Bitcoin Protocol (Advanced Required)
- **Blockchain Fundamentals**: Blocks, transactions, UTXOs, confirmations, mempool
- **HD Wallets**: Hierarchical Deterministic wallets (BIP32, BIP39, BIP44)
- **Address Types**: 
  - Legacy (P2PKH) - `1...`
  - SegWit (P2SH-P2WPKH) - `3...`
  - Native SegWit (P2WPKH) - `bc1q...` (primary for this wallet)
  - Taproot (P2TR) - `bc1p...` (future support)
- **Transaction Structure**: Inputs, outputs, scripts, signatures, witness data
- **Fee Mechanics**: Fee rate calculation, CPFP, RBF (Replace-By-Fee)
- **Bitcoin Script**: Understanding locking/unlocking scripts
- **Network Types**: Mainnet, Testnet, Signet differences

### BIP Standards (Essential)
- **BIP32**: Hierarchical Deterministic Wallets (key derivation paths)
- **BIP39**: Mnemonic code for generating deterministic keys (12/24 word seeds)
- **BIP44**: Multi-account hierarchy for deterministic wallets
- **BIP49**: Derivation scheme for P2WPKH-nested-in-P2SH (SegWit compatibility)
- **BIP84**: Derivation scheme for P2WPKH (Native SegWit) - **used in this wallet**
- **BIP141**: Segregated Witness (SegWit) specification
- **BIP173**: Bech32 address format (Native SegWit encoding)
- **BIP174**: Partially Signed Bitcoin Transactions (PSBT) - for advanced features
- **BIP125**: Opt-in Replace-By-Fee signaling

### Bitcoin Libraries
- **bitcoinjs-lib** (v7.0+): Transaction creation, signing, address generation
- **bip32**: HD key derivation and extended key management
- **bip39**: Mnemonic generation and seed derivation
- **@noble/secp256k1**: Elliptic curve cryptography for Bitcoin
- **@noble/hashes**: SHA256, RIPEMD160, Hash160 for Bitcoin operations
- **bech32**: Encoding/decoding Native SegWit addresses
- **bs58check**: Base58Check encoding for legacy addresses

### UTXO Management
- **Coin Selection**: Algorithms for selecting UTXOs (manual vs automatic)
- **Coin Control**: Manual UTXO selection for privacy and fee optimization
- **Address Reuse**: Understanding privacy implications
- **Change Addresses**: Proper change output handling
- **Dust Limits**: Understanding uneconomical outputs
- **UTXO Set Optimization**: Consolidation strategies

### Advanced Bitcoin Features
- **Replace-By-Fee (RBF)**: Creating and broadcasting replacement transactions
- **Child-Pays-For-Parent (CPFP)**: Fee bumping for received transactions
- **Extended Public Keys (XPUB)**: Generation and export for watch-only wallets
- **Multi-signature**: Future feature (P2WSH, multisig scripts)
- **Time Locks**: Understanding nLockTime and OP_CHECKLOCKTIMEVERIFY
- **Signing Messages**: Bitcoin message signing and verification

---

## Programming Languages & Frameworks

### TypeScript (Advanced Required)
- **Strict Mode**: Working with strict type checking (enabled in this project)
- **Type Safety**: Avoiding `any`, using proper types and generics
- **Interfaces & Types**: Defining complex data structures
- **Type Guards**: Runtime type checking and narrowing
- **Utility Types**: `Partial`, `Pick`, `Omit`, `Required`, etc.
- **Module Systems**: ES modules, imports/exports
- **Async/Await**: Promise-based asynchronous programming
- **Error Handling**: Try/catch, custom error types

### JavaScript (ES6+)
- **Modern Syntax**: Arrow functions, destructuring, spread/rest operators
- **Promises & Async**: Understanding event loop and concurrency
- **Closures & Scope**: Lexical scoping and closure patterns
- **Array Methods**: `map`, `filter`, `reduce`, `find`, etc.
- **Object Methods**: `Object.keys`, `Object.entries`, etc.
- **Template Literals**: String interpolation
- **Optional Chaining**: `?.` operator
- **Nullish Coalescing**: `??` operator

### React (19.1+)
- **Functional Components**: Using function components exclusively
- **Hooks**: `useState`, `useEffect`, `useContext`, `useMemo`, `useCallback`, `useRef`
- **Custom Hooks**: Creating reusable stateful logic
- **Context API**: Global state without prop drilling
- **Render Optimization**: `React.memo`, `useMemo`, `useCallback`
- **Error Boundaries**: Catching and handling component errors
- **Suspense**: Lazy loading and code splitting (future)

---

## Platform-Specific Knowledge

### iOS Development (Intermediate)
- **Xcode**: Building, signing, and debugging iOS apps
- **CocoaPods**: Dependency management for native iOS libraries
- **Info.plist**: App configuration and permissions
- **Swift/Objective-C**: Basic understanding for native module integration
- **iOS Keychain**: Secure data storage (via expo-secure-store)
- **Face ID / Touch ID**: Biometric authentication integration
- **App Store Guidelines**: Submission requirements and policies
- **iOS 18+ Features**: Liquid glass effects, material blur (via expo-glass-effect)
- **Provisioning Profiles**: Code signing and distribution

### Android Development (Intermediate)
- **Android Studio**: Building, debugging, and profiling Android apps
- **Gradle**: Build system and dependency management
- **AndroidManifest.xml**: App configuration and permissions
- **Java/Kotlin**: Basic understanding for native module integration
- **Android Keystore**: Secure credential storage
- **Fingerprint/Face Authentication**: Biometric authentication
- **Google Play Console**: App submission and release management
- **ProGuard/R8**: Code obfuscation and minification
- **Edge-to-Edge Display**: Modern Android UI patterns (Android 15+)

### Platform Differences
- **Safe Area Handling**: iOS notch/island vs Android navigation bars
- **Permissions**: iOS vs Android permission request patterns
- **Push Notifications**: (Future) FCM vs APNs
- **File System**: Platform-specific paths and storage
- **UI Guidelines**: Material Design (Android) vs Human Interface (iOS)
- **Biometric APIs**: Platform-specific biometric authentication
- **Haptic Feedback**: Different patterns and capabilities

---

## Security & Cryptography

### Cryptographic Principles (Advanced Required)
- **Elliptic Curve Cryptography (ECC)**: secp256k1 curve for Bitcoin
- **Hash Functions**: SHA256, RIPEMD160, Hash160
- **Public/Private Key Pairs**: Generation, storage, and usage
- **Digital Signatures**: ECDSA signing and verification
- **Key Derivation**: BIP32 hierarchical deterministic key derivation
- **Entropy**: Secure random number generation
- **Encryption**: AES for local data encryption (mnemonics)
- **Base58Check**: Bitcoin address encoding
- **Bech32**: Native SegWit address encoding

### Mobile Security Best Practices
- **Secure Storage**: Using platform keystores (iOS Keychain, Android Keystore)
- **Encryption at Rest**: Encrypting sensitive data in AsyncStorage
- **Memory Safety**: Clearing sensitive data from memory after use
- **Biometric Authentication**: Face ID, Touch ID, Fingerprint integration
- **PIN Protection**: Secure PIN storage and validation
- **Auto-lock**: Session timeout and re-authentication
- **Screenshot Prevention**: Disabling screenshots on sensitive screens
- **No Cloud Backup**: Preventing sensitive data from cloud backups
- **Code Obfuscation**: ProGuard/R8 for Android, bitcode for iOS

### Threat Modeling
- **Device Compromise**: Mitigating risks of rooted/jailbroken devices
- **Man-in-the-Middle**: HTTPS and certificate pinning
- **Phishing**: Address verification and QR code validation
- **Clipboard Attacks**: Secure clipboard handling
- **Physical Access**: PIN/biometric protection
- **Malware**: Sandboxing and OS-level security
- **Side-Channel Attacks**: Understanding and mitigating timing attacks

### Privacy Considerations
- **No Analytics**: Strict no-tracking policy (only Crashlytics for errors)
- **No KYC**: No user accounts or identity verification
- **Address Reuse**: Warning users about privacy implications
- **Coin Control**: Manual UTXO selection for privacy
- **Network Privacy**: Future Tor integration
- **No IP Tracking**: Minimize network metadata leakage
- **Local-First**: All processing happens on device

---

## State Management & Architecture

### Zustand (Advanced)
- **Store Creation**: Creating and configuring Zustand stores
- **State Updates**: Immutable state updates and actions
- **Selectors**: Efficient component re-rendering with selectors
- **Persistence**: Middleware for AsyncStorage persistence
- **DevTools**: Integration with Redux DevTools for debugging
- **Async Actions**: Handling asynchronous state updates
- **Store Composition**: Multiple stores for different domains

### AsyncStorage (React Native)
- **Key-Value Storage**: Persisting app data locally
- **Encryption**: Storing sensitive data with encryption
- **Migration**: Handling data schema changes
- **Performance**: Batching operations for efficiency
- **Limitations**: Understanding size and performance constraints

### React Query (@tanstack/react-query)
- **Server State**: Caching and synchronizing blockchain data
- **Queries**: Fetching and caching data from Esplora API
- **Mutations**: Broadcasting transactions and updating state
- **Invalidation**: Cache invalidation strategies
- **Background Refetching**: Automatic data freshening
- **Error Handling**: Retry logic and error states
- **Optimistic Updates**: Updating UI before server confirmation

### Application Architecture
- **Service Layer**: Business logic separation (see `services/`)
- **Separation of Concerns**: UI, business logic, and data access
- **Dependency Injection**: Service instantiation patterns
- **Error Boundaries**: Graceful error handling at component level
- **Loading States**: Proper loading and skeleton UI patterns
- **Offline Support**: Handling network failures gracefully

---

## API Integration & Networking

### Blockstream Esplora API
- **UTXO Queries**: Fetching unspent transaction outputs
- **Transaction Data**: Getting transaction details and confirmations
- **Address Information**: Balance and transaction history
- **Fee Estimates**: Network fee recommendations
- **Broadcasting**: Submitting signed transactions to network
- **Rate Limiting**: Handling API rate limits and backoff strategies
- **Error Handling**: Retry logic and fallback mechanisms
- **Caching**: Local caching to reduce API calls

### CoinGecko API
- **Price Data**: Real-time Bitcoin prices in multiple fiat currencies
- **Historical Data**: Price charts and historical trends
- **Rate Limits**: Free tier limitations and caching strategies
- **Currency Support**: USD, EUR, GBP, and other fiat currencies
- **Fallback**: Alternative price data sources (future)

### HTTP Client Best Practices
- **Fetch API**: Making HTTP requests in React Native
- **Error Handling**: Network errors, timeouts, and retries
- **Exponential Backoff**: Retry strategies for failed requests
- **Request Cancellation**: Aborting requests when components unmount
- **HTTPS Only**: Enforcing secure connections
- **Certificate Pinning**: (Future) Preventing MITM attacks
- **Request Batching**: Combining multiple API calls

### WebSocket (Future)
- **Real-time Updates**: Transaction confirmations and price updates
- **Connection Management**: Handling disconnects and reconnects
- **Message Parsing**: Processing blockchain events

---

## UI/UX Development

### NativeWind (Tailwind CSS for React Native)
- **Utility Classes**: Using Tailwind utility classes in React Native
- **Responsive Design**: Adapting to different screen sizes
- **Dark Mode**: Theme switching support
- **Custom Styling**: Extending default theme
- **Performance**: Optimizing class usage for minimal bundle size

### React Native UI Components
- **TouchableOpacity**: Optimized touchable components
- **FlatList**: Efficient list rendering with virtualization
- **ScrollView**: Basic scrolling containers
- **Modal**: Modal presentations and overlays
- **TextInput**: Form inputs with validation
- **SafeAreaView**: Handling device safe areas
- **ActivityIndicator**: Loading states
- **Animated**: Animations (prefer Reanimated)

### React Native Reanimated (v4.1+)
- **Worklets**: Running animations on UI thread
- **Shared Values**: Cross-thread reactive values
- **Animated Styles**: Creating smooth, native animations
- **Gestures**: Pan, pinch, rotation handlers (with React Native Gesture Handler)
- **Layout Animations**: Animating component layout changes
- **Spring Animations**: Natural, physics-based animations

### Expo Glass Effect (iOS 26+)
- **Material Blur**: Native iOS liquid glass effects
- **Tab Bar**: Auto-minimizing tabs with glass effect
- **Platform-Specific**: iOS-only feature with fallbacks

### Design Systems
- **Color Schemes**: Wallet-specific color themes (see `constants/wallet-colors.ts`)
- **Typography**: Consistent font usage across platforms
- **Spacing**: Standardized margins and padding
- **Icons**: Lucide React Native icon set
- **Haptic Feedback**: Tactile responses for user actions
- **Accessibility**: VoiceOver, TalkBack, and screen reader support

### QR Code Handling
- **Scanning**: Using Expo Camera for QR code scanning
- **Generation**: Creating QR codes with react-native-qrcode-svg
- **Parsing**: Bitcoin URI parsing (`bitcoin:address?amount=...`)
- **Validation**: Address and amount validation before sending

---

## Testing & Quality Assurance

### Manual Testing
- **Device Testing**: Testing on real iOS and Android devices
- **Simulator/Emulator**: Xcode Simulator and Android Emulator
- **Network Conditions**: Testing with poor/no connectivity
- **Edge Cases**: Testing with empty states, large wallets, etc.
- **Transaction Testing**: Mainnet and Testnet transaction flows
- **Security Testing**: PIN/biometric, auto-lock, encryption

### Testing Scripts (see `scripts/`)
- **Biometric Testing**: `test-biometric.js` - Test authentication
- **Crashlytics**: `test-crashlytics-simple.js` - Error reporting
- **Firebase**: `test-firebase-connectivity.js` - Service connectivity

### Debugging Techniques
- **Console Logging**: Strategic logging for debugging
- **React Native Debugger**: Chrome DevTools integration
- **Flipper**: Advanced debugging and profiling
- **Network Inspector**: Monitoring API calls
- **Performance Profiler**: Identifying performance bottlenecks
- **Memory Profiler**: Detecting memory leaks
- **Crashlytics**: Production error tracking

### Code Quality
- **ESLint**: Linting JavaScript/TypeScript code
- **TypeScript Compiler**: Strict type checking
- **Code Reviews**: Peer review before merging
- **Git Workflow**: Feature branches, pull requests

---

## Build Systems & Deployment

### EAS (Expo Application Services)
- **EAS Build**: Cloud-based iOS and Android builds
- **Build Profiles**: Development, Preview, Production
- **Credentials Management**: Code signing and provisioning
- **EAS Submit**: Automated app store submission
- **EAS Update**: (Not used - security requirement)
- **Build Configuration**: `eas.json` setup

### Native Builds
- **Xcode Cloud**: Alternative iOS build service
- **Fastlane**: Automation for iOS and Android builds
- **GitHub Actions**: CI/CD pipeline (optional)
- **Code Signing**: iOS certificates and provisioning profiles
- **Android Signing**: Keystore management and signing configs

### Firebase Integration
- **Crashlytics**: Crash reporting and error tracking
- **Performance Monitoring**: App performance metrics
- **Release Management**: Monitoring app releases
- **Configuration Files**: 
  - `google-services.json` (Android)
  - `GoogleService-Info.plist` (iOS)
- **Privacy**: NO Google Analytics or Firebase Analytics allowed

### App Store Distribution
- **Apple App Store**: TestFlight, App Store Connect, review process
- **Google Play Store**: Internal testing, production releases
- **Versioning**: Semantic versioning (major.minor.patch)
- **Release Notes**: Changelog management
- **Staged Rollout**: Gradual release percentages

---

## Development Tools & Workflows

### Version Control (Git)
- **Git Workflow**: Feature branches, pull requests, code review
- **Commit Messages**: Clear, descriptive commit messages
- **Branching Strategy**: Main, development, feature branches
- **Conflict Resolution**: Merging and rebasing
- **GitHub**: Repository management, issues, PRs

### Code Editors
- **VS Code**: Primary editor with React Native extensions
- **Extensions**: ESLint, Prettier, TypeScript, React Native Tools
- **IntelliSense**: TypeScript autocomplete and type hints
- **Debugging**: Built-in debugger and breakpoints

### Package Management
- **npm**: Node package manager (v10.2.4+)
- **bun**: Alternative package manager (faster installs)
- **Patch-package**: Patching node_modules dependencies
- **Version Locking**: package-lock.json for reproducible builds

### Command Line Tools
- **Expo CLI**: Development server and build tools
- **npx**: Running packages without global installation
- **Node.js**: JavaScript runtime (v18.17+, v20 recommended)
- **CocoaPods**: iOS dependency management
- **Gradle**: Android build system

### Documentation
- **Markdown**: Writing clear documentation
- **Code Comments**: Documenting complex logic (sparingly)
- **API Documentation**: Documenting service interfaces
- **README Updates**: Keeping README current with changes

---

## Soft Skills & Best Practices

### Communication
- **Technical Writing**: Clear documentation and code comments
- **Code Reviews**: Constructive feedback and collaboration
- **Issue Reporting**: Detailed bug reports and feature requests
- **Stakeholder Communication**: Explaining technical decisions

### Problem Solving
- **Debugging**: Systematic approach to finding and fixing bugs
- **Performance Optimization**: Identifying and resolving bottlenecks
- **Security Mindset**: Thinking adversarially about vulnerabilities
- **Research**: Finding solutions in documentation and community

### Project-Specific Conventions
- **No Analytics**: Never add Google Analytics or Firebase Analytics
- **TypeScript First**: All new code uses TypeScript
- **Functional Components**: No class components
- **Security Priority**: All cryptographic operations require review
- **Documentation Organization**: All docs in `docs/` folder (except root-level exceptions)
- **Minimal Changes**: Surgical, focused changes only

### Learning & Growth
- **Bitcoin Protocol**: Continuous learning about Bitcoin development
- **React Native Ecosystem**: Staying current with RN updates
- **Security Research**: Following security best practices
- **Community Engagement**: Learning from Bitcoin and RN communities

---

## Knowledge Levels

### Essential (Must Have)
- ✅ React Native fundamentals
- ✅ TypeScript proficiency
- ✅ Bitcoin protocol basics
- ✅ Mobile security principles
- ✅ Git version control

### Advanced (Highly Recommended)
- ⭐ Bitcoin BIPs (32, 39, 44, 84, 141, 173)
- ⭐ Expo SDK and EAS
- ⭐ Cryptography fundamentals
- ⭐ iOS and Android platform knowledge
- ⭐ State management (Zustand)

### Specialized (As Needed)
- 🔧 Native module development (Swift/Kotlin)
- 🔧 Advanced Bitcoin features (Lightning, multisig)
- 🔧 Performance optimization
- 🔧 Accessibility implementation
- 🔧 CI/CD pipeline management

---

## Learning Resources

### Bitcoin Development
- **Bitcoin Developer Documentation**: https://developer.bitcoin.org/
- **Learn Me a Bitcoin**: https://learnmeabitcoin.com/
- **BIPs Repository**: https://github.com/bitcoin/bips
- **Mastering Bitcoin**: Book by Andreas Antonopoulos
- **Programming Bitcoin**: Book by Jimmy Song

### React Native & Expo
- **Expo Documentation**: https://docs.expo.dev/
- **React Native Documentation**: https://reactnative.dev/
- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

### Libraries & Tools
- **bitcoinjs-lib**: https://github.com/bitcoinjs/bitcoinjs-lib
- **Zustand**: https://github.com/pmndrs/zustand
- **React Query**: https://tanstack.com/query/latest
- **NativeWind**: https://www.nativewind.dev/

### Security
- **OWASP Mobile Security**: https://owasp.org/www-project-mobile-security/
- **Crypto 101**: https://www.crypto101.io/
- **iOS Security Guide**: https://support.apple.com/guide/security/welcome/web
- **Android Security**: https://source.android.com/docs/security

---

## Conclusion

Contributing to **BitSleuth Wallet** requires a unique blend of mobile development expertise, Bitcoin protocol knowledge, and security consciousness. This document serves as a comprehensive guide to the skills needed at various levels.

**Priority Skill Areas:**
1. 🔐 **Security & Cryptography** - Non-negotiable for a Bitcoin wallet
2. 🪙 **Bitcoin Protocol** - Deep understanding of Bitcoin mechanics
3. 📱 **React Native + Expo** - Core development platform
4. 🔧 **TypeScript** - Primary programming language
5. 🧪 **Testing & Debugging** - Ensuring reliability and security

**For new contributors:**
- Start with React Native and TypeScript fundamentals
- Study Bitcoin BIPs (especially 32, 39, 84)
- Review existing codebase patterns in `services/`, `app/`, and `components/`
- Practice on Bitcoin Testnet before touching Mainnet code
- Always prioritize security over convenience

**For experienced contributors:**
- Mentor others on Bitcoin protocol intricacies
- Review security-critical code changes
- Optimize performance and user experience
- Contribute to advanced features (Lightning, multisig, hardware wallet integration)

---

**Remember**: This is a Bitcoin wallet handling real user funds. Every line of code should be written with security, privacy, and reliability as top priorities.

For questions or clarification on any skill area, please refer to:
- [AGENTS.md](../../../AGENTS.md) - Project overview and patterns
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) - Contribution guidelines
- [.github/copilot-instructions.md](../../copilot-instructions.md) - Development conventions
- [docs/](../../../docs/) - Additional technical documentation
