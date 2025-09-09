# 🎨 BitSleuth Wallet Splash Screen Setup Guide

This guide explains how to set up the custom splash screen for your BitSleuth Wallet app using **Expo's built-in splash screen system**.

## ✨ Features

- **Custom Branding**: Beautiful BitSleuth Wallet branding with Bitcoin theme
- **Smooth Animations**: Elegant entrance animations with logo rotation and fade effects
- **Cross-Platform**: Consistent experience on both iOS and Android
- **App Store Compliant**: Meets Apple App Store requirements for splash screens
- **Professional Design**: Dark theme with Bitcoin orange accents and security icons
- **Expo Compatible**: Uses Expo's native splash screen system for optimal performance

## 🚀 Quick Start

### 1. Dependencies

The required dependencies are already installed:
- `expo-splash-screen` - Built into Expo
- `expo-linear-gradient` - For beautiful background gradients
- `lucide-react-native` - For icons

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

1. **LaunchScreen.storyboard** (Already created)
   - Located at: `ios/BitSleuthWallet/LaunchScreen.storyboard`
   - Contains the native iOS splash screen layout
   - Uses system colors for automatic dark/light mode support

2. **Info.plist** (Update required)
   - Ensure `UILaunchStoryboardName` is set to `LaunchScreen`
   - This should already be configured in your Expo project

#### Android Setup

1. **styles.xml** (Already created)
   - Located at: `android/app/src/main/res/values/styles.xml`
   - Defines the `SplashTheme` for Android

2. **splash_background.xml** (Already created)
   - Located at: `android/app/src/main/res/drawable/splash_background.xml`
   - Defines the splash screen background layout

3. **colors.xml** (Already created)
   - Located at: `android/app/src/main/res/values/colors.xml`
   - Defines the color scheme for the splash screen

4. **splash_logo.xml** (Already created)
   - Located at: `android/app/src/main/res/drawable/splash_logo.xml`
   - Vector drawable for the BitSleuth logo

### 3. React Native Components

#### Components
- **SplashScreen.tsx** (Already created)
  - Main splash screen component with animations
  - Bitcoin-themed design with security icons

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
1. **Logo Entrance**: Bitcoin icon scales and fades in
2. **Icon Rotation**: Bitcoin icon rotates 360 degrees
3. **Text Fade**: App name and tagline fade in
4. **Glow Effect**: Subtle background glow appears
5. **Loading Dots**: Animated loading indicator
6. **Transition**: Smooth transition to main app

### 3. Branding Elements
- **App Name**: "BitSleuth" in large, bold text
- **Tagline**: "Secure • Fast • Private"
- **Bitcoin Icon**: Orange Bitcoin symbol with rotation
- **Security Icons**: Shield and lightning bolt for features
- **Bottom Text**: "Bitcoin Wallet" for context

## 🔧 Customization

### Colors
The splash screen uses a dark theme with these colors:
- **Background**: `#0F172A` (Dark blue-gray)
- **Primary Text**: `#FFFFFF` (White)
- **Secondary Text**: `#CBD5E1` (Light gray)
- **Accent**: `#6366F1` (Indigo)
- **Bitcoin**: `#F7931A` (Bitcoin orange)

### Animation Timing
You can adjust animation durations in `SplashScreen.tsx`:
```typescript
// Logo entrance: 800ms
// Icon rotation: 1000ms
// Text fade: 800ms
// Glow effect: 600ms
// Hold time: 500ms
```

### Logo and Icons
- **Bitcoin Icon**: Uses Lucide React Native icons
- **Security Icons**: Shield and Zap icons for features
- **Custom Logo**: You can replace with your own logo image

## 📱 Platform-Specific Features

### iOS
- **LaunchScreen.storyboard**: Native iOS splash screen
- **Auto Layout**: Responsive design for all screen sizes
- **System Colors**: Automatic dark/light mode support

### Android
- **Vector Drawables**: Scalable graphics for all densities
- **Material Design**: Follows Android design guidelines
- **Status Bar**: Custom status bar colors

## 🚨 Troubleshooting

### Common Issues

1. **Splash Screen Not Showing**
   - Check that `expo-splash-screen` is properly configured
   - Verify app.json splash configuration
   - Ensure the splash screen manager is called correctly

2. **Animation Not Working**
   - Check that `expo-linear-gradient` is installed
   - Verify all required icons are available
   - Check for any console errors

3. **Platform-Specific Issues**
   - **iOS**: Verify LaunchScreen.storyboard is properly configured
   - **Android**: Check that styles.xml references the correct theme

### Debug Mode
Enable debug logging by checking the console for:
- `🚀 Initializing crypto in RootLayout...`
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

**Note**: This splash screen implementation is designed to work seamlessly with your existing BitSleuth Wallet app using Expo's native splash screen system. All functionality has been preserved while adding a professional, branded launch experience that's fully compatible with Expo.
