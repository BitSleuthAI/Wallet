# Feedback Loop Examples

This document demonstrates the feedback loop system with realistic examples across different skills and scenarios.

## Example 1: Frontend Design Skill - Success

### Scenario
Agent uses frontend-design skill to create a wallet card component with smooth animations and proper touch feedback.

### Feedback Entry (in `frontend-design/SKILL_MEMORY.md`)

```markdown
### 2026-01-11 14:30 - SUCCESS

**Skill Used**: frontend-design

**Task Context**: 
Created WalletCard component for displaying wallet balance, name, and color theme. 
Needed to support press interactions for navigation to wallet details.

**Outcome**:
Component implemented successfully with excellent user feedback. Animation feels 
natural, touch targets are appropriate, and visual hierarchy is clear. Component 
is now being reused across multiple screens.

**What Worked Well**:
- Spring animation guidance (damping: 15, stiffness: 400) produced perfect feel
- 56pt minimum height recommendation ensured comfortable touch targets
- Platform.select() pattern for iOS/Android shadows worked flawlessly
- Haptic feedback on press adds premium feel (SKILL.md example was directly applicable)
- Border radius recommendation (16-24pt) looks modern and polished

**What Didn't Work**:
- SKILL.md didn't mention handling of very long wallet names (truncation needed)
- No guidance on how to handle wallet colors with poor contrast against text
- Missing pattern for "press and hold" interactions (could be useful for quick actions)

**Key Learnings**:
- Text.ellipsizeMode and numberOfLines are essential for mobile cards with user-generated content
- Need color contrast validation when users choose custom wallet colors
- Combining spring animations with haptic feedback creates highly satisfying interactions
- react-native-reanimated's useSharedValue + withSpring is more performant than Animated API

**Recommended Updates**:
1. Add section to SKILL.md: "Handling User-Generated Content in Cards"
   - Text truncation patterns
   - Overflow handling techniques
   - Testing with edge cases (very long names, emojis, special characters)
2. Add pattern: "Color Contrast Validation"
   - How to ensure text remains readable on custom backgrounds
   - Automatic text color adjustment (white/black) based on background luminance
   - WCAG AA compliance checking
3. Add to "Modern 2025 Techniques": "Press and Hold Patterns"
   - Long press gestures for contextual actions
   - Example with react-native-gesture-handler

**Impact Level**: MEDIUM
```

### How This Evolves the Skill

After 2-3 more entries highlighting text truncation and color contrast issues, these patterns would be added to frontend-design/SKILL.md as validated best practices.

---

## Example 2: Developer Guide Skill - Partial Success

### Scenario
Agent uses developer-guide skill to implement a Bitcoin transaction fee estimation feature but encounters issues.

### Feedback Entry (in `developer-guide/SKILL_MEMORY.md`)

```markdown
### 2026-01-11 16:45 - PARTIAL

**Skill Used**: developer-guide

**Task Context**: 
Implemented dynamic fee estimation for Bitcoin transactions using Esplora API.
Needed to provide users with Low/Medium/High fee options.

**Outcome**:
Fee estimation works but required significant troubleshooting not covered by SKILL.md.
Initial implementation had rate limiting issues and didn't handle network failures gracefully.
Final solution works reliably but took longer than expected.

**What Worked Well**:
- SKILL.md's Esplora API documentation was accurate
- Transaction Handling section correctly emphasized RBF support
- Bitcoin-specific guidelines on fee calculation were helpful
- Example code for building transactions was directly applicable

**What Didn't Work**:
- SKILL.md mentioned "implement exponential backoff" but provided no example
- No guidance on caching fee estimates to reduce API calls
- Missing information about Esplora rate limits (important for production)
- No pattern for handling stale fee data (network offline, then online)
- Unclear which fee estimate endpoint to use (blocks vs. mempool)

**Key Learnings**:
- Esplora API has undocumented rate limits (~300 requests per minute per IP)
- Fee estimates should be cached for 1-2 minutes to avoid excessive API calls
- Always provide fallback fee rates in case API is unreachable
- Mempool-based fee estimates are more accurate but more volatile than block-based
- Need retry logic with exponential backoff: 1s, 2s, 4s, 8s, then show error
- Users expect fee updates to be automatic but not too frequent (balance UX vs API load)

**Recommended Updates**:
1. Add to "Network Interactions" section in SKILL.md:
   - **"Esplora API Rate Limiting"** subsection
     - Document known rate limits
     - Caching strategies with AsyncStorage
     - Example code for exponential backoff retry logic
2. Add to "Fee Estimation" section:
   - **"Fee Estimate Caching"** pattern
     - Cache duration recommendations (1-2 minutes for high priority, 5 minutes for low)
     - Stale data handling (show cached with "updating..." indicator)
     - Example implementation with react-query
3. Add code example:
   ```typescript
   // Exponential backoff retry helper
   async function fetchWithRetry(url, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fetch(url);
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
       }
     }
   }
   ```

**Impact Level**: HIGH
```

