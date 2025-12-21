# Copilot Instructions for BitSleuth Wallet

## Project Architecture
- **React Native + Expo**: Mobile wallet for iOS/Android. Screens in `app/`, navigation via Expo Router.
- **Services Layer**: Core logic in `services/` (wallet, bitcoin, esplora, fee, rbf/cpfp, auth, crypto-polyfill).
- **State Management**: Zustand store in `hooks/wallet-store.ts` and related hooks.
- **UI Components**: Reusable elements in `components/` (WalletCard, TransactionItem, QRScanner, etc).
- **Types**: Shared TypeScript types in `types/`.

## Data Flow & Boundaries
- **Wallet state**: Managed by Zustand, persisted via AsyncStorage.
- **Sensitive operations**: All key management/signing is client-side; private keys never leave device.
- **Bitcoin network**: Interactions via Blockstream Esplora API (see `services/esplora-service.ts`).
- **Price data**: CoinGecko API, cached locally.
- **Crash reporting**: Firebase Crashlytics only (no analytics).

## Developer Workflows
- **Install**: `npm install` or `bun install`
- **Start dev server**: `npm start`
- **Run on device/emulator**: `npm run ios` / `npm run android` / `npm run start-tunnel`
- **Lint**: `npm run lint`
- **Build production**: `eas build --platform ios|android|all --profile production`
- **Test scripts**: See `scripts/` for biometric, crashlytics, and Firebase connectivity tests.
- **Troubleshooting**:
  - Metro: `npx expo start -c`
  - iOS: `cd ios && pod deintegrate && pod install && cd ..`
  - Android: `cd android && ./gradlew clean && cd ..`

## Project-Specific Conventions
- **No analytics/tracking**: Only Crashlytics is permitted. Never add Google Analytics or Firebase Analytics.
- **TypeScript everywhere**: All new code must use TypeScript.
- **Functional components + hooks**: Prefer small, focused components and custom hooks.
- **Security**: Mnemonics encrypted in AsyncStorage; private keys derived on-demand.
- **Multi-wallet**: Support for multiple wallets, each with custom name/color.
- **Coin control**: Manual UTXO selection via `app/coin-control.tsx` and related services.
- **Fee bumping**: RBF/CPFP logic in `services/rbf-service.ts` and `services/cpfp-service.ts`.
- **Documentation organization**: All markdown documentation files MUST be stored in the `docs/` folder, except for: `README.md`, `CONTRIBUTING.md`, `LICENSE.md`, `CHANGELOG.md`, `AGENTS.md`, and `.github/copilot-instructions.md`. This includes product requirements, implementation summaries, testing guides, design documents, API documentation, architecture documentation, deployment guides, troubleshooting guides, and TODO lists.

## Integration Points
- **Blockstream Esplora**: UTXO, transaction, and fee data. Rate limits apply—consider caching and batching.
- **CoinGecko**: Price data for BTC in multiple currencies.
- **Firebase Crashlytics**: Error reporting only; ensure config files are present in platform folders.

## Key Files & Directories
- `app/` — Screens and navigation
- `services/` — Business logic and API clients
- `components/` — UI elements
- `hooks/` — State and custom hooks
- `constants/` — Themes and color schemes
- `types/` — TypeScript types
- `scripts/` — Manual test scripts
- `android/`, `ios/` — Native code and config
- `assets/` — Images/static files

## Example Patterns
- **Wallet creation/import**: See `app/wallet-setup.tsx`, `services/wallet-service.ts`
- **Transaction sending**: `app/send.tsx`, `services/bitcoin-service.ts`
- **Coin control**: `app/coin-control.tsx`, `services/address-cache-service.ts`
- **Fee bumping**: `app/fee-bump.tsx`, `services/rbf-service.ts`, `services/cpfp-service.ts`
- **Authentication**: `services/secure-auth-service.ts`, `hooks/auto-lock-store.ts`

## Security & Privacy
- **No cloud backup**: Mnemonic is the only recovery method.
- **PIN/biometric required**: Enforced via local device APIs.
- **Never transmit private keys**: All signing is local.

---

For unclear or missing conventions, ask the user for clarification or examples from recent code changes.
