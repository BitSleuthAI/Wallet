# Product Requirements Document (PRD)

## 1. Overview
**Product Name:** BitSleuth Wallet

**Description:** A client-side Bitcoin wallet for iOS, Android, and Web platforms, built with React Native and Expo. The app provides secure, non-custodial Bitcoin storage and management with all sensitive operations (seed generation, key derivation, encryption) happening locally on the device. No private keys are ever sent to external servers, ensuring complete user control over their funds.

**Goals:** 
- Provide a secure, user-friendly Bitcoin wallet that prioritizes privacy and self-custody
- Enable seamless Bitcoin transactions with modern UX/UI design
- Support multiple wallet types and advanced features for both beginners and power users
- Maintain cross-platform compatibility while ensuring robust security

## 2. Problem Statement
**What problem are we solving?** 
Current Bitcoin wallet solutions often compromise between security and usability. Many wallets either require users to trust third-party services with their private keys (custodial solutions) or provide poor user experiences that make Bitcoin adoption difficult. There's a need for a wallet that combines enterprise-grade security with intuitive design, allowing users to maintain full control of their funds while enjoying a modern mobile experience.

**Why is this important?** 
Bitcoin adoption is growing rapidly, but security breaches and poor UX continue to be major barriers. Users need a wallet that they can trust with their funds while being easy enough for mainstream adoption. The BitSleuth Wallet addresses this by providing a non-custodial solution with professional-grade security and modern design principles.

## 3. Objectives and Success Metrics
**Objectives (business + user goals):**
- **Security First:** Ensure zero private key exposure to external servers
- **User Adoption:** Create an intuitive experience that encourages Bitcoin usage
- **Cross-Platform:** Provide consistent experience across iOS, Android, and Web
- **Feature Completeness:** Support all essential Bitcoin wallet functionality
- **Performance:** Maintain fast, responsive user experience

**KPIs / measurable success metrics:**
- User retention rate (target: >70% after 30 days)
- Transaction success rate (target: >99%)
- App store ratings (target: >4.5/5)
- Security audit compliance (100% pass rate)
- Cross-platform feature parity (100% core features available on all platforms)

## 4. Target Audience
**Who are the users?**
- **Primary:** Bitcoin enthusiasts and early adopters who value self-custody
- **Secondary:** New Bitcoin users seeking a secure, easy-to-use wallet
- **Tertiary:** Advanced users requiring multiple wallet types and coin control features

**Personas / user stories:**
- **"Security-Conscious Sarah"**: Wants full control over her Bitcoin with enterprise-grade security
- **"Mobile-First Mike"**: Primarily uses mobile devices and needs seamless cross-platform experience
- **"Power User Paul"**: Requires advanced features like coin control, multiple wallet types, and custom fee management

## 5. Features & Requirements
### Core Features
- [x] **Secure Wallet Creation**: BIP39 mnemonic generation with BIP84 Native SegWit support
- [x] **Multi-Wallet Management**: Create and manage multiple wallets with custom names and colors
- [x] **Biometric & PIN Authentication**: Face ID, Touch ID, and PIN protection with auto-lock
- [x] **Send/Receive Bitcoin**: Complete transaction functionality with QR code support
- [x] **Transaction History**: Detailed transaction tracking with real-time balance updates
- [x] **Address Management**: Automatic address generation with gap limit management
- [x] **Fee Management**: Custom transaction fees with fee bumping capabilities
- [x] **Multi-Currency Display**: USD, EUR, GBP price conversion with real-time rates
- [x] **Dark/Light Themes**: Automatic theme switching with modern design system
- [x] **Cross-Platform Support**: iOS, Android, and Web compatibility

### Nice-to-Have Features
- [ ] **Hardware Wallet Integration**: Support for Ledger/Trezor devices
- [ ] **Lightning Network**: Fast, low-cost microtransactions
- [ ] **Multi-Signature Wallets**: Shared wallet functionality
- [ ] **Advanced Privacy Features**: CoinJoin and privacy-focused transactions
- [ ] **FIDO2/WebAuthn Support**: Hardware security key authentication
- [ ] **Tor/VPN Integration**: Anonymous transaction routing
- [ ] **BIP39 Passphrase**: Additional passphrase encryption layer
- [ ] **Advanced Coin Control**: UTXO labeling and advanced management

## 6. Technical Considerations
**Platforms:**
- **Mobile:** React Native with Expo (iOS 13+, Android 8+)
- **Web:** React Native Web with responsive design
- **Backend:** Client-side only, no server dependencies

**Integrations:**
- **Blockstream Explorer API**: Transaction data and UTXO management
- **CoinGecko API**: Real-time Bitcoin price data
- **Firebase Crashlytics**: Error tracking and crash reporting (ONLY)
- **Expo Local Authentication**: Biometric and PIN authentication

**Privacy Policy - Google Services:**
- **CRITICAL**: Google Analytics is PROHIBITED and must NEVER be added
- **ONLY**: Google Crashlytics is permitted for essential error tracking
- **Rationale**: Bitcoin wallet privacy is paramount - no user behavior tracking
- **Enforcement**: All AI agents must verify this policy before adding any Google services

**Dependencies:**
- **Cryptography:** @noble/secp256k1, @noble/hashes, bitcoinjs-lib
- **Bitcoin Standards:** BIP32, BIP39, BIP84 compliance
- **State Management:** Zustand for application state
- **UI Framework:** NativeWind (Tailwind CSS for React Native)
- **Storage:** AsyncStorage for local data persistence

## 7. Risks & Assumptions
**Risks:**
- **Security Vulnerabilities**: Potential cryptographic implementation flaws
- **Platform Changes**: iOS/Android API changes affecting functionality
- **Network Dependencies**: API service outages impacting user experience
- **Regulatory Changes**: Evolving cryptocurrency regulations
- **User Error**: Loss of private keys or mnemonic phrases

**Assumptions:**
- Users will properly backup their mnemonic phrases
- Blockstream Explorer API will remain available and reliable
- Mobile platforms will continue supporting required cryptographic libraries
- Users have basic understanding of Bitcoin wallet security practices

## 8. Timeline & Milestones
**Phase 1: Core Wallet (Completed)**
- Basic wallet creation and import functionality
- Send/receive Bitcoin transactions
- PIN and biometric authentication
- Transaction history and balance tracking

**Phase 2: Enhanced Features (In Progress)**
- Multi-wallet support with custom themes
- Advanced fee management and coin control
- Cross-platform optimization
- Performance improvements and bug fixes

**Phase 3: Advanced Features (Future)**
- Hardware wallet integration
- Lightning Network support
- Advanced privacy features
- Multi-signature wallet support

## 9. Open Questions
- **Hardware Wallet Priority**: Which hardware wallet manufacturers should be prioritized for integration?
- **Lightning Network**: Should Lightning support be built-in or provided as a separate module?
- **Regulatory Compliance**: What additional compliance features might be required for different jurisdictions?
- **Backup Strategy**: Should additional backup methods beyond mnemonic phrases be implemented?
- **Performance Optimization**: What are the acceptable performance thresholds for transaction processing?
