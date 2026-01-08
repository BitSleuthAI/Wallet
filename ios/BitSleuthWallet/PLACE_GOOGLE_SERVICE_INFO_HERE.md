# Firebase Configuration Required

Place your `GoogleService-Info.plist` file in this directory.

## Quick Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Add an iOS app with bundle ID: `ai.bitsleuth.wallet`
3. Download `GoogleService-Info.plist`
4. Place it here: `ios/BitSleuthWallet/GoogleService-Info.plist`
5. Also place a copy in the root directory: `GoogleService-Info.plist`

## Complete Guide

See [docs/FIREBASE_SETUP.md](../../docs/FIREBASE_SETUP.md) for detailed instructions.

## Example File

An example configuration is available at: `ios/BitSleuthWallet/GoogleService-Info.example.plist`

**Note**: Never commit your actual `GoogleService-Info.plist` file to version control. It's in `.gitignore` for your protection.
