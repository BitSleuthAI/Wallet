# CLAUDE.md - AI Assistant Guide for BitSleuth Wallet

This document provides comprehensive guidance for AI assistants working on the BitSleuth Wallet codebase.

## Project Overview

**BitSleuth Wallet** is a privacy-focused, non-custodial Bitcoin mobile wallet built with React Native and Expo. It provides secure key management, multi-wallet support, coin control, transaction fee bumping (RBF/CPFP), and real-time price tracking—all without analytics or cloud dependencies.

### Key Characteristics

- **Non-custodial**: Private keys never leave the device
- **Bitcoin-only**: Focused on BTC with full HD wallet support (BIP32/39/44/84)
- **Privacy-first**: No analytics, no tracking, only crash reporting
- **Cross-platform**: iOS and Android support via React Native
- **Modern architecture**: React Native New Architecture enabled

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React Native | 0.81.5 |
| Platform | Expo SDK | 54 |
| Language | TypeScript | 5.9 |
| UI Library | React | 19.1 |
| State | Zustand | 5.0 |
| Server State | TanStack Query | 5.87 |
| Navigation | Expo Router | 5.1 (file-based) |
| Styling | NativeWind | 4.1 (Tailwind CSS) |
| Bitcoin | bitcoinjs-lib | 6.1.7 |
| Crypto | @noble/secp256k1, @noble/hashes | 2.3, 1.8 |
| Key Derivation | bip32, bip39 | 4.0, 3.1 |
| Animations | React Native Reanimated | 4.1 |
| Icons | Lucide React Native | 0.543 |

## Project Structure

```
BitSleuth-Wallet/
├── app/                          # Screens (Expo Router file-based navigation)
│   ├── (tabs)/                   # Tab-based navigation
│   │   ├── _layout.tsx          # Tab layout with bottom navigation
│   │   ├── index.tsx            # Home/Wallet dashboard
│   │   ├── send.tsx             # Send Bitcoin screen
│   │   ├── receive.tsx          # Receive/QR code screen
│   │   └── settings.tsx         # App settings
│   ├── _layout.tsx              # Root layout
│   ├── wallet-setup.tsx         # Wallet creation/import wizard
│   ├── transaction-details.tsx  # Transaction detail view
│   ├── coin-control.tsx         # Manual UTXO selection
│   ├── fee-bump.tsx             # RBF fee bumping
│   ├── generate-xpub.tsx        # Extended public key export
│   └── ...                      # Additional screens
│
├── services/                     # Core business logic
│   ├── wallet-service.ts        # Wallet CRUD, mnemonic management
│   ├── bitcoin-service.ts       # Transaction building, signing
│   ├── esplora-service.ts       # Blockstream API client
│   ├── fee-service.ts           # Fee estimation
│   ├── rbf-service.ts           # Replace-By-Fee logic
│   ├── cpfp-service.ts          # Child-Pays-For-Parent logic
│   ├── secure-auth-service.ts   # PIN/biometric authentication
│   ├── address-cache-service.ts # Address metadata caching
│   ├── crashlytics-service.ts   # Firebase Crashlytics wrapper
│   └── crypto-polyfill.ts       # Crypto utilities for RN
│
├── components/                   # Reusable UI components
│   ├── WalletCard.tsx           # Wallet display card
│   ├── TransactionItem.tsx      # Transaction list item
│   ├── QRScanner.tsx            # Bitcoin address/URI scanner
│   ├── PinUnlockScreen.tsx      # PIN entry interface
│   ├── BitSleuthButton.tsx      # Primary button component
│   ├── LiquidGlassView.tsx      # iOS blur effect
│   └── ...                      # Additional components
│
├── hooks/                        # State management & custom hooks
│   ├── wallet-store.ts          # Zustand wallet state
│   ├── auto-lock-store.ts       # Auto-lock timer state
│   ├── use-performance-monitor.ts
│   └── ...
│
├── constants/                    # App constants
│   ├── themes.ts                # Theme definitions
│   └── wallet-colors.ts         # Wallet color schemes
│
├── types/                        # TypeScript type definitions
│   └── wallet.ts                # Wallet-related types
│
├── scripts/                      # Utility/test scripts
│   ├── test-crashlytics.js
│   ├── test-biometric.js
│   └── test-firebase-connectivity.js
│
├── android/                      # Android native code
├── ios/                          # iOS native code
├── assets/                       # Static assets
└── docs/                         # Documentation (all .md files go here)
```

## Essential Commands

### Development

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Start with tunnel (for physical devices)
npm run start-tunnel

# Clear cache and start
npx expo start -c

# Run linting
npm run lint

# TypeScript check
npx tsc --noEmit

# Check project health
npx expo doctor
```

### Building

```bash
# iOS production build (via EAS)
eas build --platform ios --profile production

# Android production build (via EAS)
eas build --platform android --profile production

# Both platforms
eas build --platform all --profile production

# Generate native projects (for native code changes)
npx expo prebuild

# Clean prebuild
npx expo prebuild --clean
```

### Native Development

```bash
# iOS: Install CocoaPods dependencies
cd ios && pod install && cd ..

