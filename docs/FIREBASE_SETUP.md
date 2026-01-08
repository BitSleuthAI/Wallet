# Firebase Setup Guide

This guide explains how to set up your own Firebase project for BitSleuth Wallet development.

## Why You Need Your Own Firebase Project

For security and privacy reasons, Firebase configuration files (`google-services.json` and `GoogleService-Info.plist`) are **not** included in this repository. Each developer should use their own Firebase project for development and testing.

## Quick Start

### Prerequisites

- A Google account
- Access to the [Firebase Console](https://console.firebase.google.com/)

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "BitSleuth Wallet Dev")
4. (Optional) Enable Google Analytics - **Note: We do NOT use Analytics in the app for privacy reasons**
5. Click "Create project"

### Step 2: Add iOS App

1. In your Firebase project, click the iOS icon to add an iOS app
2. **iOS bundle ID**: `ai.bitsleuth.wallet` (or your custom bundle ID)
3. (Optional) App nickname: "BitSleuth Wallet iOS"
4. Click "Register app"
5. **Download `GoogleService-Info.plist`**
6. Place the downloaded file in two locations:
   - `ios/BitSleuthWallet/GoogleService-Info.plist`
   - `GoogleService-Info.plist` (root directory)
7. Follow the SDK setup instructions (most are already configured in this project)
8. Click "Continue to console"

### Step 3: Add Android App

1. In your Firebase project, click the Android icon to add an Android app
2. **Android package name**: `ai.bitsleuth.wallet` (or your custom package name)
3. (Optional) App nickname: "BitSleuth Wallet Android"
4. Click "Register app"
5. **Download `google-services.json`**
6. Place the downloaded file in two locations:
   - `android/app/google-services.json`
   - `google-services.json` (root directory)
7. Follow the SDK setup instructions (most are already configured in this project)
8. Click "Continue to console"

### Step 4: Enable Firebase Services

#### Enable Crashlytics

1. In Firebase Console, go to **Build > Crashlytics**
2. Click "Enable Crashlytics"
3. Follow the setup wizard (dependencies are already in the project)
4. Note: Crashlytics requires a release build to send crash reports

#### Enable Performance Monitoring

1. In Firebase Console, go to **Build > Performance Monitoring**
2. Click "Get started"
3. Follow the setup wizard (dependencies are already in the project)

#### Disable Analytics (Important!)

BitSleuth Wallet does **NOT** use Firebase Analytics for privacy reasons. Ensure it's disabled:

1. Go to **Build > Analytics** (if available)
2. Disable or do not enable Analytics
3. The app configuration in `firebase.json` already disables all analytics features

### Step 5: Configure API Key Restrictions (Recommended)

To prevent abuse of your Firebase API keys:

#### For Web/Browser APIs (if applicable)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services > Credentials**
4. Find your browser API key
5. Click "Edit"
6. Under "Application restrictions", select "HTTP referrers (web sites)"
7. Add your authorized domains
8. Click "Save"

#### For Android/iOS Apps
1. The API keys in `google-services.json` and `GoogleService-Info.plist` are already restricted to your app's package/bundle ID
2. Ensure your package name (Android) and bundle ID (iOS) match your Firebase configuration
3. For additional security, enable App Check (see below)

### Step 6: Enable App Check (Optional but Recommended)

App Check helps protect your Firebase resources from abuse:

1. In Firebase Console, go to **Build > App Check**
2. Click "Get started"
3. Register your iOS app:
   - Provider: DeviceCheck or App Attest (for production)
   - Follow the setup instructions
4. Register your Android app:
   - Provider: Play Integrity API or SafetyNet (for production)
   - Follow the setup instructions
5. Enable enforcement for Crashlytics and Performance Monitoring

## Configuration Files

### Example Files Provided

This repository includes example configuration files:

- `google-services.example.json` - Android configuration template
- `GoogleService-Info.example.plist` - iOS configuration template
- `android/app/google-services.example.json` - Android app configuration template
- `ios/BitSleuthWallet/GoogleService-Info.example.plist` - iOS app configuration template

You can use these as references for the structure, but you **must** use your own Firebase project's configuration files.

### File Locations

After setup, your configuration files should be in these locations:

```
BitSleuth-Wallet/
├── google-services.json                           # Android (root, referenced in app.json)
├── GoogleService-Info.plist                        # iOS (root, referenced in app.json)
├── android/
│   └── app/
│       └── google-services.json                    # Android (build time)
└── ios/
    └── BitSleuthWallet/
        └── GoogleService-Info.plist                # iOS (build time)
```

**Important**: These files are in `.gitignore` and should **NEVER** be committed to version control.

## Security Best Practices

