# Android Edge-to-Edge Visual Comparison

## Android 14 and Below (Traditional Layout)

```
┌─────────────────────────────────────────┐
│  Status Bar (#0F172A - Dark Blue/Slate)│  ← Solid color
│  🔋 📶 🕐                               │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│        APP CONTENT AREA                 │
│        (Safe from system bars)          │
│                                         │
│                                         │
│                                         │
│                                         │
│        [ Wallet Cards ]                 │
│        [ Transactions ]                 │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  Tab Bar (Wallet | Send | Receive)     │
├─────────────────────────────────────────┤
│  Nav Bar (#0F172A - Dark Blue/Slate)   │  ← Solid color
│  ◀  ⏺  ☰   (Navigation Buttons)        │
└─────────────────────────────────────────┘
```

**Characteristics:**
- Status bar and navigation bar have solid dark blue color (#0F172A)
- Content does not extend behind system bars
- Clear visual separation between system UI and app content
- Compatible with devices that have physical or on-screen navigation buttons
- Uses `WindowCompat.setDecorFitsSystemWindows(window, true)`

---

## Android 15+ (Edge-to-Edge Layout)

```
┌─────────────────────────────────────────┐
│  🔋 📶 🕐                               │  ← Transparent, icons over content
│─────────────────────────────────────────│     (Dynamic color based on theme)
│                                         │
│                                         │
│        APP CONTENT AREA                 │
│     (Extends behind status bar)         │
│                                         │
│                                         │
│                                         │
│                                         │
│        [ Wallet Cards ]                 │
│        [ Transactions ]                 │
│                                         │
│                                         │
│─────────────────────────────────────────│
│  Tab Bar (Wallet | Send | Receive)     │
│─────────────────────────────────────────│     
│     (Extends to bottom edge)            │  ← Transparent navigation area
│                                         │     Gesture navigation
└─────────────────────────────────────────┘
```

**Characteristics:**
- Status bar and navigation bar are transparent
- Content extends behind system bars (edge-to-edge)
- System bar icons dynamically change color based on theme:
  - **Dark Mode**: Light icons (white/light gray) for contrast
  - **Light Mode**: Dark icons (black/dark gray) for contrast
- Gesture-based navigation (swipe from edges)
- Uses `WindowCompat.setDecorFitsSystemWindows(window, false)`
- SafeAreaView automatically adds padding to prevent content overlap

---

## Theme Adaptation

### Dark Mode (Both Versions)

**Android 14 and Below:**
```
Status Bar: #0F172A with light icons ⬜
Navigation Bar: #0F172A with light icons ⬜
```

**Android 15+:**
```
Status Bar: Transparent with light icons ⬜
Navigation Bar: Transparent with light icons ⬜
Content: Dark background (#0A0A0F) shows through
```

### Light Mode (Both Versions)

**Android 14 and Below:**
```
Status Bar: #0F172A with light icons ⬜
Navigation Bar: #0F172A with light icons ⬜
```

**Android 15+:**
```
Status Bar: Transparent with dark icons ⬛
Navigation Bar: Transparent with dark icons ⬛
Content: Light background (#FFFFFF) shows through
```

---

## SafeAreaView Behavior

### Without SafeAreaView (Android 15+ - INCORRECT)
```
┌─────────────────────────────────────────┐
│  🔋 📶 🕐  [ Important Button ]         │  ❌ Button overlaps status bar!
│─────────────────────────────────────────│
│                                         │
│        [ Wallet Balance: $10,000 ]      │  ❌ Text may be hard to read
```

### With SafeAreaView (Android 15+ - CORRECT)
```
┌─────────────────────────────────────────┐
│  🔋 📶 🕐                               │  ← Safe area padding added
│─────────────────────────────────────────│
│                                         │
│        [ Important Button ]             │  ✅ Button in safe area
│        [ Wallet Balance: $10,000 ]      │  ✅ Content clearly visible
```

---

## Implementation Summary

| Feature | Android 14 & Below | Android 15+ |
|---------|-------------------|-------------|
| Status Bar Color | #0F172A (Solid) | Transparent |
| Navigation Bar Color | #0F172A (Solid) | Transparent |
| Content Behind Bars | No | Yes |
| Icon Color (Dark Mode) | Light (Static) | Light (Dynamic) |
| Icon Color (Light Mode) | Light (Static) | Dark (Dynamic) |
| setDecorFitsSystemWindows | true | false |
| SafeAreaView Required | Optional | Essential |
| Navigation Type | Buttons or Gestures | Primarily Gestures |

---

## Developer Notes

1. **SafeAreaView is Critical on Android 15+**
   - Without it, content will overlap with system UI
   - Already implemented in all main screens
   - Provided by `react-native-safe-area-context`

2. **Theme Changes are Automatic**
   - `onConfigurationChanged()` handles theme switches
   - System bar icons update immediately
   - No manual intervention required

3. **Backward Compatibility**
   - Android 14 and below use traditional layout
   - No edge-to-edge, solid system bars
   - More predictable for older devices

4. **Testing Both Modes**
   ```bash
   # Test Android 14
   emulator -avd Android14
   
   # Test Android 15
   emulator -avd Android15
   ```

---

## Related Files

- `MainActivity.kt` - Native implementation
- `values/styles.xml` - Android 14 styles
- `values-v35/styles.xml` - Android 15+ styles
- `app/_layout.tsx` - SafeAreaProvider integration
- `app/(tabs)/*.tsx` - SafeAreaView usage

For detailed implementation and testing instructions, see [ANDROID_EDGE_TO_EDGE.md](./ANDROID_EDGE_TO_EDGE.md).