### How This Evolves the Skill

This is a HIGH impact learning that directly addresses a gap causing development inefficiency. After one more similar experience, this would justify updating SKILL.md with:
- Concrete rate limiting documentation
- Example retry logic code
- Caching patterns

---

## Example 3: WebApp Testing Skill - Failure

### Scenario
Agent uses webapp-testing skill to test biometric authentication but encounters platform-specific issues.

### Feedback Entry (in `webapp-testing/SKILL_MEMORY.md`)

```markdown
### 2026-01-11 12:15 - FAILURE

**Skill Used**: webapp-testing

**Task Context**: 
Attempted to test Face ID authentication flow on iOS simulator using guidance from SKILL.md.
Goal was to verify authentication works before deploying to production.

**Outcome**:
Testing failed. Simulator-based biometric tests gave false positives—all tests passed 
on simulator but failed on real device. SKILL.md guidance led to wasted time testing 
in an environment that can't properly validate biometric functionality.

**What Worked Well**:
- SKILL.md correctly listed the test script: `node scripts/test-biometric.js`
- Metro bundler troubleshooting steps were accurate
- Firebase test scripts worked as documented

**What Didn't Work**:
- SKILL.md states "For device testing: Expo Go app or configured simulator/emulator"
  This is misleading for biometric testing—simulator can't properly test Face ID/Touch ID
- "Simulators have limitations" note is buried in section 3.2 and not emphasized enough
- No clear warning: "MUST use physical device for biometric testing"
- Missing guidance on how to test biometric enrollment vs. authentication
- No mention of iOS Simulator's "Enrolled" vs "Matching/Non-matching" Face ID simulation (unreliable)

**Key Learnings**:
- **iOS Simulator biometric testing is fundamentally unreliable**—it simulates success/failure 
  but doesn't validate actual biometric flow, enrollment, or platform-specific edge cases
- **Android emulator** has similar issues—can simulate fingerprint but not real auth
- Physical device testing is **mandatory** for biometric features, not optional
- Should test on multiple devices (iPhone with Face ID vs Touch ID, Android with fingerprint)
- expo-local-authentication behaves differently on simulator vs. device (error codes differ)
- Need to test both: initial biometric setup AND subsequent authentication

**Recommended Updates**:
1. Add **CRITICAL WARNING** to SKILL.md at the top of "Mobile App Testing" section:
   ```
   ⚠️ **CRITICAL**: Biometric authentication, camera, and other hardware features 
   MUST be tested on physical devices. Simulators/emulators provide unreliable 
   results and will give false positives. Always test on real hardware before 
   considering the feature validated.
   ```
2. Update "Prerequisites" section:
   - Change "Expo Go app or configured simulator/emulator" to explicitly note limitations
   - Add: "Physical iOS and Android devices REQUIRED for testing native features"
3. Add new section: "Testing Biometric Authentication" with:
   - Device requirements (iOS with Face ID, iOS with Touch ID, Android with fingerprint)
   - Enrollment testing steps
   - Authentication testing steps
   - Edge cases to test (no biometrics enrolled, biometrics disabled, etc.)
   - Platform-specific differences
4. Remove or qualify any guidance suggesting simulators are sufficient for native feature testing

**Impact Level**: HIGH
```

### How This Evolves the Skill

