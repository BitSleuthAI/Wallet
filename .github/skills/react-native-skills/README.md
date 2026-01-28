# React Native & Expo Skills

Best practices for React Native and Expo mobile applications targeting iOS and
Android. Optimized for AI agents and LLMs working on this codebase.

## Tech Stack

- React Native 0.81+ with New Architecture
- Expo SDK 54+
- Expo Router 5.1 (file-based navigation)
- NativeWind 4.1 (Tailwind CSS)
- React Native Reanimated 4.1
- TypeScript 5.9

## Structure

- `rules/` - Individual rule files (one per rule)
  - `_sections.md` - Section metadata (titles, impacts, descriptions)
  - `_template.md` - Template for creating new rules
  - `{prefix}-{description}.md` - Individual rule files
- `metadata.json` - Document metadata (version, organization, abstract)
- `SKILL.md` - Skill overview and quick reference
- **`AGENTS.md`** - Compiled output for agents (generated)

## Rules by Category

### Core Rendering (CRITICAL)

- `rendering-text-in-text-component.md` - Wrap strings in Text components
- `rendering-no-falsy-and.md` - Avoid falsy && operator in JSX

### List Performance (HIGH)

- `list-performance-virtualize.md` - Use FlashList for lists
- `list-performance-function-references.md` - Keep stable object references
- `list-performance-callbacks.md` - Hoist callbacks to list root
- `list-performance-inline-objects.md` - Avoid inline objects in renderItem
- `list-performance-item-memo.md` - Pass primitives for memoization
- `list-performance-item-expensive.md` - Keep list items lightweight
- `list-performance-images.md` - Use compressed images in lists
- `list-performance-item-types.md` - Use item types for heterogeneous lists

### Animation (HIGH)

- `animation-gpu-properties.md` - Animate transform/opacity only
- `animation-gesture-detector-press.md` - Use GestureDetector for press
- `animation-derived-value.md` - Prefer useDerivedValue

### Scroll Performance (HIGH)

- `scroll-position-no-state.md` - Never track scroll in useState

### Navigation (HIGH)

- `navigation-native-navigators.md` - Use Expo Router

### React State (MEDIUM)

- `react-state-dispatcher.md` - Use functional setState updates
- `react-state-fallback.md` - State represents user intent only
- `react-state-minimize.md` - Minimize state, derive values

### State Architecture (MEDIUM)

- `state-ground-truth.md` - State must represent ground truth

### React Compiler (MEDIUM)

- `react-compiler-destructure-functions.md` - Destructure functions early
- `react-compiler-reanimated-shared-values.md` - Use .get()/.set()

### User Interface (MEDIUM)

- `ui-expo-image.md` - Use expo-image for images
- `ui-menus.md` - Native dropdown and context menus
- `ui-native-modals.md` - Use native Modal with formSheet
- `ui-pressable.md` - Use Pressable over TouchableOpacity
- `ui-measure-views.md` - Measuring view dimensions
- `ui-safe-area-scroll.md` - Use contentInsetAdjustmentBehavior
- `ui-scrollview-content-inset.md` - Use contentInset for spacing
- `ui-styling.md` - NativeWind styling patterns

### JavaScript (LOW)

- `js-hoist-intl.md` - Hoist Intl formatter creation

### Fonts (LOW)

- `fonts-config-plugin.md` - Load fonts natively at build time

## Creating a New Rule

1. Copy `rules/_template.md` to `rules/{prefix}-{description}.md`
2. Choose the appropriate prefix from `_sections.md`
3. Fill in the frontmatter and content
4. Include clear incorrect/correct examples

## Rule File Structure

```markdown
---
title: Rule Title Here
impact: MEDIUM
impactDescription: Optional description
tags: tag1, tag2, tag3
---

## Rule Title Here

Brief explanation of the rule and why it matters.

**Incorrect (description):**

\`\`\`tsx
// Bad code example
\`\`\`

**Correct (description):**

\`\`\`tsx
// Good code example
\`\`\`

Reference: [Link](https://example.com)
```

## Impact Levels

- `CRITICAL` - Causes crashes or broken UI
- `HIGH` - Significant performance improvements
- `MEDIUM` - Moderate improvements
- `LOW` - Incremental improvements
