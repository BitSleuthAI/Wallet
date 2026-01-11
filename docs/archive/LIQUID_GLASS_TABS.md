# Liquid Glass Tabs Implementation

## Overview
This document describes the implementation of liquid glass tabs for iOS 26 using Expo Router v6's NativeTabs component.

## What is Liquid Glass?
Liquid glass is a new native iOS 26 feature that provides a translucent, blurred tab bar that dynamically adapts to the content behind it. It creates a premium, modern appearance with material blur effects that are native to iOS.

## Implementation Details

### Migration from Tabs to NativeTabs
We migrated from the traditional `expo-router` Tabs component to `expo-router/unstable-native-tabs` NativeTabs component to enable iOS 26+ liquid glass effects.

**Before:**
```tsx
import { Tabs } from 'expo-router';

<Tabs
  screenOptions={{
    tabBarActiveTintColor: theme.colors.primary,
    tabBarStyle: { ... },
    tabBarBackground: () => <GlassView ... />
  }}
>
  <Tabs.Screen name="index" options={{ title: 'Wallet', tabBarIcon: ... }} />
</Tabs>
```

**After:**
```tsx
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

<NativeTabs
  tintColor={theme.colors.primary}
  minimizeBehavior="automatic"
  blurEffect="systemMaterial"
>
  <NativeTabs.Trigger name="index">
    <Icon src={<Wallet ... />} />
    <Label>Wallet</Label>
  </NativeTabs.Trigger>
</NativeTabs>
```

### Key Features

#### 1. iOS 26+ Minimize Behavior
The `minimizeBehavior` prop enables automatic tab bar minimization on iOS 26:

```tsx
minimizeBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
```

Options:
- `automatic` - Uses system default behavior (recommended for iOS 26)
- `never` - Tab bar never minimizes
- `onScrollDown` - Minimizes when scrolling down
- `onScrollUp` - Minimizes when scrolling up

#### 2. Blur Effect
Native iOS blur effect for the tab bar background:

```tsx
blurEffect="systemMaterial"
```

Available blur effects:
- `systemMaterial` - Standard material blur (recommended)
- `systemUltraThinMaterial` - Extra light blur
- `systemThickMaterial` - Heavy blur
- `regular`, `prominent`, `light`, `dark`, etc.

#### 3. Transparent Background
Semi-transparent background that allows the blur effect to work:

```tsx
backgroundColor={Platform.select({
  ios: theme.isDark ? '#00000066' : '#FFFFFF66',
  android: theme.colors.background,
})}
```

The `66` alpha value (40% opacity) allows the blur to show through while maintaining visual hierarchy.

#### 4. Theme-Aware Colors
Dynamic color support for light and dark modes:

```tsx
iconColor={{
  default: theme.colors.textSecondary,
  selected: theme.colors.primary,
}}

labelStyle={{
  default: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  selected: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
}}
```

### Icon Integration with Lucide
Since NativeTabs expects React elements for icons, we wrap Lucide icons:

```tsx
<Icon
  src={
    <Wallet
      color={theme.colors.textSecondary}
      size={24}
      strokeWidth={2}
    />
  }
/>
```

## Browser/Platform Compatibility

### iOS 26+
- ✅ Full liquid glass support with native minimize behavior
- ✅ System material blur effects
- ✅ Automatic tab bar animations

### iOS 18-25
- ✅ Blur effects work (using older iOS blur APIs)
- ⚠️ `minimizeBehavior` ignored (tab bar always visible)
- ✅ All other styling properties work normally

### Android
- ✅ Standard tab bar (no blur effect)
- ✅ Solid background color from theme
- ✅ All label and icon styling works

## Testing

### iOS Simulator (iOS 26+)
To test on iOS 26:
```bash
npm run ios
```

The liquid glass effect should be visible when:
1. Scrolling content in any tab
2. The tab bar should minimize/show based on scroll direction
3. Background blur adapts to content behind it

### iOS Simulator (iOS < 26)
On older iOS versions:
- Tab bar will use blur effect but won't minimize
- All styling will work normally
- No warnings or errors

