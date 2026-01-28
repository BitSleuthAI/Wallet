---
title: Styling with NativeWind and Modern Patterns
impact: MEDIUM
impactDescription: consistent design, cleaner layouts, better DX
tags: styling, nativewind, tailwind, css, layout, shadows
---

## Styling with NativeWind and Modern Patterns

This project uses NativeWind (Tailwind CSS for React Native). Follow these
patterns for consistent, maintainable styling.

### NativeWind Basics

Use Tailwind classes via the `className` prop:

```tsx
import { View, Text } from 'react-native'

function Card({ title, children }: Props) {
  return (
    <View className="bg-white rounded-xl p-4 shadow-md">
      <Text className="text-lg font-semibold text-gray-900">{title}</Text>
      {children}
    </View>
  )
}
```

### Prefer NativeWind Over StyleSheet

**Incorrect (verbose StyleSheet):**

```tsx
import { View, Text, StyleSheet } from 'react-native'

function Card({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
})
```

**Correct (concise NativeWind):**

```tsx
import { View, Text } from 'react-native'

function Card({ title }: Props) {
  return (
    <View className="bg-white rounded-xl p-4">
      <Text className="text-lg font-semibold text-gray-900">{title}</Text>
    </View>
  )
}
```

### Use gap for Spacing

**Incorrect (margin on children):**

```tsx
<View>
  <Text className="mb-2">Title</Text>
  <Text className="mb-2">Subtitle</Text>
</View>
```

**Correct (gap on parent):**

```tsx
<View className="gap-2">
  <Text>Title</Text>
  <Text>Subtitle</Text>
</View>
```

### Combining Static and Dynamic Styles

For conditional styling, combine NativeWind classes with template literals:

```tsx
function Button({ variant, disabled }: Props) {
  return (
    <Pressable
      className={`px-4 py-2 rounded-lg ${
        variant === 'primary' ? 'bg-blue-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={variant === 'primary' ? 'text-white' : 'text-gray-900'}>
        Press me
      </Text>
    </Pressable>
  )
}
```

### Platform-Specific Styles

Use platform prefixes for platform-specific styles:

```tsx
<View className="ios:pt-12 android:pt-4">
  <Text>Content</Text>
</View>
```

### Dark Mode Support

Use dark mode variants:

```tsx
<View className="bg-white dark:bg-gray-900">
  <Text className="text-gray-900 dark:text-white">Content</Text>
</View>
```

### Modern React Native Style Properties

When using inline styles (for animations or dynamic values), use modern patterns:

**Use `borderCurve: 'continuous'` with borderRadius:**

```tsx
// Smoother iOS-style corners
{ borderRadius: 12, borderCurve: 'continuous' }
```

**Use CSS boxShadow syntax:**

```tsx
// Modern shadow syntax
{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }
```

**Use experimental_backgroundImage for gradients:**

```tsx
// Native gradient support
{
  experimental_backgroundImage: 'linear-gradient(to bottom, #000, #fff)'
}
```

### Common NativeWind Patterns

**Flex layout:**
```tsx
<View className="flex-1 flex-row items-center justify-between">
```

**Safe area padding:**
```tsx
<View className="pt-safe pb-safe">
```

**Responsive spacing:**
```tsx
<View className="p-4 md:p-6 lg:p-8">
```

Reference:

- [NativeWind Documentation](https://www.nativewind.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
