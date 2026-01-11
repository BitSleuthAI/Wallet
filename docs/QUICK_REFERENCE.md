# Quick Reference Guide

Quick reference for common development tasks in BitSleuth Wallet.

## Development Commands

### Starting the App

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator  
npm run android

# Start with tunnel (for physical devices)
npm run start-tunnel

# Clear cache and restart
npx expo start -c
```

### Code Quality

```bash
# Run linter
npm run lint

# TypeScript type checking
npx tsc --noEmit

# Run Expo doctor
npx expo-doctor@latest
```

### Testing

```bash
# Test Firebase connectivity
node scripts/test-firebase-connectivity.js

# Test biometric authentication
node scripts/test-biometric.js

# Test crashlytics
node scripts/test-crashlytics-simple.js

# Test wallet persistence
node scripts/test-wallet-persistence.js
```

### iOS Development

```bash
# Install/update pods
cd ios && pod install && cd ..

# Clean pod installation
cd ios && pod deintegrate && pod install && cd ..

# Open in Xcode
cd ios && open BitSleuthWallet.xcworkspace && cd ..
```

### Android Development

```bash
# Clean Gradle build
cd android && ./gradlew clean && cd ..

# Build debug APK
cd android && ./gradlew assembleDebug && cd ..

# Build release bundle
cd android && ./gradlew bundleRelease && cd ..
```

### Production Builds

```bash
# Login to EAS
eas login

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Build for both platforms
eas build --platform all --profile production
```

## File Locations

### Configuration Files

```
google-services.json              # Android Firebase config (root + android/app/)
GoogleService-Info.plist          # iOS Firebase config (root + ios/BitSleuthWallet/)
package.json                      # Dependencies and scripts
app.json                          # Expo configuration
tsconfig.json                     # TypeScript configuration
eas.json                          # EAS Build configuration
```

### Key Directories

```
app/                              # Screens (Expo Router)
app/(tabs)/                       # Main tab navigation screens
services/                         # Business logic
components/                       # Reusable UI components
hooks/                            # State management & custom hooks
types/                            # TypeScript types
constants/                        # App constants
docs/                             # All documentation
scripts/                          # Utility scripts
android/                          # Android native code
ios/                              # iOS native code
```

## Common Services

### Wallet Service
**Location**: `services/wallet-service.ts`

```typescript
// Create wallet
const wallet = await walletService.createWallet(name, color)

// Import wallet
const wallet = await walletService.importWallet(mnemonic, name, color)

// Get wallet
const wallet = walletService.getWallet(walletId)

// Generate address
const address = await walletService.generateReceiveAddress(walletId)
```

### Bitcoin Service
**Location**: `services/bitcoin-service.ts`

```typescript
// Create transaction
const tx = await bitcoinService.createTransaction(
  walletId, 
  recipientAddress, 
  amount, 
  feeRate
)

// Sign transaction
const signedTx = await bitcoinService.signTransaction(tx, privateKeys)

// Broadcast transaction
const txid = await bitcoinService.broadcastTransaction(signedTx)
```

### Esplora Service
**Location**: `services/esplora-service.ts`

```typescript
// Get UTXOs
const utxos = await esploraService.getAddressUtxos(address)

// Get transactions
const txs = await esploraService.getAddressTransactions(address)

// Get transaction details
const tx = await esploraService.getTransaction(txid)

// Get fee estimates
const fees = await esploraService.getFeeEstimates()
```

## State Management

### Zustand Store
**Location**: `hooks/wallet-store.ts`

```typescript
// Get state
const { currentWallet, balance, transactions } = useWalletStore()

// Update state
useWalletStore.setState({ currentWallet: newWallet })

// Access outside React
const store = useWalletStore.getState()
```

### React Query
**Location**: Throughout the app

```typescript
// Query data
const { data, isLoading, error } = useQuery({
  queryKey: ['balance', walletId],
  queryFn: () => fetchBalance(walletId),
  staleTime: 60000, // 1 minute
})

// Invalidate cache
queryClient.invalidateQueries(['balance'])
```

## Git Workflow

### Branch Naming

```bash
# Feature branches
git checkout -b feature/description

# Bug fixes
git checkout -b fix/description

# Documentation
git checkout -b docs/description

# Refactoring
git checkout -b refactor/description
```

### Commit Messages

```bash
# Format: Type: Description

git commit -m "Feat: add coin control feature"
git commit -m "Fix: resolve balance calculation error"
git commit -m "Docs: update build guide"
git commit -m "Refactor: simplify transaction service"
git commit -m "Test: add wallet creation tests"
```

### Pull Request Flow

```bash
# 1. Create branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "Feat: add my feature"

