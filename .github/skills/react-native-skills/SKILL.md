---
name: react-native-expo-skills
description:
  React Native and Expo best practices for building performant iOS and Android
  mobile apps. Use when building components, optimizing list performance,
  implementing animations with Reanimated, or styling with NativeWind. Triggers
  on tasks involving React Native, Expo, Expo Router navigation, or mobile
  performance optimization.
license: MIT
metadata:
  author: BitSleuth
  version: '2.0.0'
---

# React Native & Expo Skills

Best practices for React Native and Expo mobile applications targeting iOS and
Android. Contains rules covering performance, animations, navigation, styling,
and platform-specific optimizations.

## Tech Stack

- React Native 0.81+
- Expo SDK 54+
- Expo Router (file-based navigation)
- NativeWind (Tailwind CSS)
- React Native Reanimated
- TypeScript

## When to Apply

Reference these guidelines when:

- Building React Native or Expo apps for iOS/Android
- Optimizing list and scroll performance
- Implementing animations with Reanimated
- Configuring navigation with Expo Router
- Styling components with NativeWind
- Working with images using expo-image

## Rule Categories by Priority

| Priority | Category         | Impact   | Prefix              |
| -------- | ---------------- | -------- | ------------------- |
| 1        | Core Rendering   | CRITICAL | `rendering-`        |
| 2        | List Performance | HIGH     | `list-performance-` |
| 3        | Animation        | HIGH     | `animation-`        |
| 4        | Scroll           | HIGH     | `scroll-`           |
| 5        | Navigation       | HIGH     | `navigation-`       |
| 6        | React State      | MEDIUM   | `react-state-`      |
| 7        | State Arch       | MEDIUM   | `state-`            |
| 8        | React Compiler   | MEDIUM   | `react-compiler-`   |
| 9        | User Interface   | MEDIUM   | `ui-`               |
| 10       | JavaScript       | LOW      | `js-`               |
| 11       | Fonts            | LOW      | `fonts-`            |

## Quick Reference

### 1. Core Rendering (CRITICAL)

- `rendering-text-in-text-component` - Wrap strings in Text components
- `rendering-no-falsy-and` - Avoid falsy && for conditional rendering

### 2. List Performance (HIGH)

- `list-performance-virtualize` - Use FlashList for large lists
- `list-performance-item-memo` - Pass primitives for memoization
- `list-performance-callbacks` - Hoist callbacks to list root
- `list-performance-inline-objects` - Avoid inline style objects
- `list-performance-function-references` - Keep stable object references
- `list-performance-images` - Use compressed images in lists
- `list-performance-item-expensive` - Keep list items lightweight
- `list-performance-item-types` - Use item types for heterogeneous lists

### 3. Animation (HIGH)

- `animation-gpu-properties` - Animate transform and opacity only
- `animation-derived-value` - Use useDerivedValue for computed animations
- `animation-gesture-detector-press` - Use Gesture.Tap for press animations

### 4. Scroll Performance (HIGH)

- `scroll-position-no-state` - Never track scroll position in useState

### 5. Navigation (HIGH)

- `navigation-native-navigators` - Use Expo Router for file-based navigation

### 6. React State (MEDIUM)

- `react-state-minimize` - Minimize state variables, derive values
- `react-state-dispatcher` - Use functional setState updates
- `react-state-fallback` - Use fallback state instead of initialState

### 7. State Architecture (MEDIUM)

- `state-ground-truth` - State must represent ground truth

### 8. React Compiler (MEDIUM)

- `react-compiler-destructure-functions` - Destructure functions early
- `react-compiler-reanimated-shared-values` - Use .get()/.set() for shared values

### 9. User Interface (MEDIUM)

- `ui-expo-image` - Use expo-image for all images
- `ui-pressable` - Use Pressable over TouchableOpacity
- `ui-safe-area-scroll` - Use contentInsetAdjustmentBehavior
- `ui-scrollview-content-inset` - Use contentInset for dynamic spacing
- `ui-menus` - Use native context menus
- `ui-native-modals` - Use native modals when possible
- `ui-measure-views` - Use onLayout for measuring views
- `ui-styling` - Use NativeWind for styling

### 10. JavaScript (LOW)

- `js-hoist-intl` - Hoist Intl object creation

### 11. Fonts (LOW)

- `fonts-config-plugin` - Use config plugins for custom fonts

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/list-performance-virtualize.md
rules/animation-gpu-properties.md
rules/ui-styling.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
