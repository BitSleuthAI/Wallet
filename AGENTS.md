# AGENTS.md

## Project Overview

**BitSleuth Wallet** is a privacy-focused, non-custodial Bitcoin mobile wallet built with React Native and Expo. The app provides secure key management, multi-wallet support, coin control, transaction fee bumping (RBF/CPFP), and real-time price tracking—all without analytics or cloud dependencies.

### Key Features
- 🔐 **Non-custodial**: Private keys never leave the device; encrypted locally
- 🪙 **Bitcoin-only**: Focused on BTC with HD wallet support (BIP32/39/44/84/141/173)
- 🎨 **Multi-wallet**: Create and manage multiple wallets with custom names and colors
- 🔒 **Security**: PIN/biometric authentication, auto-lock, encrypted mnemonic storage
- 🪙 **Coin Control**: Manual UTXO selection for advanced privacy and fee optimization
- ⚡ **Fee Bumping**: RBF (Replace-By-Fee) and CPFP (Child-Pays-For-Parent) support
- 📊 **Price Tracking**: Real-time BTC prices in multiple fiat currencies
- 🌐 **Mainnet/Testnet**: Support for both Bitcoin networks
- 🚫 **No Analytics**: Only Firebase Crashlytics for error reporting (no tracking)

### Tech Stack
- **Framework**: React Native + Expo SDK 52
- **Language**: TypeScript (strict mode)
- **State**: Zustand + AsyncStorage (encrypted)
- **Navigation**: Expo Router (file-based)
- **Bitcoin**: bitcoinjs-lib, bip32, bip39, tiny-secp256k1
- **APIs**: Blockstream Esplora (UTXO/tx data), CoinGecko (prices)
- **Security**: expo-local-authentication, expo-secure-store
- **Crash Reporting**: Firebase Crashlytics (only)

### Project Structure
```
app/              # Screens (Expo Router file-based navigation)
services/         # Core business logic (wallet, bitcoin, esplora, fee, rbf/cpfp)
components/       # Reusable UI components
hooks/            # Zustand stores and custom hooks
types/            # TypeScript type definitions
constants/        # Themes, colors, configuration
scripts/          # Manual test scripts (biometric, crashlytics, firebase)
android/, ios/    # Native platform code and configuration
```

## Essential Commands

### Development

```bash
npm start                       # Start Expo dev server
npm run ios                     # Build and run on iOS simulator
npm run android                 # Build and run on Android emulator
npm run start-tunnel            # Start with tunnel for device testing
npx expo start --clear          # Clear cache and start dev server
npx expo install <package>      # Install packages with compatible versions
npx expo doctor                 # Check project health and dependencies
npm run lint                    # Run ESLint
```

### Building & Testing

```bash
npx expo prebuild               # Generate native projects (when modifying native code)
npx expo run:ios                # Build and run on iOS device
npx expo run:android            # Build and run on Android device
eas build --platform ios        # Build iOS app via EAS
eas build --platform android    # Build Android app via EAS
eas build --platform all --profile production  # Production builds for both platforms
```

### Native Development

```bash
cd ios && pod install && cd ..  # Install iOS dependencies
cd android && ./gradlew clean && cd ..  # Clean Android build
npx expo prebuild --clean       # Clean and regenerate native projects
```

### Troubleshooting

```bash
# Metro bundler issues
npx expo start -c               # Clear Metro cache

# iOS issues
cd ios && pod deintegrate && pod install && cd ..

# Android issues
cd android && ./gradlew clean && cd ..

# Test Firebase/Crashlytics connectivity
node scripts/test-firebase-connectivity.js
node scripts/test-crashlytics-simple.js

# Test biometric authentication
node scripts/test-biometric.js
```

## Development Principles

### Documentation Organization

**All markdown documentation files MUST be stored in the `docs/` folder**, with the following exceptions:

