# **App Name**: BitSleuth Wallet

## Core Features:

#### Security \& Authentication:

* PIN Authentication: 4-digit PIN setup and verification for wallet access
* Biometric Authentication: Face ID, Touch ID, and fingerprint support for quick access
* Auto-lock Security: Automatic wallet locking with configurable timeout
* Local Private Key Storage: Private keys are generated and stored locally on device
* BIP39 Mnemonic Support: 12/24-word seed phrase generation and import
* BIP84 Native SegWit: Default wallet type using BIP84 derivation path (m/84'/0'/0')

#### Wallet Management:

* Multi-Wallet Support: Create and manage multiple wallets with custom names and colors
* Wallet Types: Support for HD, SegWit P2SH, SegWit Native, and Legacy wallet types
* Address Generation: Automatic address generation with gap limit management
* Balance Tracking: Real-time Bitcoin balance with USD/EUR/GBP conversion
* Transaction History: Complete transaction history with detailed information

#### Bitcoin Operations:

* Send Bitcoin: Send transactions with custom fee settings
* Receive Bitcoin: Generate receiving addresses and QR codes
* QR Code Support: Scan QR codes for addresses and payment requests
* Fee Management: Custom transaction fees with fee bumping capabilities
* Coin Control: Advanced UTXO management for transaction optimization

#### User Experience:

* Modern UI: Clean, intuitive interface with smooth animations
* Dark/Light Themes: Automatic theme switching with custom color schemes
* Haptic Feedback: Tactile feedback for enhanced user experience
* Price Charts: 24-hour price tracking with visual charts
* Multi-Currency Display: Support for USD, EUR, and GBP price display
* Balance Hiding: Option to hide wallet balances for privacy

#### Technical Features:

* Cross-Platform: React Native with Expo for iOS, Android, and Web
* Firebase Integration: Crashlytics for error tracking and analytics
* Offline Capability: Core wallet functions work without internet
* Secure Storage: AsyncStorage for encrypted local data persistence
* Network Resilience: Robust error handling and connection management

## Style Guidelines:

#### Color Scheme:

* Primary Colors: Dynamic gradient system with purple/violet tones (#B794F4, #9F7AEA)
* Background: Deep dark theme (#0A0A0F) with surface colors (#1A1A2E)
* Accent Colors: Pink glow (#F687B3) and vibrant purple (#B794F4)
* Success/Error: Green (#48BB78) and red (#FC8181) for status indicators

#### Typography:

* Font Family: System fonts with Inter-style characteristics
* Hierarchy: Clear typography scale from caption (12px) to display (32px)
* Weight: Regular, semibold (600), and bold variations

#### Design System:

* Border Radius: Consistent 8px, 12px, 16px, 20px scale
* Spacing: 4px to 32px spacing system for consistent layouts
* Shadows: Platform-specific shadow implementations (iOS/Android/Web)
* Animations: Subtle transitions and loading states
* Icons: Lucide React Native icon set with thin line style

#### Layout Principles:

* Mobile-First: Optimized for mobile devices with responsive design
* Card-Based: Modular card layout for wallet information
* Visual Hierarchy: Clear information architecture with proper contrast
* Accessibility: Support for screen readers and accessibility features

## Security Architecture:

#### Implemented Security Features:

* Local Key Generation: Private keys never leave the device
* BIP39 Compliance: Standard mnemonic phrase generation
* Secure Storage: Encrypted local storage using device keychain
* Biometric Integration: Native biometric authentication
* Auto-Lock: Configurable session timeout for security

#### Cryptographic Implementation:

* ECC Library: @noble/secp256k1 for elliptic curve operations
* Hash Functions: @noble/hashes for SHA-256 and HMAC operations
* Bitcoin Libraries: bitcoinjs-lib for transaction building
* BIP32/BIP39: Standard Bitcoin key derivation and mnemonic handling

## Future Enhancements:

#### Advanced Security:

* AES-256 Encryption: Client-side encryption for wallet data
* BIP39 Passphrase: Additional passphrase encryption layer
* FIDO2/WebAuthn: Hardware security key support
* Certificate Pinning: HTTPS security for API communications
* Tor/VPN Integration: Anonymous transaction routing

#### Additional Features:

* Hardware Wallet Support: Integration with Ledger/Trezor devices
* Multi-Signature Wallets: Shared wallet functionality
* Lightning Network: Fast, low-cost microtransactions
* Advanced Privacy: CoinJoin and privacy-focused features