# 3. Push to your fork
git push origin feature/my-feature

# 4. Open PR on GitHub
# 5. Address review feedback
# 6. Merge when approved
```

## Debugging

### React Native Debugger

```bash
# Open developer menu
# iOS: Cmd+D in simulator
# Android: Cmd+M in emulator (Mac) or Ctrl+M (Windows/Linux)

# Enable debug mode
# Select "Debug" from the menu
```

### Console Logs

```typescript
// Development only
if (__DEV__) {
  console.log('Debug info:', data)
}

// Avoid in production
console.log('This will appear in logs')
```

### Firebase Crashlytics

```typescript
import crashlytics from '@react-native-firebase/crashlytics'

// Log events
crashlytics().log('User performed action')

// Record errors
crashlytics().recordError(new Error('Something went wrong'))

// Set custom attributes
crashlytics().setAttribute('user_id', userId)
```

## Environment Variables

```bash
# Not used in this project - Firebase config is in files
# If adding .env support in the future:

# .env
API_KEY=your_key_here
API_URL=https://api.example.com

# Access in code
import Constants from 'expo-constants'
const apiKey = Constants.expoConfig?.extra?.apiKey
```

## Troubleshooting

### Clear All Caches

```bash
# Metro bundler cache
npx expo start -c

# npm cache
npm cache clean --force

# iOS pods
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..

# Android build
cd android && ./gradlew clean && cd ..

# Watchman (if installed)
watchman watch-del-all
```

### Reset Everything

```bash
# Nuclear option - reset everything
rm -rf node_modules package-lock.json
cd ios && rm -rf Pods Podfile.lock && cd ..
cd android && ./gradlew clean && cd ..
npm install
cd ios && pod install && cd ..
```

## Performance Monitoring

### React Native Performance

```typescript
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'

// In component
const { startTrace, stopTrace } = usePerformanceMonitor()

startTrace('screen_load')
// ... load screen
stopTrace('screen_load')
```

### Firebase Performance

```typescript
import perf from '@react-native-firebase/perf'

const trace = await perf().startTrace('custom_trace')
// ... perform operation
await trace.stop()
```

## Security

### Sensitive Data Handling

```typescript
// ✅ Good - encrypted storage
import AsyncStorage from '@react-native-async-storage/async-storage'
await AsyncStorage.setItem('encrypted_mnemonic', encryptedData)

// ❌ Bad - plain text
await AsyncStorage.setItem('mnemonic', plainTextMnemonic)

// ✅ Good - derive on demand
const privateKey = derivePrivateKey(mnemonic, path)
signTransaction(tx, privateKey)
// privateKey is garbage collected

// ❌ Bad - store private key
await AsyncStorage.setItem('private_key', privateKey)
```

### Authentication

```typescript
import { SecureAuthService } from '@/services/secure-auth-service'

// Check if authenticated
const isAuthenticated = await SecureAuthService.isAuthenticated()

// Request authentication
const success = await SecureAuthService.authenticateWithBiometrics()
```

## API Rate Limiting

### Esplora Service Best Practices

```typescript
// ✅ Good - use service methods (built-in rate limiting)
const utxos = await esploraService.getAddressUtxos(address)

// ❌ Bad - direct fetch (no rate limiting)
const response = await fetch(`https://blockstream.info/api/address/${address}/utxo`)

// ✅ Good - sequential requests
for (const address of addresses) {
  await esploraService.getAddressUtxos(address)
}

// ❌ Bad - parallel requests (causes rate limiting)
await Promise.all(addresses.map(addr => fetch(`...`)))
```

## TypeScript

### Common Types

```typescript
import type { Wallet, Transaction, UTXO } from '@/types/wallet'

// Wallet type
interface Wallet {
  id: string
  name: string
  color: string
  derivationPath: string
  createdAt: number
}

// Transaction type
interface Transaction {
  txid: string
  amount: number
  timestamp: number
  confirmations: number
}
```

### Type Safety

```typescript
// ✅ Good - fully typed
const wallet: Wallet = await walletService.createWallet(name, color)

// ❌ Bad - any type
const wallet: any = await walletService.createWallet(name, color)

// ✅ Good - type guard
if (typeof data === 'object' && data !== null && 'txid' in data) {
  // data is Transaction
}
```

## Resources

- [README.md](../README.md) - Project overview
- [BUILD_GUIDE.md](BUILD_GUIDE.md) - Setup instructions
- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture overview
- [FIRST_TIME_CONTRIBUTORS.md](FIRST_TIME_CONTRIBUTORS.md) - Contributor guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines

---

**For more detailed information, refer to the full documentation in the `docs/` folder.**