#### Root-Level Markdown Files (Allowed)
These files should remain in the root directory:
- `README.md` - Project overview and getting started guide
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE.md` or `LICENSE` - License information
- `CHANGELOG.md` - Version history
- `AGENTS.md` - Agent configuration and guidelines
- `.github/copilot-instructions.md` - GitHub Copilot instructions

#### Documentation Files (Must be in `docs/`)
All other markdown files should be placed in the `docs/` folder, including but not limited to:
- Product requirements and specifications (e.g., `PRD.md`)
- Implementation summaries and technical documentation
- Testing guides and procedures
- Migration guides
- Design documents
- API documentation
- Architecture documentation
- Deployment guides
- Troubleshooting guides
- TODO lists and planning documents

**When creating new markdown documentation:**
1. Create the file in the `docs/` folder
2. Use descriptive, UPPERCASE_SNAKE_CASE filenames (e.g., `WALLET_PERSISTENCE_SUMMARY.md`)
3. Add a clear title at the top of the document
4. Include a brief description or table of contents for longer documents

### Code Style & Standards

- **TypeScript First**: Use TypeScript for all new code with strict type checking
- **No `any` Types**: Avoid using `any`; use proper types or `unknown` with type guards
- **Naming Conventions**: 
  - Components: PascalCase (`WalletCard.tsx`)
  - Files: kebab-case for screens (`wallet-setup.tsx`)
  - Functions/variables: camelCase
  - Constants: UPPER_SNAKE_CASE
- **Functional Components**: Use function components with hooks exclusively
- **Self-Documenting Code**: Write clear code; add comments only for complex Bitcoin logic or security considerations

### Architecture & Best Practices

#### Project-Specific Conventions

- **No Analytics**: Never add Google Analytics, Firebase Analytics, or any tracking
- **Crashlytics Only**: Firebase Crashlytics is the only permitted telemetry
- **Security First**: All cryptographic operations must be reviewed
- **Client-Side Only**: Private keys and mnemonics never leave the device
- **Encrypted Storage**: All sensitive data stored via `expo-secure-store`
- **PIN/Biometric Required**: Authentication enforced for all sensitive operations

#### State Management

- **Zustand**: Primary state management via `hooks/wallet-store.ts`
- **AsyncStorage**: Persistence layer (encrypted for sensitive data)
- **Auto-lock**: Session management via `hooks/auto-lock-store.ts`
- **No Redux**: We use Zustand for simplicity and performance

#### Navigation

- **Expo Router**: File-based routing in `app/` directory
- **Tabs Layout**: Main navigation in `app/(tabs)/`
- **Modal Screens**: Transactions, settings, etc. as separate screens
- **Deep Linking**: Support for `bitcoin:` URIs and app-specific schemes

#### Component Patterns

- **Reusable Components**: All UI in `components/`
- **Optimized Touchables**: Use `OptimizedTouchableOpacity` for better performance
- **Animations**: Prefer `react-native-reanimated` for smooth, native-thread animations
- **Platform-Specific**: Use `Platform.select()` for iOS/Android differences
- **Safe Areas**: Always use `SafeAreaView` or `AndroidSafeContainer`

### Bitcoin-Specific Guidelines

#### Wallet Operations

- **HD Wallets**: BIP32/39/44/84 compliant (SegWit native by default)
- **Derivation Paths**: 
  - Mainnet: `m/84'/0'/0'/0/x` (Native SegWit)
  - Testnet: `m/84'/1'/0'/0/x`
- **Address Types**: Support P2WPKH (Native SegWit) primarily
- **Gap Limit**: Standard 20 address gap limit for address discovery
- **UTXO Management**: Manual coin control via `services/address-cache-service.ts`

#### Transaction Handling

- **Fee Estimation**: Dynamic fees via Esplora API (`services/esplora-service.ts`)
- **RBF Support**: Replace-By-Fee for stuck transactions (`services/rbf-service.ts`)
- **CPFP Support**: Child-Pays-For-Parent for incoming stuck TXs (`services/cpfp-service.ts`)
- **Coin Control**: Manual UTXO selection in `app/coin-control.tsx`
- **PSBT**: Use Partially Signed Bitcoin Transactions for complex workflows

#### Network Interactions

- **Blockstream Esplora**: Primary API for blockchain data
- **Rate Limiting**: Implement exponential backoff for API failures
- **Caching**: Cache UTXOs, addresses, and transaction data locally
- **Testnet/Mainnet**: Support both networks; never mix data between them
- **Price Data**: CoinGecko API with local caching

#### Security Practices

- **Mnemonic Generation**: Use `bip39` with crypto-secure randomness
- **Key Derivation**: Never store private keys; derive on-demand
- **Encryption**: All mnemonics encrypted via `expo-secure-store`
- **No Screenshots**: Disable screenshots on sensitive screens
- **Auto-lock**: Configurable auto-lock timeout
- **Biometric/PIN**: Required for wallet access and transaction signing

### Recommended Libraries

- **Navigation**: `expo-router` (file-based routing)
- **State**: Zustand + AsyncStorage
- **Bitcoin**: `bitcoinjs-lib`, `bip32`, `bip39`, `tiny-secp256k1`
- **Crypto**: `expo-crypto`, `expo-random`, `crypto-js`
- **Security**: `expo-local-authentication`, `expo-secure-store`
- **Animations**: `react-native-reanimated`
- **QR**: `expo-camera`, `react-native-qrcode-svg`
- **Charts**: Custom implementation (see `components/PriceChart.tsx`)

### Testing & Quality Assurance

#### Manual Testing Scripts

