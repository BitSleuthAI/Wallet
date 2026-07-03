# Visual + Performance Revamp Notes

Reference notes for the audit-driven revamp shipped on branch
`claude/bitsleuth-wallet-audit-2xio0a`. Read this before touching theming,
the wallet data pipeline, or the send flow.

## Theme architecture

- `hooks/theme-store.tsx` is the single source of truth for theme. It exposes
  `ThemeProvider` and `useTheme()` returning `{ theme, isDark, themeMode, toggleTheme, setThemeMode }`.
- Mode is `'light' | 'dark' | 'system'` (default **system**, resolved via
  `useColorScheme()`), persisted under the pre-existing `'theme'` AsyncStorage
  key. Legacy `'light'`/`'dark'` values are still honored, so users who chose a
  theme before this change keep it.
- `hooks/wallet-store.ts` consumes `useTheme()` internally and **re-exports**
  `theme` and `toggleTheme` through `useWallet()` so older call sites keep
  working. New code (and anything that only needs theme) should use
  `useTheme()` directly — it does not re-render on wallet data polls, while
  the wallet store context updates every poll cycle.
- The tab bar (`app/(tabs)/_layout.tsx`) keys `NativeTabs` on `isDark`; it
  remounts only when the resolved appearance flips.

## Color rules

- No raw hex where a theme token exists (`theme.colors.*`). The legacy
  cyan/coral palette (`#26F5FE`, `#FF8A65`, coral gradients, `#0A0A0F`,
  `#1F1F33`) was removed everywhere; a grep for those values should stay
  clean.
- Exceptions that are intentionally hardcoded (both mirror
  `constants/themes.ts` values and must be kept in sync):
  - The `ErrorBoundary` in `app/_layout.tsx` (renders outside providers).
  - `components/ScreenLoading.tsx` (renders before the wallet context exists).
- Default wallet color is Bitcoin orange (`#F7931A`, palette id `'bitcoin'`
  in `constants/wallet-colors.ts`).

## Store architecture (hooks/wallet-store.tsx + hooks/wallet-contexts.tsx)

The store body (`useWalletStoreState()` in `wallet-store.tsx`) owns every
query, mutation, and piece of wallet state, and runs exactly once inside
`WalletProvider`. Its memoized slices are published through separate
churn-domain contexts in `hooks/wallet-contexts.tsx`:

- **Narrow hooks are the preferred API**: `useWallets`, `useWalletBalance`,
  `useWalletTransactions`, `useWalletAddresses`, `useWalletUtxos`,
  `useWalletSettings`, `useWalletActions`, `useCoinControl`, `useFeedback`,
  `useWalletMeta`. Subscribe to only what the component renders — a
  component using `useWallets` + `useWalletActions` does not re-render on
  the 30s data polls. These hooks throw outside `WalletProvider`.
- **`useWallet()` is a compatibility hook**: the legacy combined shape,
  subscribed to every slice (re-renders on any wallet-data change). It
  returns `undefined` (cast) outside the provider — the older wrapper
  screens gate on that. New code should not use it; ~25 low-heat call
  sites still do.
- Wrapper "context available?" gates should read `useContext(WalletsContext)`
  so the gate itself stays low-churn.
- Do not put whole React Query objects into a slice memo's value or deps
  (they change identity every render and would make that context churn
  constantly) — expose granular fields instead, as `balanceData` does.

## Data pipeline (services/wallet-service.ts)

`getWalletData(xpub)` is called independently by the balance, transactions,
and UTXO queries every 30s poll. The exported function:

- shares one in-flight promise per xpub (concurrent callers get the same run);
- memoizes **successful** results (and the benign "no transaction history"
  result) for 25 seconds — just under the poll interval;
- never memoizes failures, so retries hit the network immediately.

`clearWalletDataMemo()` drops both maps and is called by `refreshData`
(pull-to-refresh) and `logoutAndEraseWallet`. If you add another "force
fresh data" path, call it there too.

Per-address wire cost is 1 request (UTXOs): the txs read is a cache hit
from discovery, and there is **no per-address stats call** — the wallet
balance comes from UTXOs and address activity from the txs response. The
addresses screen (`generateAddressesForView`) keeps its `chain_stats`
calls because those are exact even for >50-tx addresses (the `/txs`
endpoint truncates at ~50 and is not paginated — known gap).

Refresh/cold-start behavior:

- Pull-to-refresh clears only the load-bearing caches for the current
  wallet (`clearWalletDataMemo`, `clearCacheForWalletXpub`,
  `clearAddressCache`) then invalidates+refetches the queries. Other
  wallets' caches and the global tx-body cache stay (confirmed tx bodies
  are immutable).
- Cold starts wipe caches **only on app-version change**; otherwise the
  per-key TTLs (metadata 2m, txids/stats 5m, utxos 2m) guarantee
  freshness within 5 minutes.

Polling: all four wallet queries use `refetchIntervalInBackground: false`
(foregrounding is covered by `refetchOnWindowFocus: true`); address
discovery polls at 60s, the rest at 30s.

## Send flow

- Review + success UI lives in `components/TransactionReviewSheet.tsx`
  (native formSheet). It is purely presentational: validation, the biometric
  gate (`isEnhancedSecurityRequired` → `authenticateForTransactionEnhanced`),
  and `handleSendTransaction` are unchanged in `app/(tabs)/send.tsx`.
- The confirm button is disabled while broadcasting (no double-submit); the
  error path still uses `Alert.alert` on top of the sheet.

## PIN storage

- `services/secure-pin-service.ts` stores the unlock PIN in Expo SecureStore
  under `unlock_pin`. Reads transparently migrate a legacy plaintext PIN from
  the AsyncStorage `'pin'` key (write to SecureStore, delete plaintext) —
  existing users notice nothing.
- Wallet erase must call `deletePin()` (AsyncStorage.clear() does not touch
  SecureStore); `logoutAndEraseWallet` already does.

## Shared UI primitives & conventions

- `components/AppButton.tsx` — the button primitive (Pressable + spring
  scale + haptics; variants primary/secondary/outline/destructive; loading/
  disabled; icon slot). Use it for real CTAs.
- `components/PressableOpacity.tsx` — drop-in Pressable replacement for
  TouchableOpacity (mirrors `activeOpacity`). Use it for rows, icon
  buttons, and other tap targets; do not import TouchableOpacity in new
  code. The only remaining TouchableOpacity references are the three
  `createAnimatedComponent(TouchableOpacity)` bases (settings logout,
  WalletCard, TransactionItem), which have custom Reanimated feedback.
- **Animations are Reanimated-only.** No component imports the legacy
  react-native `Animated` API; keep it that way.
- `components/ScreenLoading.tsx` — the pre-context loading fallback.
- Picker/edit modals use `presentationStyle="formSheet"` per
  `.github/skills/react-native-skills/rules/ui-native-modals.md`.

## Deferred (known, intentional)

- Store stage 3: ~25 low-heat screens still use the compat `useWallet()`;
  converting them to narrow hooks (and then deleting `useWallet()`) is
  mechanical follow-up.
- Esplora `/address/{addr}/txs` pagination: responses truncate at ~50
  confirmed txs and the app does not fetch continuation pages — addresses
  with deep history show partial tx lists (pre-existing behavior).
- `expo-image` is installed but unused; it was kept because it is a native
  module already linked in the committed ios/android projects — removing it
  requires a prebuild. Either adopt it for QR/logo rendering or remove it in
  a native-touching release.
