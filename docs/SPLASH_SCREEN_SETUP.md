# 🎨 BitSleuth Wallet Splash Screen Setup Guide

This guide explains how to set up the custom splash screen for your BitSleuth Wallet app using **Expo's built-in splash screen system**.

## ✨ Features

- **Custom Branding**: Beautiful BitSleuth Wallet branding with magnifying glass theme
- **Smooth Animations**: Elegant entrance animations with spring effects and fade transitions
- **Cross-Platform**: Consistent experience on both iOS and Android
- **App Store Compliant**: Meets Apple App Store requirements for splash screens
- **Professional Design**: Orange gradient theme with magnifying glass logo and version display
- **Expo Compatible**: Uses Expo's native splash screen system for optimal performance

## 🚀 Quick Start

### 1. Dependencies

The required dependencies are already installed:
- `expo-splash-screen` - Built into Expo
- `expo-linear-gradient` - For beautiful background gradients
- `react-native-svg` - For custom SVG logo rendering

### 2. Configuration

#### Expo Configuration (app.json)
```json
{
  "expo": {
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0F172A"
    }
  }
}
```

#### iOS Setup

1. **SplashScreen.storyboard** (Already created)
   - Located at: `ios/BitSleuthWallet/SplashScreen.storyboard`
   - Contains the native iOS splash screen layout
   - Uses `SplashScreenLogo` image asset for the logo

2. **Info.plist** (Update required)
   - Ensure `UILaunchStoryboardName` is set to `SplashScreen`
   - This should already be configured in your Expo project

#### Android Setup

1. **styles.xml** (Already created)
   - Located at: `android/app/src/main/res/values/styles.xml`
   - Defines the `Theme.App.SplashScreen` for Android 12+ splash screen API

2. **colors.xml** (Already created)
   - Located at: `android/app/src/main/res/values/colors.xml`
   - Defines the color scheme for the splash screen

3. **Splash Screen Assets** (Already created)
   - Located at: `android/app/src/main/res/drawable-*/splashscreen_logo.png`
   - Multiple density versions of the splash screen logo

### 3. React Native Components

#### Components
- **SplashScreen.tsx** (Already created)
  - Main splash screen component with animations
  - Magnifying glass logo with orange gradient background
  - Version display and app branding

#### Services
- **splash-screen-manager.ts** (Already created)
  - Manages Expo splash screen lifecycle
  - Handles hiding the Expo splash screen

#### Hooks
- **use-splash-screen.ts** (Already created)
  - Custom hook for managing splash screen state
  - Integrates with app initialization

### 4. App Integration

The splash screen is already integrated into your main app layout (`app/_layout.tsx`):

```typescript
function AppWithSplash() {
  const { isVisible, hideSplash, isReady } = useSplashScreen();

  if (isVisible) {
    return <SplashScreen onAnimationComplete={hideSplash} />;
  }

  if (isReady) {
    return <AppWithLock />;
  }

  return <SplashScreen onAnimationComplete={hideSplash} />;
}
```

## 🎯 How It Works

### 1. App Launch Sequence
1. **Expo Splash Screen**: Shows immediately when app launches (configured in app.json)
2. **React Native Initialization**: App starts loading and initializing
3. **Custom Splash Screen**: Shows while crypto and wallet services initialize
4. **Main App**: Displays when everything is ready

### 2. Animation Sequence
1. **Logo Entrance**: Magnifying glass scales in with spring animation
2. **Logo Fade**: Magnifying glass fades in smoothly
3. **Text Fade**: App name and tagline fade in
4. **Hold Display**: Shows version and wallet description
5. **Transition**: Smooth transition to main app

### 3. Branding Elements
- **App Name**: "BitSleuth" in large, bold text
- **Tagline**: "secure • private • trusted"
- **Magnifying Glass Logo**: White magnifying glass with spring animation
- **Version Display**: Shows current app version (v1.1.6)
- **Bottom Text**: "Bitcoin Wallet" for context

## 🔧 Customization

### Colors
The splash screen uses an orange gradient theme with these colors:
- **Background Gradient**: `#FF8A3D` → `#FF6B5C` → `#FF5E7B` (Orange gradient)
- **Primary Text**: `#FFFFFF` (White)
- **Secondary Text**: `rgba(255, 255, 255, 0.95)` (Semi-transparent white)
- **Logo**: `#FFFFFF` (White magnifying glass)
- **Version Text**: `rgba(255, 255, 255, 0.8)` (Semi-transparent white)

### Animation Timing
You can adjust animation durations in `SplashScreen.tsx`:
```typescript
// Magnifying glass spring animation: tension: 20, friction: 7
// Logo fade: 600ms
// Text fade: 800ms
// Hold time: 1500ms
```

### Logo and Icons
- **Magnifying Glass**: Custom SVG logo using react-native-svg
- **Version Display**: Shows current app version dynamically
- **Custom Logo**: You can replace the SVG with your own logo

## 📱 Platform-Specific Features

### iOS
- **SplashScreen.storyboard**: Native iOS splash screen
- **Auto Layout**: Responsive design for all screen sizes
- **Image Assets**: Uses SplashScreenLogo image asset

### Android
- **Splash Screen API**: Uses Android 12+ splash screen API
- **Multiple Densities**: PNG assets for all screen densities
- **Theme Integration**: Integrated with app theme system

## 🚨 Troubleshooting

### Common Issues

1. **Splash Screen Not Showing**
   - Check that `expo-splash-screen` is properly configured
   - Verify app.json splash configuration
   - Ensure the splash screen manager is called correctly

2. **Animation Not Working**
   - Check that `expo-linear-gradient` is installed
   - Verify `react-native-svg` is properly installed
   - Check for any console errors

3. **Platform-Specific Issues**
   - **iOS**: Verify SplashScreen.storyboard is properly configured
   - **Android**: Check that styles.xml references the correct splash screen theme

### Debug Mode
Enable debug logging by checking the console for:
- `🚀 Initializing app in RootLayout...`
- `✅ Crypto initialized successfully`
- `🎉 Splash screen hidden, app is ready!`

## 📋 App Store Requirements

This splash screen implementation meets Apple App Store requirements:
- ✅ **No Blank Screen**: Custom splash screen prevents loading issues
- ✅ **Branding**: Clear app identification with logo and name
- ✅ **Professional**: High-quality design that enhances user experience
- ✅ **Consistent**: Same experience across all devices and orientations
- ✅ **Expo Compatible**: Uses official Expo splash screen system

## 🎉 Next Steps

1. **Test on Devices**: Test the splash screen on both iOS and Android devices
2. **Customize Branding**: Update colors, logos, or text if desired
3. **App Store Submission**: Your splash screen now meets all requirements

## 📚 Additional Resources

- [Expo Splash Screen Documentation](https://docs.expo.dev/versions/latest/sdk/splash-screen/)
- [iOS Launch Screen Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/launch-screen/)
- [Android Splash Screen Guidelines](https://developer.android.com/guide/topics/ui/splash-screen)

---

**Note**: This splash screen implementation is designed to work seamlessly with your existing BitSleuth Wallet app using Expo's native splash screen system. The magnifying glass theme reflects the "BitSleuth" branding while providing a professional, branded launch experience that's fully compatible with Expo and meets all platform requirements.