```bash
# Test biometric authentication
node scripts/test-biometric.js

# Test Firebase Crashlytics
node scripts/test-crashlytics-simple.js

# Test Firebase connectivity
node scripts/test-firebase-connectivity.js
```

#### Testing Checklist

- **Wallet Creation**: Verify mnemonic generation, encryption, storage
- **Transaction Sending**: Test fee calculation, signing, broadcasting
- **Coin Control**: Validate UTXO selection and address labeling
- **Fee Bumping**: Test RBF and CPFP flows
- **Multi-wallet**: Ensure proper wallet isolation
- **Network Switching**: Verify testnet/mainnet separation
- **Authentication**: Test PIN, biometric, auto-lock
- **Price Updates**: Verify price fetch and display
- **Crash Handling**: Ensure Crashlytics captures errors

## Key Files & Entry Points

### Core Services

- **`services/wallet-service.ts`**: Wallet creation, import, encryption
- **`services/bitcoin-service.ts`**: Transaction building, signing, broadcasting
- **`services/esplora-service.ts`**: Blockchain API client (UTXO, TX, fees)
- **`services/fee-service.ts`**: Fee estimation and calculation
- **`services/rbf-service.ts`**: Replace-By-Fee implementation
- **`services/cpfp-service.ts`**: Child-Pays-For-Parent implementation
- **`services/address-cache-service.ts`**: Address generation and caching
- **`services/secure-auth-service.ts`**: PIN/biometric authentication

### State Management

- **`hooks/wallet-store.ts`**: Main Zustand store (wallets, balances, transactions)
- **`hooks/auto-lock-store.ts`**: Auto-lock timer and session management

### Key Screens

- **`app/wallet-setup.tsx`**: Wallet creation/import flow
- **`app/(tabs)/index.tsx`**: Home screen (wallet overview)
- **`app/(tabs)/send.tsx`**: Send Bitcoin screen
- **`app/(tabs)/receive.tsx`**: Receive screen (addresses, QR)
- **`app/coin-control.tsx`**: Manual UTXO selection
- **`app/fee-bump.tsx`**: RBF/CPFP interface
- **`app/transaction-details.tsx`**: Transaction detail view

### Components

- **`components/WalletCard.tsx`**: Main wallet display card
- **`components/TransactionItem.tsx`**: Transaction list item
- **`components/QRScanner.tsx`**: Bitcoin address/URI scanner
- **`components/PinUnlockScreen.tsx`**: PIN entry interface
- **`components/MonzoButton.tsx`**: Primary button component
- **`components/PriceChart.tsx`**: Bitcoin price chart

## Data Flow & Boundaries

### Wallet State Flow

```
User Action → Screen → Service Layer → Bitcoin/Esplora APIs
                ↓           ↓
         Zustand Store ← AsyncStorage (encrypted)
                ↓
           UI Update
```

### Sensitive Data Handling

- **Mnemonic**: Generated → Encrypted → Stored in `expo-secure-store`
- **Private Keys**: Never stored; derived on-demand from mnemonic
- **PIN**: Hashed and stored securely; validated via `secure-auth-service.ts`
- **Biometric**: Managed by OS; used to unlock secure storage
- **UTXOs**: Cached locally with labels; no sensitive data

### API Boundaries

- **Blockstream Esplora**: Read-only blockchain data (no keys transmitted)
- **CoinGecko**: Price data only (no user information)
- **Firebase Crashlytics**: Error reports only (no PII, no analytics)

## Common Patterns & Examples

### Creating a Wallet

```typescript
import { WalletService } from '@/services/wallet-service';
import { useWalletStore } from '@/hooks/wallet-store';

// Generate new wallet
const mnemonic = WalletService.generateMnemonic();
const wallet = await WalletService.createWallet(mnemonic, 'bitcoin', 'My Wallet', '#FF6B6B');
useWalletStore.getState().addWallet(wallet);

// Import existing wallet
const imported = await WalletService.importWallet(existingMnemonic, 'bitcoin', 'Imported');
useWalletStore.getState().addWallet(imported);
```

### Building a Transaction

```typescript
import { BitcoinService } from '@/services/bitcoin-service';
import { EsploraService } from '@/services/esplora-service';

// Fetch UTXOs
const utxos = await EsploraService.getAddressUtxos(address, network);

// Build transaction
const psbt = await BitcoinService.buildTransaction({
  utxos: selectedUtxos,
  outputs: [{ address: recipientAddress, value: amountSats }],
  feeRate,
  network,
});

// Sign and broadcast
const signedTx = await BitcoinService.signTransaction(psbt, wallet);
const txid = await EsploraService.broadcastTransaction(signedTx.toHex(), network);
```

### Fee Bumping (RBF)

