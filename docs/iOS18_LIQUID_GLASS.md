# iOS 18 Liquid Glass UI Implementation

This document describes the iOS 18 Liquid Glass UI feature implementation for the BitSleuth Wallet app.

## Overview

Starting with iOS 18, Apple introduced new system blur materials that create a "liquid glass" effect. These materials provide a modern, translucent appearance that adapts to the content behind them, creating depth and visual hierarchy in the UI.

## Implementation

### Platform Detection

The app detects iOS version using the `Platform` API from React Native. A utility module (`utils/platform.ts`) provides helper functions:

- `isIOS18OrHigher()`: Returns true if the device is running iOS 18 or later
- `getLiquidGlassTint(isDark)`: Returns the appropriate blur tint for chrome materials
- `getThinMaterialTint(isDark)`: Returns the appropriate blur tint for thin materials
- `getUltraThinMaterialTint(isDark)`: Returns the appropriate blur tint for ultra-thin materials

### LiquidGlassView Component

A reusable component (`components/LiquidGlassView.tsx`) wraps the `expo-blur` BlurView with iOS 18-aware logic:

```tsx
import { LiquidGlassView } from '@/components/LiquidGlassView';

// Example usage
<LiquidGlassView variant="chrome" intensity={80}>
  <Text>Your content here</Text>
</LiquidGlassView>
```

**Props:**
- `variant`: 'chrome' | 'thin' | 'ultraThin' (default: 'chrome')
  - `chrome`: For prominent UI elements like tab bars
  - `thin`: For cards and medium-emphasis surfaces
  - `ultraThin`: For subtle overlays and backgrounds
- `intensity`: Number between 1-100 (default: 80)
- `style`: Additional styles to apply
- `children`: Child components

### Applied Locations

The liquid glass effect has been applied to:

1. **Tab Bar Navigation** (`app/(tabs)/_layout.tsx`)
   - Uses `systemChromeMaterialLight`/`systemChromeMaterialDark` on iOS 18+
   - Provides a translucent, modern tab bar that shows content behind it
   - Automatically falls back to solid background on iOS < 18

2. **Modal Overlays** (`app/(tabs)/index.tsx`)
   - Edit wallet modal uses ultra-thin material for the backdrop
   - Creates a subtle blur effect while maintaining visibility of background content

### iOS 18 System Materials

The following blur styles are available on iOS 18+:

- `systemUltraThinMaterial` / `systemUltraThinMaterialLight` / `systemUltraThinMaterialDark`
- `systemThinMaterial` / `systemThinMaterialLight` / `systemThinMaterialDark`
- `systemMaterial` / `systemMaterialLight` / `systemMaterialDark`
- `systemThickMaterial` / `systemThickMaterialLight` / `systemThickMaterialDark`
- `systemChromeMaterial` / `systemChromeMaterialLight` / `systemChromeMaterialDark`

### Fallback Behavior

On iOS versions prior to 18:
- Standard blur tints are used ('light', 'dark', 'extraLight')
- The visual effect is similar but uses the older blur API

On Android:
- Semi-transparent views are used as fallback
- Opacity is adjusted based on theme (dark/light mode)

## User Experience

For users on iOS 18 or later:
- Tab bar appears with a modern, translucent liquid glass effect
- Modal overlays use subtle blur effects
- The UI feels more modern and in line with iOS 18 design language
- Content behind translucent elements is slightly visible, creating depth

For users on iOS < 18 or Android:
- Standard blur effects or semi-transparent backgrounds are used
- Functionality remains identical
- Visual appearance is similar but uses older techniques

## Performance Considerations

- Blur effects are GPU-accelerated on iOS
- The `expo-blur` library handles platform-specific optimizations
- Intensity values can be adjusted if performance issues are observed
- On Android, fallback to semi-transparent views minimizes performance impact

## Testing

To test the liquid glass effect:
1. Run the app on iOS 18+ device or simulator
2. Navigate between tabs to see the translucent tab bar
3. Open the wallet edit modal to see the ultra-thin material overlay
4. Verify that content behind translucent elements is subtly visible
5. Test on iOS < 18 to ensure graceful fallback

## Future Enhancements

Potential areas for future liquid glass implementation:
- Action sheets and bottom sheets
- Header bars with scroll-based transparency
- Card components with hover/focus states
- Settings panels and drawers
- Notification overlays

## References

- [Expo Blur Documentation](https://docs.expo.dev/versions/latest/sdk/blur-view/)
- [Apple Human Interface Guidelines - Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [iOS 18 Release Notes](https://developer.apple.com/documentation/ios-ipados-release-notes)
