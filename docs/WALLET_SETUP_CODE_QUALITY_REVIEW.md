# Code Quality Review: wallet-setup.tsx

**Date**: 2026-02-10  
**File**: `app/wallet-setup.tsx`  
**Size**: 1,324 lines  
**Status**: Critical security issues fixed, refactoring recommended

## Executive Summary

The `wallet-setup.tsx` component is a **critically important but overly complex component** that handles wallet creation and import. While it demonstrates good security awareness, it suffers from size and complexity issues that make it difficult to maintain and test.

### Key Findings

✅ **Strengths**:
- Strong security awareness (warnings, confirmations)
- Comprehensive UX flow (education, confirmation steps)
- Cross-platform support
- Good visual design

❌ **Issues**:
- **Size** (1,324 lines) making it hard to maintain
- **Code duplication** (~30% duplicate code across modes)
- **Mixed concerns** (UI, business logic, navigation)
- **TypeScript `any` types** defeated type safety
- **Accessibility gaps** would fail WCAG compliance
- **Performance** could be improved with memoization

## Changes Implemented

### ✅ Critical Security & Type Safety Fixes (Completed)

1. **Added WalletService TypeScript Interface** (`types/wallet.ts`)
   ```typescript
   export interface WalletService {
     generateMnemonic: (strength?: number) => Promise<string>;
     validateMnemonic: (mnemonic: string) => boolean;
     createWallet: (name: string, color?: string) => Promise<Wallet>;
     importWallet: (name: string, mnemonic: string, color?: string) => Promise<Wallet>;
   }
   ```
   - **Impact**: Type safety, IDE support, catches errors at compile time
   - **Location**: Lines 34-67

2. **Added Development-Only Console Log Guards**
   - Wrapped all console.logs with `__DEV__` checks
   - Removed mnemonic length from logs (potential security leak)
   - **Impact**: Prevents sensitive data exposure in production
   - **Locations**: Lines 36, 40, 47, 108, 119, 137, 267-283

3. **Added Security Warnings for Test Mnemonics**
   - Alert users when fallback/test mnemonics are used
   - Clear warning: "DO NOT use this wallet for real funds!"
   - **Impact**: Prevents accidental loss of funds
   - **Location**: Lines 144-157

4. **Implemented Clipboard Auto-Clear**
   - Clipboard cleared automatically after 60 seconds
   - User notification about auto-clear
   - **Impact**: Reduces mnemonic exposure window
   - **Location**: Lines 196-217

5. **Extracted Fallback Mnemonics to Constants**
   ```typescript
   const FALLBACK_MNEMONIC_12 = 'abandon abandon abandon...';
   const FALLBACK_MNEMONIC_24 = 'abandon abandon abandon...';
   ```
   - **Impact**: Clarity, reusability, maintainability
   - **Location**: Lines 35-36

## Recommended Future Improvements

### 🔴 High Priority

#### 1. Component Refactoring (Est. 4-6 hours)

**Problem**: Single 1,324-line component violates Single Responsibility Principle

**Recommended Structure**:
```
app/wallet-setup/
├── index.tsx                          # Route entry (30 lines)
├── screens/
│   ├── WalletSelectScreen.tsx         # Selection mode (150 lines)
│   ├── WalletCreateScreen.tsx         # Creation mode (200 lines)
│   ├── WalletImportScreen.tsx         # Import mode (150 lines)
│   └── WalletConfirmScreen.tsx        # Confirmation (150 lines)
├── components/
│   ├── WalletNameInput.tsx            # Name input (50 lines)
│   ├── ColorPicker.tsx                # Color selection (80 lines)
│   ├── MnemonicDisplay.tsx            # Mnemonic grid (100 lines)
│   ├── RecoveryPhraseInput.tsx        # Import input (80 lines)
│   ├── BackButton.tsx                 # Accessible back (40 lines)
│   ├── HelpLink.tsx                   # Help link (40 lines)
│   ├── SecurityCheckbox.tsx           # Accessible checkbox (60 lines)
│   └── WalletTypeEducationCard.tsx    # Education card (100 lines)
├── hooks/
│   ├── useWalletService.ts            # Service init (80 lines)
│   ├── useMnemonicGenerator.ts        # Mnemonic gen (100 lines)
│   ├── useWalletCreation.ts           # Creation logic (120 lines)
│   ├── useWalletImport.ts             # Import logic (100 lines)
│   └── useWalletNavigation.ts         # Navigation (60 lines)
├── utils/
│   ├── validation.ts                  # Validation (80 lines)
│   ├── error-handling.ts              # Error categorization (60 lines)
│   └── clipboard.ts                   # Secure clipboard (40 lines)
└── types.ts                           # TypeScript types (50 lines)

Total: ~1,700 lines across 23 files (avg 74 lines/file)
```

**Benefits**:
- Each file becomes testable in isolation
- Easier to debug and maintain
- Better code reuse
- Clearer separation of concerns

#### 2. Accessibility Compliance (Est. 2-3 hours)

**Missing Items**:
- Accessibility labels on TouchableOpacity buttons (Lines 308-316, 429-435, etc.)
- Accessibility labels on TextInputs
- Mnemonic word display accessibility
- Touch target sizes < 44x44pt (Line 1249-1257)
- Missing focus management
- No screen reader announcements

**Example Fix**:
```typescript
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Create new wallet"
  accessibilityHint="Generates a new Bitcoin wallet with recovery phrase"
  style={styles.button}
  onPress={handleCreate}
>
  <Text>Create Wallet</Text>
</TouchableOpacity>
```

#### 3. Error Handling Improvements (Est. 1-2 hours)