### Android
On Android:
- Standard material tab bar
- Solid background color
- All functionality works

## Configuration

### App Configuration
No changes needed to `app.json` - iOS 26 support is automatic when:
1. Device is running iOS 26+
2. Using NativeTabs from expo-router/unstable-native-tabs
3. Expo SDK version supports iOS 26 (current SDK 54+)

### Build Configuration
No special build flags needed. The implementation uses:
- Expo Router v6 (~6.0.13)
- React Native Screens (~4.16.0)
- Both support iOS 26 features

## API Reference

### NativeTabs Props
```tsx
interface NativeTabsProps {
  tintColor?: ColorValue;
  iconColor?: ColorValue | { default?: ColorValue; selected?: ColorValue };
  labelStyle?: NativeTabsLabelStyle | { default?: NativeTabsLabelStyle; selected?: NativeTabsLabelStyle };
  minimizeBehavior?: 'automatic' | 'never' | 'onScrollDown' | 'onScrollUp'; // iOS 26+
  blurEffect?: 'systemMaterial' | 'regular' | 'prominent' | ...; // iOS
  backgroundColor?: ColorValue | null;
  shadowColor?: ColorValue; // iOS
  disableTransparentOnScrollEdge?: boolean; // iOS
}
```

### NativeTabs.Trigger Props
```tsx
interface NativeTabTriggerProps {
  name: string; // Route name (e.g., "index", "send")
  hidden?: boolean;
  disablePopToTop?: boolean; // iOS
  disableScrollToTop?: boolean; // iOS
}
```

### Icon Component
```tsx
<Icon 
  src={ReactElement}  // React element (Lucide icon, Image, etc.)
  selectedColor?: ColorValue
/>
```

### Label Component
```tsx
<Label>
  {string} // Label text
</Label>
```

## Troubleshooting

### Tab bar not showing blur
- Ensure `backgroundColor` has alpha < 1 (e.g., `#00000066`)
- Check that `blurEffect` is set to a valid value
- Verify iOS version (blur works on iOS 13+, liquid glass on iOS 26+)

### Tab bar stuck in dark mode (not adapting to theme changes)
**Problem**: On iOS, the liquid glass tabs stay in dark mode even when the app switches to light mode.

**Root Cause**: The `NativeTabs` component doesn't automatically re-render when the device appearance changes. The component receives theme values on mount but doesn't update them when the color scheme switches.

**Solution**: Force remount on appearance changes by:
1. Add state to track theme changes: `const [themeKey, setThemeKey] = useState(0);`
2. Listen to appearance changes and update key:
```tsx
useEffect(() => {
  const subscription = Appearance.addChangeListener(() => {
    setThemeKey(prev => prev + 1);
  });
  return () => subscription.remove();
}, []);
```
3. Pass key to `NativeTabs`: `<NativeTabs key={themeKey} ...>`
4. Ensure `blurEffect` adapts to theme: `blurEffect={theme.isDark ? 'dark' : 'light'}`

This forces React to unmount and remount the `NativeTabs` component with fresh theme values whenever the system appearance changes.

### Icons not showing
- Ensure icon is a valid React element
- Check icon color matches theme
- Verify Lucide icons are imported correctly

### Minimize behavior not working
- Only works on iOS 26+
- Set `minimizeBehavior` to `'automatic'`
- Ensure content is scrollable

## Future Considerations

### When NativeTabs Stabilizes
When `expo-router/unstable-native-tabs` becomes stable:
1. Update import to `expo-router`
2. API should remain the same
3. May need to update Expo Router version

### Additional Features
Potential future enhancements:
- Badge support for notifications
- Custom tab bar items
- Haptic feedback integration
- Advanced animations

## References

- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [React Native Screens](https://github.com/software-mansion/react-native-screens)
- [iOS 26 UIKit Tab Bar Documentation](https://developer.apple.com/documentation/uikit/uitabbarcontroller)
- [Apple HIG - Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
