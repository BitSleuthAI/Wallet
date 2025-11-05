# Android Edge-to-Edge Implementation

## Overview

This document describes the edge-to-edge implementation for BitSleuth Wallet on Android, ensuring optimal display on both Android 14 (with navigation buttons) and Android 15+ (with edge-to-edge design).

## What is Edge-to-Edge?

Edge-to-edge is a modern Android design pattern that allows apps to draw content behind system bars (status bar and navigation bar) for a more immersive and visually appealing experience. This is the default behavior starting with Android 15.

**Learn more:** [Android Edge-to-Edge Guide](https://developer.android.com/design/ui/mobile/guides/foundations/system-bars)

## Implementation Details

### Version-Specific Behavior

#### Android 15+ (API 35+)
- **Full edge-to-edge mode enabled**
- System bars are completely transparent
- Content draws behind status bar and navigation bar
- System bar icons (time, battery, back button) dynamically adjust color based on theme
- SafeAreaView and SafeAreaProvider handle content padding to avoid overlapping with system UI

#### Android 14 and Below (API 34 and below)
- **Traditional layout mode**
- System bars have solid color (#0F172A - dark blue/slate)
- Content does not draw behind system bars
- System bars provide clear visual separation
- Compatible with devices that have physical or on-screen navigation buttons

### Key Files Modified

#### 1. `MainActivity.kt`
```kotlin
// Main implementation in: android/app/src/main/java/ai/bitsleuth/wallet/MainActivity.kt
```

**Features:**
- `configureEdgeToEdge()`: Centralized edge-to-edge configuration
- Dynamic theme detection (light/dark mode)
- Version-specific behavior (API 35+ vs older)
- `onConfigurationChanged()`: Responds to theme changes in real-time

**Key Logic:**
```kotlin
if (Build.VERSION.SDK_INT >= 35) {
    // Edge-to-edge mode
    WindowCompat.setDecorFitsSystemWindows(window, false)
    window.statusBarColor = android.graphics.Color.TRANSPARENT
    window.navigationBarColor = android.graphics.Color.TRANSPARENT
    
    // Adjust icon colors based on theme
    val isDarkTheme = (resources.configuration.uiMode and 
                      Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    controller.isAppearanceLightStatusBars = !isDarkTheme
    controller.isAppearanceLightNavigationBars = !isDarkTheme
} else {
    // Traditional mode
    WindowCompat.setDecorFitsSystemWindows(window, true)
}
```

#### 2. `values/styles.xml`
```xml
<!-- Path: android/app/src/main/res/values/styles.xml -->
```

**Features:**
- Solid system bar colors (#0F172A) for Android 14 and below
- Navigation bar color configuration
- System bar contrast enforcement enabled
- Light/dark icon configuration (dark icons for light theme)

#### 3. `values-v35/styles.xml`
```xml
<!-- Path: android/app/src/main/res/values-v35/styles.xml -->
```

**Features:**
- Transparent system bars for edge-to-edge
- Contrast enforcement disabled (handled programmatically)
- Separate splash screen configuration for seamless transition

### React Native Integration

The app already uses the correct components for edge-to-edge support:

1. **SafeAreaProvider** (Root level in `app/_layout.tsx`)
   - Provides safe area insets to all child components
   - Automatically detects system UI overlays

2. **SafeAreaView** (Used in all main screens)
   - Applies padding to avoid content overlapping with system bars
   - Works automatically with edge-to-edge on Android 15+

3. **expo-router NativeTabs** (Tab bar in `app/(tabs)/_layout.tsx`)
   - Handles bottom navigation with proper insets
   - Respects safe areas automatically

### gradle.properties

```properties
# Already configured
edgeToEdgeEnabled=true
android.compileSdkVersion=35
android.targetSdkVersion=35
android.minSdkVersion=24
```

## Testing Guide

### How to Test Android 14 Behavior

1. **Using an Emulator:**
   ```bash
   # Create Android 14 (API 34) emulator
   avdmanager create avd -n Android14 -k "system-images;android-34;google_apis;x86_64"
   
   # Launch emulator
   emulator -avd Android14
   
   # Build and run
   npm run android
   ```

2. **Expected Behavior:**
   - Status bar should have dark blue background (#0F172A)
   - Navigation bar should have dark blue background (#0F172A)
   - Content should not extend behind system bars
   - Navigation buttons visible at bottom (if device has them)

### How to Test Android 15+ Behavior

1. **Using an Emulator:**
   ```bash
   # Create Android 15 (API 35) emulator
   avdmanager create avd -n Android15 -k "system-images;android-35;google_apis;x86_64"
   
   # Launch emulator
   emulator -avd Android15
   
   # Build and run
   npm run android
   ```

2. **Expected Behavior:**
   - Status bar should be transparent (content extends behind it)
   - Navigation bar should be transparent (content extends behind it)
   - System icons (time, battery) should be visible with proper contrast
   - Navigation gestures at bottom should work smoothly
   - No visual overlap of important content with system UI

### Testing Dark/Light Theme Switching

1. While app is running, change device theme:
   ```bash
   # Enable dark mode
   adb shell "cmd uimode night yes"
   
   # Enable light mode
   adb shell "cmd uimode night no"
   ```

2. **Expected Behavior:**
   - Android 15+: System bar icons should automatically change color
     - Dark mode: Light icons (white/light gray)
     - Light mode: Dark icons (black/dark gray)
   - Android 14: System bar colors remain consistent (#0F172A)

### Visual Verification Checklist

- [ ] Status bar is visible and icons are readable
- [ ] Navigation area is accessible and doesn't overlap with content
- [ ] Wallet cards and buttons are fully visible
- [ ] Tab bar doesn't overlap with navigation gestures
- [ ] QR scanner works properly (full screen)
- [ ] Modal dialogs appear correctly
- [ ] Transaction list scrolls properly with correct padding
- [ ] Settings screen is fully accessible
- [ ] Theme switching updates system bar icons (Android 15+)

## Troubleshooting

### Issue: Content overlapping with status bar

**Solution:** Ensure SafeAreaView is used correctly:
```tsx
import { SafeAreaView } from 'react-native';

<SafeAreaView style={styles.container}>
  {/* Your content */}
</SafeAreaView>
```

### Issue: System bar icons not visible

**Android 15+:**
- Check if theme detection is working: `isDarkTheme` should reflect actual theme
- Verify `isAppearanceLightStatusBars` is set correctly (opposite of isDarkTheme)

**Android 14:**
- Check if styles.xml has correct colors
- Verify `android:windowLightStatusBar` is set to false

### Issue: Navigation buttons overlapping content

**Android 14 and below:**
- This should not happen - WindowCompat.setDecorFitsSystemWindows(window, true) prevents it
- Check that values/styles.xml is being used (not values-v35)

### Issue: Edge-to-edge not working on Android 15

**Checklist:**
1. Verify `edgeToEdgeEnabled=true` in gradle.properties
2. Check that values-v35/styles.xml exists and has transparent colors
3. Ensure MainActivity.kt has correct version check (>= 35)
4. Clean and rebuild: `cd android && ./gradlew clean && cd ..`

## Build Commands

```bash
# Development build
npm run android

# Clean build
cd android && ./gradlew clean && cd .. && npm run android

# Production build (EAS)
eas build --platform android --profile production
```

## Related Resources

- [Android Edge-to-Edge Documentation](https://developer.android.com/design/ui/mobile/guides/foundations/system-bars)
- [WindowCompat API Reference](https://developer.android.com/reference/androidx/core/view/WindowCompat)
- [WindowInsetsController API](https://developer.android.com/reference/androidx/core/view/WindowInsetsControllerCompat)
- [React Native Safe Area Context](https://github.com/th3rdwave/react-native-safe-area-context)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)

## Summary

This implementation ensures BitSleuth Wallet provides:

1. **Modern Experience** on Android 15+ with full edge-to-edge immersion
2. **Consistent Experience** on Android 14 and below with traditional system bars
3. **Theme-Aware** system bar icons for optimal visibility
4. **Backwards Compatible** with all supported Android versions (API 24+)
5. **Zero Breaking Changes** - existing SafeAreaView usage handles everything automatically

The implementation follows Google's official guidelines and best practices for edge-to-edge design on Android.
