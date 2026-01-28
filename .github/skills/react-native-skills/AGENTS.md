# React Native & Expo Skills

**Version 2.0.0**
BitSleuth
January 2026

> **Note:**
> This document is for agents and LLMs to follow when maintaining,
> generating, or refactoring React Native codebases. Humans
> may also find it useful, but guidance here is optimized for automation
> and consistency by AI-assisted workflows.

---

## Abstract

Performance and best practices guide for React Native and Expo mobile applications targeting iOS and Android. Contains 25+ rules across 11 categories covering core rendering, list performance, animations with Reanimated, navigation with Expo Router, styling with NativeWind, and platform-specific optimizations. Each rule includes detailed explanations, incorrect vs. correct code examples, and impact assessments.

---

## Table of Contents

1. [Core Rendering](#1-core-rendering) — **CRITICAL**
   - 1.1 [Never Use && with Potentially Falsy Values](#11-never-use--with-potentially-falsy-values)
   - 1.2 [Wrap Strings in Text Components](#12-wrap-strings-in-text-components)
2. [List Performance](#2-list-performance) — **HIGH**
   - 2.1 [Use a List Virtualizer for Any List](#21-use-a-list-virtualizer-for-any-list)
   - 2.2 [Optimize List Performance with Stable Object References](#22-optimize-list-performance-with-stable-object-references)
   - 2.3 [Avoid Inline Objects in renderItem](#23-avoid-inline-objects-in-renderitem)
   - 2.4 [Hoist Callbacks to the Root of Lists](#24-hoist-callbacks-to-the-root-of-lists)
   - 2.5 [Pass Primitives to List Items for Memoization](#25-pass-primitives-to-list-items-for-memoization)
   - 2.6 [Keep List Items Lightweight](#26-keep-list-items-lightweight)
   - 2.7 [Use Compressed Images in Lists](#27-use-compressed-images-in-lists)
   - 2.8 [Use Item Types for Heterogeneous Lists](#28-use-item-types-for-heterogeneous-lists)
3. [Animation](#3-animation) — **HIGH**
   - 3.1 [Animate Transform and Opacity Instead of Layout Properties](#31-animate-transform-and-opacity-instead-of-layout-properties)
   - 3.2 [Prefer useDerivedValue Over useAnimatedReaction](#32-prefer-usederivedvalue-over-useanimatedreaction)
   - 3.3 [Use GestureDetector for Animated Press States](#33-use-gesturedetector-for-animated-press-states)
4. [Scroll Performance](#4-scroll-performance) — **HIGH**
   - 4.1 [Never Track Scroll Position in useState](#41-never-track-scroll-position-in-usestate)
5. [Navigation](#5-navigation) — **HIGH**
   - 5.1 [Use Expo Router for File-Based Navigation](#51-use-expo-router-for-file-based-navigation)
6. [React State](#6-react-state) — **MEDIUM**
   - 6.1 [Minimize State Variables and Derive Values](#61-minimize-state-variables-and-derive-values)
   - 6.2 [Use Fallback State Instead of initialState](#62-use-fallback-state-instead-of-initialstate)
   - 6.3 [Use Dispatch Updaters for State That Depends on Current Value](#63-use-dispatch-updaters-for-state-that-depends-on-current-value)
7. [State Architecture](#7-state-architecture) — **MEDIUM**
   - 7.1 [State Must Represent Ground Truth](#71-state-must-represent-ground-truth)
8. [React Compiler](#8-react-compiler) — **MEDIUM**
   - 8.1 [Destructure Functions Early in Render](#81-destructure-functions-early-in-render)
   - 8.2 [Use .get() and .set() for Reanimated Shared Values](#82-use-get-and-set-for-reanimated-shared-values)
9. [User Interface](#9-user-interface) — **MEDIUM**
   - 9.1 [Use expo-image for Optimized Images](#91-use-expo-image-for-optimized-images)
   - 9.2 [Styling with NativeWind and Modern Patterns](#92-styling-with-nativewind-and-modern-patterns)
   - 9.3 [Use Pressable Instead of Touchable Components](#93-use-pressable-instead-of-touchable-components)
   - 9.4 [Use contentInsetAdjustmentBehavior for Safe Areas](#94-use-contentinsetadjustmentbehavior-for-safe-areas)
   - 9.5 [Use contentInset for Dynamic ScrollView Spacing](#95-use-contentinset-for-dynamic-scrollview-spacing)
   - 9.6 [Use Native Menus for Dropdowns and Context Menus](#96-use-native-menus-for-dropdowns-and-context-menus)
   - 9.7 [Use Native Modals Over JS-Based Bottom Sheets](#97-use-native-modals-over-js-based-bottom-sheets)
   - 9.8 [Measuring View Dimensions](#98-measuring-view-dimensions)
10. [JavaScript](#10-javascript) — **LOW**
    - 10.1 [Hoist Intl Formatter Creation](#101-hoist-intl-formatter-creation)
11. [Fonts](#11-fonts) — **LOW**
    - 11.1 [Load Fonts Natively at Build Time](#111-load-fonts-natively-at-build-time)

---

## 1. Core Rendering

**Impact: CRITICAL**

Fundamental React Native rendering rules. Violations cause runtime crashes or broken UI.

### 1.1 Never Use && with Potentially Falsy Values

**Impact: CRITICAL (prevents production crash)**

Never use `{value && <Component />}` when `value` could be an empty string or `0`. These are falsy but JSX-renderable—React Native will try to render them as text outside a `<Text>` component, causing a hard crash in production.

**Incorrect (crashes if count is 0 or name is ""):**

```tsx
function Profile({ name, count }: { name: string; count: number }) {
  return (
    <View>
      {name && <Text>{name}</Text>}
      {count && <Text>{count} items</Text>}
    </View>
  )
}
// If name="" or count=0, renders the falsy value → crash
```

**Correct (ternary with null):**

```tsx
function Profile({ name, count }: { name: string; count: number }) {
  return (
    <View>
      {name ? <Text>{name}</Text> : null}
      {count ? <Text>{count} items</Text> : null}
    </View>
  )
}
```

**Correct (explicit boolean coercion):**

```tsx
function Profile({ name, count }: { name: string; count: number }) {
  return (
    <View>
      {!!name && <Text>{name}</Text>}
      {!!count && <Text>{count} items</Text>}
    </View>
  )
}
```

**Best (early return):**

```tsx
function Profile({ name, count }: { name: string; count: number }) {
  if (!name) return null

  return (
    <View>
      <Text>{name}</Text>
      {count > 0 ? <Text>{count} items</Text> : null}
    </View>
  )
}
```

**Lint rule:** Enable `react/jsx-no-leaked-render` from [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-leaked-render.md).

### 1.2 Wrap Strings in Text Components

**Impact: CRITICAL (prevents runtime crash)**

Strings must be rendered inside `<Text>`. React Native crashes if a string is a direct child of `<View>`.

**Incorrect (crashes):**

```tsx
import { View } from 'react-native'

function Greeting({ name }: { name: string }) {
  return <View>Hello, {name}!</View>
}
// Error: Text strings must be rendered within a <Text> component.
```

**Correct:**

```tsx
import { View, Text } from 'react-native'

function Greeting({ name }: { name: string }) {
  return (
    <View>
      <Text>Hello, {name}!</Text>
    </View>
  )
}
```

---

## 2. List Performance

**Impact: HIGH**

Optimizing virtualized lists (FlatList, FlashList) for smooth scrolling and fast updates.

### 2.1 Use a List Virtualizer for Any List

**Impact: HIGH (reduced memory, faster mounts)**

Use a list virtualizer like FlashList instead of ScrollView with mapped children—even for short lists. Virtualizers only render visible items, reducing memory usage and mount time.

**Incorrect (ScrollView renders all items at once):**

```tsx
function Feed({ items }: { items: Item[] }) {
  return (
    <ScrollView>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </ScrollView>
  )
}
// 50 items = 50 components mounted, even if only 10 visible
```

**Correct (virtualizer renders only visible items):**

```tsx
import { FlashList } from '@shopify/flash-list'

function Feed({ items }: { items: Item[] }) {
  return (
    <FlashList
      data={items}
      renderItem={({ item }) => <ItemCard item={item} />}
      keyExtractor={(item) => item.id}
      estimatedItemSize={80}
    />
  )
}
// Only ~10-15 visible items mounted at a time
```

### 2.2 Optimize List Performance with Stable Object References

**Impact: CRITICAL (virtualization relies on reference stability)**

Don't map or filter data before passing to virtualized lists. Virtualization relies on object reference stability to know what changed—new references cause full re-renders of all visible items.

**Incorrect (creates new object references on every keystroke):**

```tsx
function DomainSearch() {
  const { keyword, setKeyword } = useKeywordState()
  const { data: tlds } = useTlds()

  // Bad: creates new objects on every render
  const domains = tlds.map((tld) => ({
    domain: `${keyword}.${tld.name}`,
    tld: tld.name,
  }))

  return (
    <>
      <TextInput value={keyword} onChangeText={setKeyword} />
      <FlashList data={domains} renderItem={({ item }) => <DomainItem item={item} />} />
    </>
  )
}
```

**Correct (stable references, transform inside items):**

```tsx
function DomainSearch() {
  const { data: tlds } = useTlds()

  return (
    <FlashList
      data={tlds}
      renderItem={({ item }) => <DomainItem tld={item} />}
    />
  )
}

function DomainItem({ tld }: { tld: Tld }) {
  // Transform within items using Zustand selector
  const keyword = useSearchStore((s) => s.keyword)
  const domain = `${keyword}.${tld.name}`
  return <Text>{domain}</Text>
}
```

### 2.3 Avoid Inline Objects in renderItem

**Impact: HIGH (prevents unnecessary re-renders of memoized list items)**

Don't create new objects inside `renderItem` to pass as props. Inline objects create new references on every render, breaking memoization.

**Incorrect (inline object breaks memoization):**

```tsx
renderItem={({ item }) => (
  <UserRow
    user={{ id: item.id, name: item.name }}  // Bad: new object every render
    style={{ backgroundColor: item.isActive ? 'green' : 'gray' }}  // Bad
  />
)}
```

**Correct (pass item directly or primitives):**

```tsx
renderItem={({ item }) => (
  <UserRow
    id={item.id}
    name={item.name}
    isActive={item.isActive}
  />
)}

const UserRow = memo(function UserRow({ id, name, isActive }: Props) {
  const backgroundColor = isActive ? 'green' : 'gray'
  return <View style={[styles.row, { backgroundColor }]}>{/* ... */}</View>
})
```

### 2.4 Hoist Callbacks to the Root of Lists

**Impact: MEDIUM (fewer re-renders and faster lists)**

When passing callback functions to list items, create a single instance of the callback at the root of the list.

**Incorrect (creates a new callback on each render):**

```tsx
renderItem={({ item }) => {
  const onPress = () => handlePress(item.id)  // Bad: new callback each render
  return <Item item={item} onPress={onPress} />
}}
```

**Correct (single function instance):**

```tsx
const onPress = useCallback((id: string) => handlePress(id), [handlePress])

renderItem={({ item }) => (
  <Item item={item} onPress={onPress} />
)}
```

### 2.5 Pass Primitives to List Items for Memoization

**Impact: HIGH (enables effective memo() comparison)**

Pass only primitive values (strings, numbers, booleans) as props to list item components. Primitives enable shallow comparison in `memo()` to work correctly.

**Incorrect (object prop requires deep comparison):**

```tsx
const UserRow = memo(function UserRow({ user }: { user: User }) {
  return <Text>{user.name}</Text>
})

renderItem={({ item }) => <UserRow user={item} />}
```

**Correct (primitive props):**

```tsx
const UserRow = memo(function UserRow({ id, name, email }: Props) {
  return <Text>{name}</Text>
})

renderItem={({ item }) => (
  <UserRow id={item.id} name={item.name} email={item.email} />
)}
```

### 2.6 Keep List Items Lightweight

**Impact: HIGH (reduces render time for visible items during scroll)**

List items should be as inexpensive as possible to render. Minimize hooks, avoid queries, and limit React Context access.

**Incorrect (heavy list item):**

```tsx
function ProductRow({ id }: { id: string }) {
  const { data: product } = useQuery(['product', id], () => fetchProduct(id))
  const theme = useContext(ThemeContext)
  const cart = useContext(CartContext)
  return <View>{/* ... */}</View>
}
```

**Correct (lightweight list item):**

```tsx
function ProductRow({ name, price, imageUrl }: Props) {
  return (
    <View>
      <Image source={{ uri: imageUrl }} />
      <Text>{name}</Text>
      <Text>{price}</Text>
    </View>
  )
}
```

**Guidelines:**
- No queries or data fetching inside items
- Prefer Zustand selectors over React Context
- Minimize useState/useEffect hooks
- Pass pre-computed values as props

### 2.7 Use Compressed Images in Lists

**Impact: HIGH (faster load times, less memory)**

Always load compressed, appropriately-sized images in lists. Request images at 2x the display size for retina screens.

**Incorrect:**

```tsx
<Image source={{ uri: product.imageUrl }} style={{ width: 100, height: 100 }} />
// 4000x3000 image loaded for a 100x100 thumbnail
```

**Correct:**

```tsx
const thumbnailUrl = `${product.imageUrl}?w=200&h=200&fit=cover`
<Image source={{ uri: thumbnailUrl }} style={{ width: 100, height: 100 }} />
```

### 2.8 Use Item Types for Heterogeneous Lists

**Impact: HIGH (efficient recycling, less layout thrashing)**

When a list has different item layouts, use a `type` field and provide `getItemType` to the list.

**Correct (typed items with separate components):**

```tsx
type FeedItem = HeaderItem | MessageItem | ImageItem

function Feed({ items }: { items: FeedItem[] }) {
  return (
    <FlashList
      data={items}
      keyExtractor={(item) => item.id}
      getItemType={(item) => item.type}
      renderItem={({ item }) => {
        switch (item.type) {
          case 'header': return <SectionHeader title={item.title} />
          case 'message': return <MessageRow text={item.text} />
          case 'image': return <ImageRow url={item.url} />
        }
      }}
    />
  )
}
```

---

## 3. Animation

**Impact: HIGH**

GPU-accelerated animations, Reanimated patterns, and avoiding render thrashing during gestures.

### 3.1 Animate Transform and Opacity Instead of Layout Properties

**Impact: HIGH (GPU-accelerated animations, no layout recalculation)**

Avoid animating `width`, `height`, `top`, `left`, `margin`, or `padding`. Use `transform` and `opacity` which run on the GPU.

**Incorrect (animates height, triggers layout every frame):**

```tsx
const animatedStyle = useAnimatedStyle(() => ({
  height: withTiming(expanded ? 200 : 0),
}))
```

**Correct (animates scaleY, GPU-accelerated):**

```tsx
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scaleY: withTiming(expanded ? 1 : 0) }],
  opacity: withTiming(expanded ? 1 : 0),
}))
```

### 3.2 Prefer useDerivedValue Over useAnimatedReaction

**Impact: MEDIUM (cleaner code, automatic dependency tracking)**

When deriving a shared value from another, use `useDerivedValue` instead of `useAnimatedReaction`.

**Incorrect:**

```tsx
const progress = useSharedValue(0)
const opacity = useSharedValue(1)

useAnimatedReaction(
  () => progress.value,
  (current) => { opacity.value = 1 - current }
)
```

**Correct:**

```tsx
const progress = useSharedValue(0)
const opacity = useDerivedValue(() => 1 - progress.get())
```

### 3.3 Use GestureDetector for Animated Press States

**Impact: MEDIUM (UI thread animations, smoother press feedback)**

For animated press states, use `GestureDetector` with `Gesture.Tap()` and shared values instead of Pressable's callbacks.

**Correct (GestureDetector with UI thread worklets):**

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, runOnJS } from 'react-native-reanimated'

function AnimatedButton({ onPress }: { onPress: () => void }) {
  const pressed = useSharedValue(0)

  const tap = Gesture.Tap()
    .onBegin(() => { pressed.set(withTiming(1)) })
    .onFinalize(() => { pressed.set(withTiming(0)) })
    .onEnd(() => { runOnJS(onPress)() })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.95]) }],
  }))

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={animatedStyle}>
        <Text>Press me</Text>
      </Animated.View>
    </GestureDetector>
  )
}
```

---

## 4. Scroll Performance

**Impact: HIGH**

Tracking scroll position without causing render thrashing.

### 4.1 Never Track Scroll Position in useState

**Impact: HIGH (prevents render thrashing during scroll)**

Never store scroll position in `useState`. Use a Reanimated shared value for animations or a ref for non-reactive tracking.

**Incorrect:**

```tsx
const [scrollY, setScrollY] = useState(0)

const onScroll = (e) => {
  setScrollY(e.nativeEvent.contentOffset.y) // re-renders on every frame
}
```

**Correct (Reanimated for animations):**

```tsx
const scrollY = useSharedValue(0)

const onScroll = useAnimatedScrollHandler({
  onScroll: (e) => {
    scrollY.value = e.contentOffset.y // runs on UI thread, no re-render
  },
})

return <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} />
```

---

## 5. Navigation

**Impact: HIGH**

Using Expo Router and native navigators for file-based routing on iOS and Android.

### 5.1 Use Expo Router for File-Based Navigation

**Impact: HIGH (native performance, platform-appropriate UI)**

Use Expo Router for file-based navigation. It uses native navigators under the hood.

**Stack Navigation:**

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

**Tab Navigation:**

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <HomeIcon color={color} /> }} />
      <Tabs.Screen name="send" options={{ title: 'Send', tabBarIcon: ({ color }) => <SendIcon color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <SettingsIcon color={color} /> }} />
    </Tabs>
  )
}
```

**Programmatic Navigation:**

```tsx
import { router } from 'expo-router'

router.push('/transaction-details')
router.push({ pathname: '/transaction-details', params: { txid: '...' } })
router.back()
router.replace('/home')
```

---

## 6. React State

**Impact: MEDIUM**

Patterns for managing React state to avoid stale closures and unnecessary re-renders.

### 6.1 Minimize State Variables and Derive Values

**Impact: MEDIUM (fewer re-renders, less state drift)**

If a value can be computed from existing state or props, derive it during render instead of storing it in state.

**Incorrect:**

```tsx
const [total, setTotal] = useState(0)
const [itemCount, setItemCount] = useState(0)

useEffect(() => {
  setTotal(items.reduce((sum, item) => sum + item.price, 0))
  setItemCount(items.length)
}, [items])
```

**Correct:**

```tsx
const total = items.reduce((sum, item) => sum + item.price, 0)
const itemCount = items.length
```

### 6.2 Use Fallback State Instead of initialState

**Impact: MEDIUM (reactive fallbacks without syncing)**

Use `undefined` as initial state and nullish coalescing to fall back to parent or server values.

**Correct:**

```tsx
function Toggle({ fallbackEnabled }: Props) {
  const [_enabled, setEnabled] = useState<boolean | undefined>(undefined)
  const enabled = _enabled ?? fallbackEnabled

  return <Switch value={enabled} onValueChange={setEnabled} />
}
```

### 6.3 Use Dispatch Updaters for State That Depends on Current Value

**Impact: MEDIUM (avoids stale closures)**

When the next state depends on the current state, use a dispatch updater.

**Incorrect:**

```tsx
const onTap = () => {
  setCount(count + 1) // count may be stale
}
```

**Correct:**

```tsx
const onTap = () => {
  setCount((prev) => prev + 1)
}
```

---

## 7. State Architecture

**Impact: MEDIUM**

Ground truth principles for state variables and derived values.

### 7.1 State Must Represent Ground Truth

**Impact: HIGH (cleaner logic, easier debugging, single source of truth)**

State variables should represent the actual state (e.g., `pressed`, `isOpen`), not derived visual values (e.g., `scale`, `opacity`).

**Incorrect:**

```tsx
const scale = useSharedValue(1)

const tap = Gesture.Tap()
  .onBegin(() => { scale.set(withTiming(0.95)) })
  .onFinalize(() => { scale.set(withTiming(1)) })
```

**Correct:**

```tsx
const pressed = useSharedValue(0) // 0 = not pressed, 1 = pressed

const tap = Gesture.Tap()
  .onBegin(() => { pressed.set(withTiming(1)) })
  .onFinalize(() => { pressed.set(withTiming(0)) })

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.95]) }],
}))
```

---

## 8. React Compiler

**Impact: MEDIUM**

Compatibility patterns for React Compiler with React Native and Reanimated.

### 8.1 Destructure Functions Early in Render

**Impact: HIGH (stable references, fewer re-renders)**

Destructure functions from hooks at the top of render scope.

**Incorrect:**

```tsx
function SaveButton(props) {
  const router = useRouter()

  const handlePress = () => {
    props.onSave()
    router.push('/success') // unstable reference
  }
}
```

**Correct:**

```tsx
function SaveButton({ onSave }) {
  const { push } = useRouter()

  const handlePress = () => {
    onSave()
    push('/success') // stable reference
  }
}
```

### 8.2 Use .get() and .set() for Reanimated Shared Values

**Impact: LOW (required for React Compiler compatibility)**

With React Compiler enabled, use `.get()` and `.set()` instead of `.value`.

**Incorrect:**

```tsx
count.value = count.value + 1
```

**Correct:**

```tsx
count.set(count.get() + 1)
```

---

## 9. User Interface

**Impact: MEDIUM**

Native UI patterns for images, menus, modals, styling with NativeWind, and platform-consistent interfaces.

### 9.1 Use expo-image for Optimized Images

**Impact: HIGH (memory efficiency, caching, blurhash placeholders)**

Use `expo-image` instead of React Native's `Image`.

**Correct:**

```tsx
import { Image } from 'expo-image'

<Image
  source={{ uri: url }}
  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
  contentFit="cover"
  transition={200}
  style={styles.image}
/>
```

### 9.2 Styling with NativeWind and Modern Patterns

**Impact: MEDIUM (consistent design, cleaner layouts)**

This project uses NativeWind (Tailwind CSS for React Native).

**Basic usage:**

```tsx
<View className="bg-white rounded-xl p-4 shadow-md">
  <Text className="text-lg font-semibold text-gray-900">{title}</Text>
</View>
```

**Use gap for spacing:**

```tsx
<View className="gap-2">
  <Text>Title</Text>
  <Text>Subtitle</Text>
</View>
```

**Platform-specific styles:**

```tsx
<View className="ios:pt-12 android:pt-4">
```

**Dark mode:**

```tsx
<View className="bg-white dark:bg-gray-900">
  <Text className="text-gray-900 dark:text-white">Content</Text>
</View>
```

### 9.3 Use Pressable Instead of Touchable Components

**Impact: LOW (modern API, more flexible)**

Never use `TouchableOpacity` or `TouchableHighlight`. Use `Pressable` instead.

**Correct:**

```tsx
import { Pressable } from 'react-native'

<Pressable onPress={onPress}>
  <Text>Press me</Text>
</Pressable>
```

### 9.4 Use contentInsetAdjustmentBehavior for Safe Areas

**Impact: MEDIUM (native safe area handling)**

Use `contentInsetAdjustmentBehavior="automatic"` on ScrollView instead of SafeAreaView.

**Correct:**

```tsx
<ScrollView contentInsetAdjustmentBehavior='automatic'>
  <View>
    <Text>Content</Text>
  </View>
</ScrollView>
```

### 9.5 Use contentInset for Dynamic ScrollView Spacing

**Impact: LOW (smoother updates, no layout recalculation)**

Use `contentInset` instead of padding for dynamic spacing.

**Correct:**

```tsx
<ScrollView
  contentInset={{ bottom: bottomOffset }}
  scrollIndicatorInsets={{ bottom: bottomOffset }}
>
  {children}
</ScrollView>
```

### 9.6 Use Native Menus for Dropdowns and Context Menus

**Impact: HIGH (native accessibility, platform-consistent UX)**

Use native platform menus instead of custom JS implementations.

**Correct (with zeego):**

```tsx
import * as DropdownMenu from 'zeego/dropdown-menu'

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Pressable><Text>Open Menu</Text></Pressable>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item key='edit' onSelect={() => console.log('edit')}>
      <DropdownMenu.ItemTitle>Edit</DropdownMenu.ItemTitle>
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
```

### 9.7 Use Native Modals Over JS-Based Bottom Sheets

**Impact: HIGH (native performance, gestures, accessibility)**

Use native `<Modal>` with `presentationStyle="formSheet"` instead of JS-based bottom sheets.

**Correct:**

```tsx
<Modal
  visible={visible}
  presentationStyle='formSheet'
  animationType='slide'
  onRequestClose={() => setVisible(false)}
>
  <View><Text>Sheet content</Text></View>
</Modal>
```

### 9.8 Measuring View Dimensions

**Impact: MEDIUM (synchronous measurement)**

Use both `useLayoutEffect` and `onLayout` for measuring views.

**Correct:**

```tsx
const ref = useRef<View>(null)
const [size, setSize] = useState<Size | undefined>(undefined)

useLayoutEffect(() => {
  const rect = ref.current?.getBoundingClientRect()
  if (rect) setSize({ width: rect.width, height: rect.height })
}, [])

const onLayout = (e: LayoutChangeEvent) => {
  const { width, height } = e.nativeEvent.layout
  setSize((prev) => {
    if (prev?.width === width && prev?.height === height) return prev
    return { width, height }
  })
}

return <View ref={ref} onLayout={onLayout}>{children}</View>
```

---

## 10. JavaScript

**Impact: LOW**

Micro-optimizations like hoisting expensive object creation.

### 10.1 Hoist Intl Formatter Creation

**Impact: LOW-MEDIUM (avoids expensive object recreation)**

Don't create `Intl.DateTimeFormat` or `Intl.NumberFormat` inside render. Hoist to module scope.

**Incorrect:**

```tsx
function Price({ amount }: { amount: number }) {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
  return <Text>{formatter.format(amount)}</Text>
}
```

**Correct:**

```tsx
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function Price({ amount }: { amount: number }) {
  return <Text>{currencyFormatter.format(amount)}</Text>
}
```

---

## 11. Fonts

**Impact: LOW**

Native font loading for improved performance.

### 11.1 Load Fonts Natively at Build Time

**Impact: LOW (fonts available at launch, no async loading)**

Use the `expo-font` config plugin to embed fonts at build time.

**Correct (app.json):**

```json
{
  "expo": {
    "plugins": [
      ["expo-font", { "fonts": ["./assets/fonts/Geist-Bold.otf"] }]
    ]
  }
}
```

```tsx
// No loading state needed—font is already available
<Text style={{ fontFamily: 'Geist-Bold' }}>Hello</Text>
```

After adding fonts, run `npx expo prebuild` and rebuild the native app.

---

## References

1. [React Documentation](https://react.dev)
2. [React Native Documentation](https://reactnative.dev)
3. [Expo Documentation](https://docs.expo.dev)
4. [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated)
5. [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler)
6. [NativeWind Documentation](https://www.nativewind.dev)
