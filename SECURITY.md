# Security Policy

## Supported Versions

We take security seriously at BitSleuth Wallet. The following versions are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :x:                |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in BitSleuth Wallet, please report it to us privately to help protect our users.

### How to Report

Send an email to **security@bitsleuth.ai** with the following information:

- **Description**: A clear description of the vulnerability
- **Impact**: The potential impact of the vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Affected Versions**: Which version(s) of the app are affected
- **Suggested Fix**: If you have suggestions for fixing the issue (optional)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: We will assess the vulnerability and determine its severity
- **Updates**: You will receive updates on our progress at least every 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Credit**: If you wish, we will publicly credit you for the discovery once the issue is resolved

### Security Best Practices

BitSleuth Wallet is designed with security as a top priority:

- **Client-Side Cryptography**: All sensitive operations happen on your device
- **No Cloud Backup**: Your mnemonic seed is the only way to recover your wallet
- **Biometric/PIN Protection**: Device-level authentication required
- **Open Source**: Our code is publicly auditable
- **No Analytics**: We don't track user behavior or collect personal data
- **Firebase API Keys**: Configuration files are excluded from the repository (see [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md))

### Firebase Configuration Security

This repository does **not** include Firebase configuration files (`google-services.json` and `GoogleService-Info.plist`) for security reasons:

- **Each developer must use their own Firebase project** for development
- Configuration files contain API keys that, while designed for client use, should not be publicly exposed in repositories
- Example template files are provided for reference
- See [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) for complete setup instructions and security best practices

**Important**: If you find actual Firebase configuration files (not `.example` files) committed to this repository, please report it as a security issue.

### Scope

Security issues in scope:
- Cryptographic vulnerabilities in key generation, storage, or transaction signing
- Authentication bypass or privilege escalation
- Data exposure or privacy leaks
- Transaction manipulation or double-spending risks
- Dependency vulnerabilities in critical packages
- Exposed Firebase configuration files or API keys in the repository
- Misconfigured Firebase security rules

Out of scope:
- Social engineering attacks
- Physical device attacks
- Issues in third-party dependencies without direct impact
- UI/UX issues without security impact