# iOS: Clean and reinstall pods
cd ios && pod deintegrate && pod install && cd ..

# Android: Clean Gradle build
cd android && ./gradlew clean && cd ..
```

### Testing

```bash
# Test Firebase connectivity
node scripts/test-firebase-connectivity.js

# Test Crashlytics
node scripts/test-crashlytics.js

# Test biometric authentication
node scripts/test-biometric.js
```

## Critical Conventions

### Security Requirements (MUST FOLLOW)

1. **No Analytics**: NEVER add Google Analytics or Firebase Analytics
   - Only Firebase Crashlytics is permitted
   - This is a strict privacy requirement

2. **Client-Side Only**: Private keys and mnemonics NEVER leave the device
   - All signing happens locally
   - No server-side key management

3. **Encrypted Storage**: Sensitive data stored via `expo-secure-store`
   - Mnemonics encrypted at rest
   - Private keys derived on-demand, never persisted

4. **No Hardcoded Secrets**: Never commit API keys or credentials
   - Use environment variables
   - See `.rules` file for automated detection

### Code Style

1. **TypeScript Everywhere**: All new code must use TypeScript with strict mode
2. **No `any` Types**: Use proper types or `unknown` with type guards
3. **Functional Components**: Use function components with hooks exclusively
4. **Self-Documenting Code**: Add comments only for complex Bitcoin logic

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `WalletCard.tsx` |
| Screens (files) | kebab-case | `wallet-setup.tsx` |
| Functions/Variables | camelCase | `getWalletBalance` |
| Constants | UPPER_SNAKE_CASE | `MAX_FEE_RATE` |
| Types/Interfaces | PascalCase | `WalletState` |

### Version Update Checklist (MUST FOLLOW)

When asked to bump/update the app version, update **ALL** of the following:

1. `app.json` (`expo.version`) — **drives all in-app version displays** (splash screen, About screen, Settings, Crashlytics) via `constants/app-version.ts`
2. `package.json` (`version`)
3. `android/app/build.gradle` (`versionName`, and bump `versionCode`)
4. `ios/BitSleuthWallet/Info.plist` (`CFBundleShortVersionString`)
5. `CHANGELOG.md` — add the new release entry
6. `README.md` — version badge near the top
7. `app/about.tsx` — add a "What's New in X.Y.Z?" `DropdownSection` at the top with `defaultExpanded={true}` (remove `defaultExpanded` from the previous version's section)
8. `.github/ISSUE_TEMPLATE/bug_report.yml` — App Version placeholder example

**NEVER hardcode the version number in components or services.** Always import `APP_VERSION` from `@/constants/app-version`, which reads it from `app.json` via `expo-constants`.

### Documentation Organization

**All markdown files MUST go in the `docs/` folder**, with these exceptions:
- `README.md`, `CONTRIBUTING.md`, `LICENSE`, `CODE_OF_CONDUCT.md`
- `SECURITY.md`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`
- `.github/copilot-instructions.md`

## Architecture Patterns

### State Management

```
┌─────────────────┐
│  User Action    │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Component      │ ← useState (local/transient)
└────────┬────────┘
         ↓
┌─────────────────┐
│  Zustand Store  │ ← Global app state
└────────┬────────┘
         ↓
┌─────────────────┐
│  Services       │
└────────┬────────┘
         ├─→ AsyncStorage (persistence)
         ├─→ React Query (server cache)
         └─→ External APIs
```

### Data Flow

- **wallet-store.ts**: Active wallet, balance, transactions
- **auto-lock-store.ts**: Authentication state, lock timer
- **AsyncStorage**: Encrypted wallet persistence
- **React Query**: Blockchain data caching

### Service Layer Responsibilities

| Service | Responsibility |
|---------|----------------|
| `wallet-service.ts` | Wallet CRUD, mnemonic generation, key derivation |
| `bitcoin-service.ts` | Transaction building, signing, UTXO selection |
| `esplora-service.ts` | Blockstream API client (blockchain data) |
| `fee-service.ts` | Fee estimation and calculation |
| `rbf-service.ts` | Replace-By-Fee implementation |
| `cpfp-service.ts` | Child-Pays-For-Parent implementation |
| `secure-auth-service.ts` | PIN/biometric authentication |

## Bitcoin-Specific Guidelines

### HD Wallet Standards

- **BIP32**: Hierarchical Deterministic Wallets
- **BIP39**: Mnemonic seed phrases (12/15/18/21/24 words)
- **BIP44**: Multi-account hierarchy
- **BIP84**: Native SegWit (P2WPKH) - default

### Derivation Paths

```
Mainnet: m/84'/0'/0'/0/x  (Native SegWit)
Testnet: m/84'/1'/0'/0/x
```

### Transaction Features

- **Coin Control**: Manual UTXO selection via `coin-control.tsx`
- **RBF**: Replace-By-Fee for stuck transactions
- **CPFP**: Child-Pays-For-Parent for incoming stuck transactions
- **Gap Limit**: Standard 20 address gap limit

## External APIs

### Blockstream Esplora API