### 1. Protect Your Configuration Files

- **Never commit** `google-services.json` or `GoogleService-Info.plist` to public repositories
- Keep these files secure and don't share them publicly
- Use different Firebase projects for development, staging, and production

### 2. Implement Proper Security Rules

Since this is a Bitcoin wallet app with client-side cryptography:

- **Firestore/Realtime Database**: Not currently used, but if added, ensure strict security rules
- **Cloud Storage**: Not currently used, but if added, require authentication
- **Cloud Functions**: Not currently used, but if added, validate all inputs

Example security rules (if you add Firestore):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3. Monitor Usage and Billing

1. Set up billing alerts in Google Cloud Console
2. Monitor Firebase usage in the Firebase Console
3. Review Crashlytics and Performance data regularly
4. Watch for unusual traffic patterns

### 4. API Key Security

- The API keys in `google-services.json` and `GoogleService-Info.plist` are **not secret**
- They identify your Firebase project but don't grant direct access
- Security is enforced through:
  - App/Bundle ID restrictions (automatic)
  - Firebase Security Rules (if using database/storage)
  - App Check (recommended)
  - Proper authentication and authorization

### 5. What Can Be Done With Exposed API Keys?

If someone obtains your Firebase API keys:

**They CAN:**
- Identify your Firebase project
- Attempt to access public/misconfigured resources
- Generate traffic/quota usage

**They CANNOT:**
- Access properly secured resources (with correct security rules)
- Impersonate authenticated users
- Access your Google Cloud project's sensitive resources

**Protection:**
- Always use proper security rules
- Enable App Check
- Monitor for abuse
- Set billing limits

## Troubleshooting

### Build Errors

If you get build errors about missing Firebase configuration:

1. Verify `google-services.json` is in `android/app/`
2. Verify `GoogleService-Info.plist` is in `ios/BitSleuthWallet/`
3. Ensure the files are also in the root directory (referenced in `app.json`)
4. Clean and rebuild:
   ```bash
   # Android
   cd android && ./gradlew clean && cd ..
   
   # iOS
   cd ios && pod deintegrate && pod install && cd ..
   ```

### Crashlytics Not Reporting

1. Crashlytics only works in release builds, not debug builds
2. Verify Crashlytics is enabled in Firebase Console
3. Check that `firebase.json` has correct Crashlytics configuration
4. Rebuild the app after adding Firebase configuration

### Performance Monitoring Not Working

1. Performance data may take up to 24 hours to appear
2. Verify Performance Monitoring is enabled in Firebase Console
3. Test with release builds for accurate data

### API Key Restrictions

If you restrict your API keys and the app stops working:

1. Verify your app's package name (Android) matches Firebase configuration
2. Verify your app's bundle ID (iOS) matches Firebase configuration
3. Check Google Cloud Console for any API restriction errors
4. Ensure App Check is properly configured if enabled

## Using EAS Build

When building with Expo Application Services (EAS), you have two options:

### Option 1: Include in Version Control (Not Recommended for Public Repos)

If your repository is **private**, you can commit the files. Add to `.gitignore`:

```
# Remove these lines to commit Firebase configs (private repos only)
# google-services.json
# GoogleService-Info.plist
# android/app/google-services.json
# ios/BitSleuthWallet/GoogleService-Info.plist
```

### Option 2: Use EAS Secrets (Recommended)

For public repositories, use EAS secrets:

1. **Encode your files to base64:**
   ```bash
   # Android
   cat google-services.json | base64
   
   # iOS
   cat GoogleService-Info.plist | base64
   ```

2. **Add as EAS secrets:**
   ```bash
   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --value "<base64-encoded-content>"
   eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --value "<base64-encoded-content>"
   ```

3. **Update your `eas.json`** to inject these files during build (requires custom build hooks)

For detailed EAS Build configuration, see [EAS Build Documentation](https://docs.expo.dev/build/introduction/).

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)
- [App Check Documentation](https://firebase.google.com/docs/app-check)
- [Crashlytics Documentation](https://firebase.google.com/docs/crashlytics)
- [Performance Monitoring Documentation](https://firebase.google.com/docs/perf-mon)
- [BitSleuth Wallet Firebase Integration Guide](./FIREBASE_INTEGRATION.md)

## Support

If you encounter issues with Firebase setup:

1. Check the [Firebase Documentation](https://firebase.google.com/docs)
2. Review the [troubleshooting section](#troubleshooting) above
3. Open an issue on GitHub with details about your problem
4. Ensure you're not sharing your actual API keys in issue reports

---

**Remember**: The Firebase configuration files contain your project's API keys. While these keys are meant for client-side use, treat them with care and follow security best practices outlined in this guide.
