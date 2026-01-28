---
title: Use Expo Router for File-Based Navigation
impact: HIGH
impactDescription: native performance, platform-appropriate UI
tags: navigation, expo-router, native-stack, tabs, ios, android
---

## Use Expo Router for File-Based Navigation

Use Expo Router for file-based navigation. Expo Router uses native navigators
under the hood (UINavigationController on iOS, Fragment on Android) for better
performance and native behavior.

### Stack Navigation

Expo Router uses native stack by default:

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="transaction-details" options={{ title: 'Details' }} />
    </Stack>
  )
}
```

### Tab Navigation

Use the Tabs component for bottom tab navigation:

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: 'Send',
          tabBarIcon: ({ color }) => <SendIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: 'Receive',
          tabBarIcon: ({ color }) => <ReceiveIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
    </Tabs>
  )
}
```

### Modal Screens

Use presentation: 'modal' for modal screens:

```tsx
<Stack.Screen
  name="wallet-setup"
  options={{
    presentation: 'modal',
    title: 'Setup Wallet',
  }}
/>
```

### Prefer Native Header Options Over Custom Components

**Incorrect (custom header component):**

```tsx
<Stack.Screen
  name="profile"
  options={{
    header: () => <CustomHeader title="Profile" />,
  }}
/>
```

**Correct (native header options):**

```tsx
<Stack.Screen
  name="profile"
  options={{
    title: 'Profile',
    headerLargeTitle: true,
    headerSearchBarOptions: {
      placeholder: 'Search',
    },
  }}
/>
```

Native headers support iOS large titles, search bars, blur effects, and proper
safe area handling automatically.

### Programmatic Navigation

```tsx
import { router } from 'expo-router'

// Navigate to a screen
router.push('/transaction-details')

// Navigate with params
router.push({
  pathname: '/transaction-details',
  params: { txid: '...' },
})

// Go back
router.back()

// Replace current screen
router.replace('/home')
```

### Why Expo Router

- **File-based routing**: Routes are defined by file structure
- **Native performance**: Uses native stack and tab navigators
- **Type safety**: Full TypeScript support for routes
- **Deep linking**: Built-in deep linking support
- **Platform behavior**: Automatic iOS/Android platform conventions

Reference:

- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [Expo Router Native Tabs](https://docs.expo.dev/router/advanced/native-tabs/)