```
Base URL: https://blockstream.info/api/

Endpoints:
- /address/:address/txs - Transaction history
- /address/:address/utxo - Unspent outputs
- /tx/:txid - Transaction details
- /fee-estimates - Fee rate recommendations
- /tx (POST) - Broadcast transaction
```

### CoinGecko API

```
Base URL: https://api.coingecko.com/api/v3/

Endpoint: /simple/price
Currencies: USD, EUR, GBP
```

### Firebase Services

| Service | Status | Purpose |
|---------|--------|---------|
| Crashlytics | ENABLED | Error reporting only |
| Performance | ENABLED | App performance tracking |
| Analytics | PROHIBITED | Never enable |

## CI/CD Workflows

### GitHub Actions

1. **Lint** (`.github/workflows/lint.yml`)
   - Triggers on: PR to main/develop, push to main/develop
   - Runs: ESLint checks

2. **Build Verification** (`.github/workflows/build.yml`)
   - Triggers on: PR to main/develop, push to main/develop
   - Runs: TypeScript compilation, Expo doctor

3. **Security** (`.github/workflows/security.yml`)
   - Dependency vulnerability scanning

### Pre-commit Checks

Before committing:
```bash
npm run lint        # Must pass
npx tsc --noEmit    # Must pass
```

## Common Patterns

### Creating a Wallet

```typescript
import { WalletService } from '@/services/wallet-service';
import { useWalletStore } from '@/hooks/wallet-store';

// Generate new wallet
const mnemonic = WalletService.generateMnemonic();
const wallet = await WalletService.createWallet(
  mnemonic,
  'bitcoin',
  'My Wallet',
  '#FF6B6B'
);
useWalletStore.getState().addWallet(wallet);
```

### Building a Transaction

```typescript
import { BitcoinService } from '@/services/bitcoin-service';
import { EsploraService } from '@/services/esplora-service';

// Fetch UTXOs
const utxos = await EsploraService.getAddressUtxos(address, network);

// Build and sign
const psbt = await BitcoinService.buildTransaction({
  utxos: selectedUtxos,
  outputs: [{ address: recipient, value: amountSats }],
  feeRate,
  network,
});

const signedTx = await BitcoinService.signTransaction(psbt, wallet);
const txid = await EsploraService.broadcastTransaction(signedTx.toHex());
```

### Using Zustand Store

```typescript
import { useWalletStore } from '@/hooks/wallet-store';

// In a component
const { activeWallet, balance, setActiveWallet } = useWalletStore();

// Outside React (in services)
const state = useWalletStore.getState();
state.updateBalance(newBalance);
```

## Troubleshooting

### Metro Bundler Issues

```bash
npx expo start -c
# or
rm -rf node_modules .expo && npm install
```

### iOS Build Failures

```bash
cd ios
pod deintegrate
pod cache clean --all
pod install
cd ..
```

### Android Build Failures

```bash
cd android
./gradlew clean
cd ..
```

### Firebase Not Working

1. Verify config files exist:
   - `android/app/google-services.json`
   - `ios/BitSleuthWallet/GoogleService-Info.plist`
2. Run: `node scripts/test-firebase-connectivity.js`

### TypeScript Errors

```bash
npx tsc --noEmit    # Check for errors
npx expo customize tsconfig.json  # Regenerate config
```

## Key Files Reference

### Entry Points

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout, navigation setup |
| `app/(tabs)/_layout.tsx` | Tab navigation configuration |
| `index.js` | App entry point |

### Core Business Logic

| File | Purpose |
|------|---------|
| `services/wallet-service.ts` | Wallet management |
| `services/bitcoin-service.ts` | Transaction handling |
| `services/esplora-service.ts` | Blockchain API |
| `services/secure-auth-service.ts` | Authentication |

### State Management

| File | Purpose |
|------|---------|
| `hooks/wallet-store.ts` | Main app state |
| `hooks/auto-lock-store.ts` | Security/lock state |

### Configuration

| File | Purpose |
|------|---------|
| `app.json` | Expo configuration |
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript configuration |
| `eas.json` | EAS Build profiles |
| `.rules` | Security guardrails |

## Best Practices for AI Assistants

1. **Read before editing**: Always read files before making changes
2. **Follow conventions**: Match existing code style and patterns
3. **Security first**: Never log or expose sensitive data
4. **Test locally**: Verify changes work on both iOS and Android
5. **Keep it simple**: Avoid over-engineering; minimal changes preferred
6. **Document changes**: Update relevant docs if behavior changes
7. **No analytics**: Never add tracking or telemetry (except Crashlytics)

## Skills Feedback Loop

This project uses a skills feedback system in `.github/skills/`. When using skills:

1. Read both `SKILL.md` and `SKILL_MEMORY.md` for a skill
2. Record outcomes in `SKILL_MEMORY.md` after using a skill
3. Identify patterns from accumulated feedback
4. Propose updates to `SKILL.md` when patterns are validated

See `AGENTS.md` for complete feedback loop documentation.

---

**For unclear conventions, check existing code patterns or ask for clarification.**