**Current Issues**:
- Generic error messages (Line 291-294)
- No indication of which confirmation word is wrong (Line 799-808)
- Silent failures on clipboard (Line 172)

**Recommended Approach**:
```typescript
function categorizeWalletError(error?: string): string {
  if (!error) return 'Unknown error. Please try again.';
  
  if (error.includes('mnemonic') || error.includes('phrase')) {
    return 'Invalid recovery phrase. Check all words are correct.';
  }
  
  if (error.includes('network') || error.includes('connection')) {
    return 'Network error. Check your internet connection.';
  }
  
  if (error.includes('already exists')) {
    return 'Wallet name already exists. Choose a different name.';
  }
  
  return error;
}
```

### 🟡 Medium Priority

#### 4. Performance Optimization (Est. 1-2 hours)

**Issues**:
- Unnecessary re-renders from `generateNewMnemonic` in useEffect deps (Line 160-164)
- No memoization of render functions (Lines 299-925)
- Inline styles prevent optimization (Lines 929, 540-541)

**Fixes**:
```typescript
// Extract to custom hook
function useMnemonicGenerator(mode: string, wordCount: 12 | 24) {
  const [mnemonic, setMnemonic] = useState('');
  
  useEffect(() => {
    if (mode !== 'create') return;
    generateMnemonic(wordCount).then(setMnemonic);
  }, [mode, wordCount]);
  
  return mnemonic;
}

// Memoize render functions
const renderSelectMode = useMemo(() => (
  <SelectMode onCreatePress={...} onImportPress={...} />
), [theme, dependencies]);
```

#### 5. Theme Consistency (Est. 1 hour)

**Issues**:
- Hardcoded opacity values (Lines 330, 568, 867)
- Hardcoded colors (Lines 1314-1320)

**Fix**:
```typescript
// In theme:
opacity: {
  subtle: '10',
  light: '20',
  medium: '40',
  strong: '60',
}

// Usage:
backgroundColor: `${theme.colors.primary}${theme.opacity.light}`
```

#### 6. Platform-Specific Improvements (Est. 1 hour)

**Android Safe Area** (Line 930-933):
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();
<View style={{ paddingTop: insets.top }}>
```

**Keyboard Handling** (Line 644-648):
```typescript
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

<KeyboardAwareScrollView
  enableOnAndroid={true}
  enableAutomaticScroll={true}
  extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
/>
```

**QR Scanner on Web** (Line 727-733):
```typescript
{Platform.OS !== 'web' && (
  <TouchableOpacity onPress={() => setShowQRScanner(true)}>
    <QrCode />
    <Text>Scan QR</Text>
  </TouchableOpacity>
)}
```

### 🟢 Low Priority (Nice to Have)

- Add unit tests for validation functions
- Add integration tests for wallet creation flow
- Add loading skeleton screens
- Implement haptic feedback on button presses
- Add dark mode optimizations
- Add internationalization (i18n) support

## Testing Checklist

Before refactoring, ensure these scenarios work:

- [ ] Create new 12-word wallet
- [ ] Create new 24-word wallet
- [ ] Import existing wallet with valid mnemonic
- [ ] Import fails with invalid mnemonic
- [ ] Word confirmation shows correct random words
- [ ] Word confirmation fails with incorrect input
- [ ] Wallet name validation works
- [ ] Color picker selection persists
- [ ] Navigation to PIN setup works
- [ ] Navigation to biometric setup works
- [ ] QR scanner works on mobile (not web)
- [ ] Clipboard copy works
- [ ] Clipboard auto-clears after 60 seconds
- [ ] Test mnemonic warning appears
- [ ] All links open correctly
- [ ] Terms acceptance required
- [ ] Phrase storage checkbox required

## Migration Strategy

To safely refactor this component:

1. **Add Tests First** (if not present)
   - Create integration tests for current behavior
   - Ensure all flows are covered

2. **Extract Components Incrementally**
   - Start with simple components (ColorPicker, BackButton)
   - Move to complex ones (MnemonicDisplay)
   - Finally extract screens

3. **Extract Hooks**
   - Move business logic to custom hooks
   - Keep UI components pure

4. **Test After Each Extraction**
   - Run full test suite
   - Manual testing on iOS and Android

5. **Review and Cleanup**
   - Remove duplicate code
   - Consolidate styles
   - Update documentation

## Code Quality Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| File Size | 1,324 lines | < 300 lines/file | ❌ |
| Cyclomatic Complexity | High | Low | ❌ |
| Code Duplication | ~30% | < 5% | ❌ |
| TypeScript Coverage | 95% (after fixes) | 100% | 🟡 |
| Accessibility Score | Low | WCAG AA | ❌ |
| Test Coverage | Unknown | > 80% | ❌ |
| Performance Score | Medium | High | 🟡 |

## References

- **Full Review**: UI agent comprehensive analysis (36.1 KB)
- **BIP Standards**: BIP32, BIP39, BIP44, BIP84
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **React Native Performance**: https://reactnative.dev/docs/performance
- **Expo Best Practices**: https://docs.expo.dev/guides/

## Conclusion

The critical security issues have been addressed, making the component safer for production use. However, the component still requires significant refactoring to improve maintainability, testability, and accessibility.

**Recommended Next Steps**:
1. Plan refactoring sprint (4-6 hours)
2. Add accessibility labels (2-3 hours)
3. Improve error handling (1-2 hours)
4. Create unit tests for extracted components

**Estimated Total Refactoring Time**: 12-16 hours  
**Risk Level**: Medium (touching security-critical code)  
**Recommended Approach**: Incremental refactoring with thorough testing

---

*This review was conducted using the UI agent specialized in React Native code quality analysis.*