This is a HIGH impact failure that prevented proper testing and could have led to production bugs. 
This justifies **immediate update** to SKILL.md to add critical warnings and clearer guidance 
about device requirements for biometric testing.

---

## Example 4: Multiple Skills - Pattern Recognition

### Scenario
Over several weeks, multiple feedback entries across different skills all mention issues with Bitcoin address validation.

### Pattern Observed

**In developer-guide/SKILL_MEMORY.md:**
- 3 entries mention confusion about which address types to validate
- 2 entries note missing validation for testnet vs mainnet addresses
- 1 entry highlights bech32m (Taproot) addresses not covered

**In frontend-design/SKILL_MEMORY.md:**
- 2 entries mention displaying address types differently (legacy, SegWit, Taproot)
- 1 entry notes user confusion when sending to unfamiliar address format

**In webapp-testing/SKILL_MEMORY.md:**
- 2 entries document test failures due to incorrect address validation
- 1 entry shows QR code scanning accepting invalid addresses

### Pattern Recognition Entry

```markdown
### PATTERN IDENTIFIED - 2026-01-25

**Cross-Skill Pattern**: Bitcoin Address Validation Gaps

**Evidence**: 
9 feedback entries across 3 skills all point to inadequate Bitcoin address 
validation guidance and implementation issues.

**Common Issues**:
- Unclear which address types to support (P2PKH, P2SH, P2WPKH, P2WSH, P2TR)
- No validation examples for testnet vs mainnet
- Missing bech32m (Taproot) address support
- Inconsistent validation across send/receive/QR scanning flows
- UI doesn't help users understand address type differences

**Impact**:
- Development time wasted on re-implementing validation
- Potential security risk (accepting invalid addresses)
- Poor UX (error messages unclear about why address rejected)

**Recommended Actions**:

1. **Update developer-guide/SKILL.md**:
   - Add comprehensive "Bitcoin Address Validation" section
   - Document all address types with regex/library validation examples
   - Include testnet/mainnet differentiation
   - Code examples using bitcoinjs-lib address validation
   - Security considerations (avoid sending to wrong network)

2. **Update frontend-design/SKILL.md**:
   - Add "Displaying Bitcoin Addresses" pattern
   - Visual differentiation for address types
   - User education moments (tooltip/help text)
   - Error message templates for validation failures

3. **Update webapp-testing/SKILL.md**:
   - Add "Testing Address Validation" section
   - Test cases for each address type
   - Negative test cases (invalid addresses, wrong network)
   - QR code validation testing

4. **Create Shared Resource**:
   - Consider adding `docs/BITCOIN_ADDRESS_VALIDATION.md` as authoritative reference
   - Link from all three skills

**Impact Level**: HIGH (affects multiple skills, security implications)
**Action Required**: Update all three SKILL.md files with validated patterns
```

### How This Evolves Multiple Skills

This cross-skill pattern justifies:
1. Immediate updates to all three SKILL.md files
2. Creation of shared reference documentation
3. Coordination to ensure consistent guidance across skills

---

## Key Takeaways from Examples

### 1. Feedback Quality Matters
- **Specific examples** > vague observations
- **Context** helps others understand the situation
- **Both success and failure** provide learning opportunities

### 2. Impact Levels Guide Urgency
- **HIGH**: Security issues, repeated failures, critical gaps → fast action
- **MEDIUM**: Useful improvements, efficiency gains → wait for patterns
- **LOW**: Edge cases, minor refinements → accumulate before acting

### 3. Patterns Emerge Over Time
- Single incidents → record but don't act
- 2-3 similar experiences → start to see pattern
- 5+ consistent reports → strong pattern, update SKILL.md

### 4. Cross-Skill Insights
- Sometimes issues span multiple skills
- Pattern recognition across skills reveals systemic gaps
- Shared documentation may be needed for cross-cutting concerns

### 5. Continuous Improvement
- Each feedback entry makes the next usage better
- SKILL_MEMORY.md is the "working memory"
- SKILL.md is the "long-term memory" (consolidated, validated)

---

These examples demonstrate how the feedback loop transforms skills from static instructions into living, evolving systems that continuously improve based on real-world usage.
