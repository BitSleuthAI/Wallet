# Architecture Overview

This document provides a high-level overview of BitSleuth Wallet's architecture, helping contributors understand how the codebase is organized and how different components interact.

## Table of Contents

- [Architecture Principles](#architecture-principles)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Security Architecture](#security-architecture)
- [External Integrations](#external-integrations)
- [Navigation Structure](#navigation-structure)

## Architecture Principles

BitSleuth Wallet is built on the following architectural principles:

### 1. **Client-Side First**
- All sensitive operations happen on the device
- Private keys never leave the device
- No server-side dependencies for core wallet functionality

### 2. **Separation of Concerns**
- **Services Layer**: Business logic and API interactions
- **Components**: Reusable UI elements
- **Screens**: Page-level components with routing
- **Hooks**: State management and shared logic

### 3. **Security by Design**
- Minimal attack surface
- Defense in depth
- Privacy by default
- No analytics or tracking

### 4. **Mobile-First**
- React Native for cross-platform mobile development
- Native modules for platform-specific features
- Optimized for mobile UX patterns

### 5. **Bitcoin Standards Compliance**
- BIP32, BIP39, BIP44, BIP84 compliance
- BIP125 (RBF) and BIP141 (SegWit) support
- Standard derivation paths

## Project Structure

```
BitSleuth Wallet/
│
├── app/                          # Application screens (Expo Router)
│   ├── (tabs)/                  # Tab-based navigation screens
│   │   ├── index.tsx           # Home/Wallet screen
│   │   ├── send.tsx            # Send Bitcoin
│   │   ├── receive.tsx         # Receive Bitcoin
│   │   └── settings.tsx        # App settings
│   ├── _layout.tsx             # Root layout with navigation
│   ├── wallet-setup.tsx        # Wallet creation/import
│   ├── transaction-details.tsx # Transaction detail view
│   ├── coin-control.tsx        # Manual UTXO selection
│   ├── fee-bump.tsx            # RBF fee bumping
│   ├── cpfp-bump.tsx           # CPFP fee bumping
│   ├── generate-xpub.tsx       # XPUB export
│   └── ...                     # Additional screens
│
├── services/                    # Business logic layer
│   ├── wallet-service.ts       # Wallet creation, import, management
│   ├── bitcoin-service.ts      # Transaction creation, signing
│   ├── esplora-service.ts      # Blockchain API client
│   ├── fee-service.ts          # Fee estimation
│   ├── rbf-service.ts          # Replace-By-Fee logic
│   ├── cpfp-service.ts         # Child-Pays-For-Parent logic
│   ├── secure-auth-service.ts  # Authentication (PIN, biometrics)
│   ├── address-cache-service.ts # Address metadata caching
│   ├── transaction-cache-service.ts # Transaction caching
│   ├── wallet-persistence-service.ts # Wallet data persistence
│   └── crypto-polyfill.ts      # Cryptographic utilities
│
├── components/                  # Reusable UI components
│   ├── WalletCard.tsx          # Wallet display card
│   ├── TransactionItem.tsx     # Transaction list item
│   ├── QRScanner.tsx           # QR code scanner
│   ├── PinUnlockScreen.tsx     # PIN entry screen
│   ├── BitSleuthButton.tsx     # Custom button component
│   ├── LiquidGlassView.tsx     # iOS blur effect
│   └── ...                     # Additional components
│
├── hooks/                       # Custom React hooks & state
│   ├── wallet-store.ts         # Zustand wallet state
│   ├── auto-lock-store.ts      # Auto-lock state
│   ├── use-performance-monitor.ts # Performance tracking
│   └── ...                     # Additional hooks
│
├── constants/                   # App constants
│   ├── themes.ts               # Theme definitions
│   └── wallet-colors.ts        # Wallet color schemes
│
├── types/                       # TypeScript type definitions
│   └── wallet.ts               # Wallet-related types
│
├── utils/                       # Utility functions
│
├── android/                     # Android native code
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/          # Java/Kotlin source
│   │   │   ├── res/           # Resources
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── gradle/
│
├── ios/                         # iOS native code
│   ├── BitSleuthWallet/
│   │   ├── AppDelegate.mm      # App entry point
│   │   ├── Info.plist          # App configuration
│   │   └── ...
│   ├── Podfile                 # CocoaPods dependencies
│   └── ...
│
├── docs/                        # Documentation
├── scripts/                     # Utility scripts
└── assets/                      # Static assets
```

## Core Components

### 1. Services Layer

The services layer encapsulates all business logic and external API interactions:

#### **wallet-service.ts**
- Wallet creation with BIP39 mnemonic generation
- Wallet import from mnemonic
- Key derivation (BIP32/BIP44/BIP84)
- Address generation
- Multi-wallet management

#### **bitcoin-service.ts**
- Transaction construction
- Transaction signing with private keys
- UTXO selection
- Fee calculation
- Transaction broadcasting

#### **esplora-service.ts**
- Blockchain data fetching (Blockstream Esplora API)
- UTXO queries
- Transaction history
- Address balance
- Fee rate recommendations
- Rate limiting and retry logic

#### **secure-auth-service.ts**
- PIN setup and verification
- Biometric authentication (Face ID, Touch ID)
- Auto-lock functionality
- Secure storage management

### 2. State Management

#### **Zustand Stores**
- `wallet-store.ts`: Active wallet state, balance, transactions
- `auto-lock-store.ts`: Authentication state, lock timer

#### **React Query (TanStack Query)**
- Server state caching (blockchain data)
- Automatic refetching
- Background updates
- Cache invalidation

#### **AsyncStorage (Persistent Storage)**
- Wallet persistence
- Encrypted mnemonic storage
- User preferences
- App settings

### 3. UI Components

Components are organized by complexity:

#### **Atomic Components**
- Buttons, inputs, icons
- Typography components
- Loading indicators

#### **Molecular Components**
- Cards (WalletCard, TransactionItem)
- Forms (PIN entry, send form)
- Modals and sheets

#### **Organism Components**
- Screen sections (transaction list, wallet header)
- Complex forms (wallet setup wizard)
- Navigation components

## Data Flow

### Wallet Creation Flow

```
User Action (Create Wallet)
    ↓
wallet-service.ts
    ↓
BIP39 Generate Mnemonic
    ↓
BIP32 Derive Master Key
    ↓
BIP84 Derive Account Keys
    ↓
Generate First Address
    ↓
Encrypt & Store Mnemonic (AsyncStorage)
    ↓
Update Zustand Store
    ↓
Navigate to Wallet Screen
```

### Transaction Sending Flow

```
User Input (Amount, Address)
    ↓
bitcoin-service.ts
    ↓
Fetch UTXOs (esplora-service)
    ↓
Select UTXOs & Calculate Fee
    ↓
Build Transaction (bitcoinjs-lib)
    ↓
Request PIN/Biometric Auth
    ↓
Derive Private Keys (from mnemonic)
    ↓
Sign Transaction
    ↓
Broadcast Transaction (esplora-service)
    ↓
Update Local State
    ↓
Show Success/Error
```

### Balance Update Flow

```
App Launch / Wallet Switch
    ↓
wallet-store.ts (triggers fetch)
    ↓
esplora-service.ts (get addresses)
    ↓
Fetch Address Balances (with caching)
    ↓
Fetch UTXOs (with caching)
    ↓
Aggregate Balance
    ↓
Update Zustand Store
    ↓
UI Re-renders
```

## State Management

### State Layers

1. **Local Component State** (`useState`)
   - Form inputs
   - UI toggles
   - Transient data

2. **Zustand Global State**
   - Active wallet
   - Wallet list
   - Current balance
   - Transactions
   - Authentication state

3. **React Query Cache**
   - Blockchain data
   - Price data
   - Fee estimates

4. **Persistent Storage (AsyncStorage)**
   - Encrypted mnemonics
   - Wallet metadata
   - User preferences
   - Settings

### State Flow Diagram

```
┌─────────────────┐
│  User Action    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Component      │ ← Local State (useState)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Zustand Store  │ ← Global State
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Services       │
└────────┬────────┘
         │
         ├─→ AsyncStorage (persistence)
         ├─→ React Query (server cache)
         └─→ External APIs
```

## Security Architecture

### Key Management

1. **Mnemonic Storage**
   - Encrypted at rest (AES-256)
   - Stored in AsyncStorage
   - Never transmitted

2. **Private Key Derivation**
   - Derived on-demand from mnemonic
   - Never persisted to storage
   - Exists only in memory during signing

3. **PIN Protection**
   - Hashed with strong algorithm
   - Stored securely in device keychain
   - Required for sensitive operations

4. **Biometric Integration**
   - Device-level biometric APIs
   - Secure Enclave (iOS) / Keystore (Android)
   - Fallback to PIN

### Security Layers

```
┌──────────────────────────────────┐
│  Biometric (Face ID / Touch ID)  │ Layer 1
└─────────────┬────────────────────┘
              ↓
┌──────────────────────────────────┐
│  PIN Protection                  │ Layer 2
└─────────────┬────────────────────┘
              ↓
┌──────────────────────────────────┐
│  Encrypted Storage (Mnemonic)    │ Layer 3
└─────────────┬────────────────────┘
              ↓
┌──────────────────────────────────┐
│  Client-Side Key Derivation      │ Layer 4
└─────────────┬────────────────────┘
              ↓
┌──────────────────────────────────┐
│  Transaction Signing             │ Layer 5
└──────────────────────────────────┘
```

## External Integrations

### 1. Blockstream Esplora API
- **Purpose**: Blockchain data
- **Endpoints**:
  - `/api/address/:address/txs` - Transaction history
  - `/api/address/:address/utxo` - Unspent outputs
  - `/api/tx/:txid` - Transaction details
  - `/api/fee-estimates` - Fee recommendations
  - `/api/tx` (POST) - Broadcast transaction
- **Rate Limiting**: Sequential requests with backoff
- **Caching**: Address metadata (2 min), transactions (5 min)

### 2. CoinGecko API
- **Purpose**: Bitcoin price data
- **Endpoint**: `/api/v3/simple/price`
- **Currencies**: USD, EUR, GBP
- **Caching**: Price cached locally
- **Fallback**: Last known price if API unavailable

### 3. Firebase Services
- **Crashlytics**: Error reporting only
- **Performance Monitoring**: App performance tracking
- **Analytics**: DISABLED (privacy requirement)

## Navigation Structure

### Expo Router File-Based Routing

```
app/
├── _layout.tsx              # Root layout
├── (tabs)/
│   ├── _layout.tsx         # Tab layout
│   ├── index.tsx           # Home (/)
│   ├── send.tsx            # Send (/send)
│   ├── receive.tsx         # Receive (/receive)
│   └── settings.tsx        # Settings (/settings)
├── wallet-setup.tsx        # /wallet-setup
├── transaction-details.tsx # /transaction-details/[txid]
├── coin-control.tsx        # /coin-control
├── fee-bump.tsx           # /fee-bump/[txid]
└── ...
```

### Navigation Flow

```
Launch
  ↓
Has Wallet? → No → Wallet Setup
  ↓ Yes           ↓
PIN/Biometric     Create/Import
  ↓               ↓
Authenticated     Save Wallet
  ↓               ↓
Tab Navigator ←────┘
  ├─ Home (Wallet Balance)
  ├─ Send
  ├─ Receive
  └─ Settings
```

## Technology Stack Summary

### Core Framework
- **React Native** 0.81.5 (New Architecture)
- **Expo** SDK 54
- **TypeScript** 5.9
- **React** 19.1

### Bitcoin & Cryptography
- **bitcoinjs-lib** 6.1.7
- **bip32**, **bip39**
- **@noble/secp256k1** 2.3
- **@noble/hashes** 1.8
- **bech32**

### State Management
- **Zustand** 5.0
- **@tanstack/react-query** 5.87
- **AsyncStorage** 2.2

### UI & Navigation
- **Expo Router** 5.1
- **NativeWind** 4.1 (Tailwind CSS)
- **React Native Reanimated** 4.1
- **Lucide React Native** (icons)

## Best Practices for Contributors

1. **Follow the Layer Architecture**
   - Keep business logic in services
   - Keep UI logic in components
   - Use hooks for shared state logic

2. **Security First**
   - Never log sensitive data
   - Never transmit private keys
   - Always validate user input
   - Use secure storage for sensitive data

3. **Performance**
   - Memoize expensive computations
   - Use React Query for API caching
   - Debounce user inputs
   - Lazy load heavy components

4. **Code Organization**
   - One component per file
   - Group related files
   - Use TypeScript for type safety
   - Follow existing naming conventions

---

For more detailed information, see:
- [BUILD_GUIDE.md](BUILD_GUIDE.md) - Development setup
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](../SECURITY.md) - Security policy
