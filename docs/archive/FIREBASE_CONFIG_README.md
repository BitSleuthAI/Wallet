# Firebase Configuration Files - Examples

This directory contains example Firebase configuration files. **These are templates only** and should not be used in production.

## Files

- `google-services.example.json` - Example Android Firebase configuration
- `GoogleService-Info.example.plist` - Example iOS Firebase configuration

## Setup Instructions

**You must create your own Firebase project and download your own configuration files.**

### Quick Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Add iOS and Android apps with the bundle ID `ai.bitsleuth.wallet`
3. Download your configuration files:
   - `google-services.json` for Android
   - `GoogleService-Info.plist` for iOS
4. Place them in the correct locations:
   - `google-services.json` → `android/app/google-services.json` (and root directory)
   - `GoogleService-Info.plist` → `ios/BitSleuthWallet/GoogleService-Info.plist` (and root directory)

### Complete Setup Guide

For detailed instructions, including:
- Firebase service configuration
- API key security and restrictions
- App Check setup
- Troubleshooting
- EAS Build configuration

See: **[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)**

## Security Note

The configuration files contain Firebase API keys. While these keys are designed for client-side use, they should still be handled with care:

- ✅ Use your own Firebase project for development
- ✅ Implement proper Firebase security rules
- ✅ Restrict API keys in Google Cloud Console
- ✅ Enable App Check for production
- ❌ **Never commit your actual configuration files to public repositories**

The actual configuration files are in `.gitignore` to prevent accidental commits.

## Why Not Include Configuration Files?

For open-source projects like BitSleuth Wallet, we follow security best practices:

1. **Prevent Project Enumeration**: Keeping config files private makes it harder for attackers to find and target the Firebase project
2. **Encourage Proper Setup**: Each developer should use their own Firebase project for development
3. **Avoid Abuse**: Even with proper security rules, exposed API keys can lead to quota abuse
4. **Industry Standard**: Most open-source projects with Firebase integration use this approach

## Need Help?

- 📖 Read the complete guide: [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)
- 🔧 Firebase Integration details: [docs/FIREBASE_INTEGRATION.md](docs/FIREBASE_INTEGRATION.md)
- 🐛 Open an issue if you encounter problems (don't share your actual API keys!)