```typescript
import { RBFService } from '@/services/rbf-service';

// Check if transaction supports RBF
const canReplace = RBFService.isRBFEligible(transaction);

// Create replacement transaction with higher fee
const newPsbt = await RBFService.createReplacementTransaction(
  originalTx,
  newFeeRate,
  wallet,
  network
);

const signed = await BitcoinService.signTransaction(newPsbt, wallet);
const txid = await EsploraService.broadcastTransaction(signed.toHex(), network);
```

### Coin Control

```typescript
import { AddressCacheService } from '@/services/address-cache-service';

// Get all addresses with labels
const addresses = await AddressCacheService.getAddressesForWallet(walletId);

// Select specific UTXOs
const selectedUtxos = utxos.filter(utxo => 
  selectedAddresses.includes(utxo.address)
);

// Build transaction with selected UTXOs only
const tx = await BitcoinService.buildTransaction({
  utxos: selectedUtxos,
  outputs,
  feeRate,
  network,
});
```

## Security & Privacy

### Threat Model

- **Device Compromise**: Mitigated by PIN/biometric + encrypted storage
- **Network Monitoring**: Use Tor or VPN (future feature)
- **Physical Access**: Auto-lock prevents unauthorized access
- **Backup Loss**: Only mnemonic can recover; no cloud backups
- **Phishing**: Always verify addresses and amounts before signing

### Privacy Best Practices

- **Coin Control**: Use to prevent address reuse and UTXO linking
- **Address Rotation**: Generate new receive address after each use
- **No Address Reuse**: Warn users when reusing addresses
- **No Cloud Sync**: All data stays local
- **No KYC**: No user accounts or identity verification
- **No IP Tracking**: No analytics or telemetry (except Crashlytics errors)

## Troubleshooting Guide

### Common Issues

#### Metro Bundler Not Starting
```bash
npx expo start -c
# or
rm -rf node_modules .expo
npm install
```

#### iOS Build Failures
```bash
cd ios
pod deintegrate
pod cache clean --all
pod install
cd ..
```

#### Android Build Failures
```bash
cd android
./gradlew clean
cd ..
# Then rebuild
npm run android
```

#### Firebase/Crashlytics Not Working
```bash
# Verify configuration files exist
ls GoogleService-Info.plist  # iOS
ls google-services.json      # Android

# Test connectivity
node scripts/test-firebase-connectivity.js
```

#### Transaction Broadcasting Fails
- Check network connection
- Verify Esplora API is accessible
- Ensure sufficient fees (compare to network mempool)
- Check RBF eligibility for replacement transactions

#### Biometric Authentication Not Working
```bash
node scripts/test-biometric.js
```
- Ensure device has biometrics enrolled
- Check permissions in device settings

### Debug Techniques

- **React Native Debugger**: Use Flipper or React Native DevTools
- **Console Logs**: Check terminal for errors and warnings
- **Crashlytics**: Review Firebase console for production crashes
- **Network Inspector**: Monitor API calls in DevTools
- **Redux DevTools**: (Not used) - we use Zustand

## Future Enhancements

### Planned Features

- **Lightning Network**: LN payments and channel management
- **Hardware Wallet Support**: Ledger, Trezor integration
- **Multisig**: Support for multi-signature wallets
- **Tor Integration**: Route all network traffic through Tor
- **Contact Management**: Label and manage frequent recipients
- **Spending Limits**: Daily/transaction spending limits
- **Watch-Only Wallets**: Import via xpub for read-only monitoring
- **PSBT Import/Export**: For offline/multisig signing
- **Advanced Coin Control**: UTXO merging, consolidation tools

### Technical Debt

- [ ] Improve address cache performance for large wallets
- [ ] Add comprehensive unit tests (Jest + React Native Testing Library)
- [ ] Optimize transaction list rendering for wallets with 1000+ TXs
- [ ] Implement proper error boundaries across all screens
- [ ] Add retry logic with exponential backoff for all API calls
- [ ] Migrate to SQLite for better performance (currently using AsyncStorage)

## Resources

### Documentation

- **Expo Docs**: https://docs.expo.dev/
- **React Native**: https://reactnative.dev/
- **Bitcoin Core**: https://developer.bitcoin.org/
- **BIPs**: https://github.com/bitcoin/bips
- **Blockstream Esplora**: https://github.com/Blockstream/esplora

### Repositories

- **bitcoinjs-lib**: https://github.com/bitcoinjs/bitcoinjs-lib
- **bip39**: https://github.com/bitcoinjs/bip39
- **tiny-secp256k1**: https://github.com/bitcoinjs/tiny-secp256k1

---

**For unclear conventions or missing patterns, refer to recent code changes or ask the development team for clarification.**
