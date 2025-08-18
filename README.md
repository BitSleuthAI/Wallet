### BitSleuth Wallet (React Native)

A client-side Bitcoin wallet for iOS and Android, built with React Native and Expo. All sensitive operations (seed generation, key derivation, encryption) happen on the device; no private keys are ever sent to a server.

---

## Features

- **Client-side Keys**: Mnemonics are generated and stored securely on the device.
- **Biometric & PIN Protection**: Secure your wallet with Face ID, Touch ID, or a PIN.
- **BIP32/39/84 Derivation**: Uses Bech32 P2WPKH addresses at path `m/84'/0'/0'`.
- **Multiple Wallets**: Create, import, and manage multiple wallets.
- **Send/Receive BTC**: Easily send and receive Bitcoin, with QR code support.
- **Transaction History**: View a detailed history of your transactions.
- **Theming**: Includes both dark and light themes.

> Note: This wallet is configured for Bitcoin mainnet and uses the Blockstream Explorer API.

---

## Tech Stack

- **Framework**: React Native, Expo (SDK 53)
- **UI**: React Navigation, NativeWind (Tailwind CSS for React Native)
- **Bitcoin**: `bitcoinjs-lib`, `bip39`, `bip32`, `@noble/secp256k1`
- **State Management**: Zustand
- **APIs**: Blockstream Explorer (transactions, UTXOs, fees), CoinGecko (market data)
- **Security**: Expo Local Authentication (biometrics/PIN)

---

## Requirements

- Node.js 18.17+ (Node 20 recommended)
- Bun
- Expo Go app on your mobile device, or a configured simulator/emulator.

---

## Getting Started

1.  **Install dependencies**

    ```bash
    npm install
    ```

2.  **Run the app**

    ```bash
    npm start
    ```

    This will start the Metro bundler. You can then scan the QR code with the Expo Go app on your phone, or press `i` or `a` to open the app in an iOS simulator or Android emulator.

---

## Project Scripts

- `npm start`: Starts the Metro bundler with a development build.
- `npm run start-web`: Starts a development build for the web.
- `npm run lint`: Lints the codebase using ESLint.

---

## App Overview

Key locations within the project:

- **`app/`**: Contains all the screens and navigation logic, powered by Expo Router.
  - `(tabs)/`: The main tab navigation for the wallet (Send, Receive, Settings).
  - `wallet-setup.tsx`: The initial wallet creation/import flow.
  - `pin-setup.tsx`, `biometric-setup.tsx`: Screens for setting up security.
- **`services/`**: Core logic for interacting with the Bitcoin network and managing wallets.
  - `wallet-service.ts`: Handles wallet creation, imports, and address generation.
  - `bitcoin-service.ts`: Interacts with the Blockstream API.
  - `crypto-polyfill.ts`, `ecc-override.ts`: Patches and polyfills for cryptographic functions.
- **`components/`**: Reusable UI components used throughout the app.
- **`hooks/`**: Custom React hooks, such as `wallet-store.ts` for Zustand state management.
- **`constants/`**: Shared constants, such as theme colors.
- **`types/`**: TypeScript type definitions.

---

## Security Model and Caveats

- Mnemonics are stored securely on the device using `@react-native-async-storage/async-storage`.
- If you lose your PIN, you will not be able to access your wallet.
- Always back up your mnemonic phrase securely and offline.
- This project is a prototype. Please review and harden the code before using it for significant amounts of BTC.

---

## License

This project is distributed without a warranty. Please add your own license if you plan to use it in a production environment.