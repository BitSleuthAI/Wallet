# Dependabot Timeout Fix for React Native + Expo Projects

## Current Status (v5 - 2026-01-06)

**npm ecosystem: DISABLED** ❌

Despite multiple optimization attempts, Dependabot continues to fail with peer dependency resolution errors. The npm ecosystem has been disabled (commented out) in `.github/dependabot.yml`.

**See "Manual Dependency Management" section below for the recommended workflow.**

---

## Problem Background

Dependabot was consistently timing out when attempting to update npm/yarn dependencies in this React Native + Expo repository. The project has:
- 100+ direct dependencies
- 1,500+ transitive dependencies (node_modules)
- 21,000+ lines in package-lock.json

**GitHub Dependabot timeout limit:** 45 minutes for JavaScript/npm ecosystem

### Symptoms
- npm/yarn Dependabot runs cancelled after timeout (exceeding 45-minute limit)
- "Error while updating peer dependency" failures
- Gradle dependency updates completing successfully in <1 minute
- Multiple failed runs with no PR creation
- npm updates eventually disabled entirely due to persistent failures

### Root Cause Analysis

#### Evolution of the Problem

1. **Original Configuration** - Too complex:
   - 5 dependency groups with extensive pattern matching
   - `development-dependencies`, `expo-sdk`, `react-native-firebase`, `babel`, `bitcoin`
   - Complex version resolution when grouping packages together
   - 5 concurrent PRs creating resolution overhead

2. **First Simplification** - Still failed:
   - Reduced to 1 group (Expo SDK only)
   - BUT: `open-pull-requests-limit: 100` was still set
   - Weekly schedule meant frequent heavy operations
   - Still timing out due to excessive concurrent work

3. **Complete Disable** - Prior state:
   - npm ecosystem completely commented out
   - All JavaScript dependency updates required manual intervention
   - Lost automated security updates for JavaScript packages

## Final Solution (v5 - npm Disabled)

After exhausting all optimization strategies, the npm ecosystem has been **disabled** in Dependabot configuration.

### Why Optimization Attempts Failed

Despite implementing:
- ✅ Registry URL fix (removed `.npmrc`)
- ✅ Reduced PR limit (100 → 3)
- ✅ Monthly schedule (vs weekly)
- ✅ Minimal grouping (Expo SDK only)
- ✅ Strategic ignores

**Dependabot still fails** with peer dependency resolution errors. The project's complexity exceeds Dependabot's current capabilities.

### Manual Dependency Management Workflow

With npm ecosystem disabled, use this workflow for dependency updates:

#### 1. Monthly Security Audit
```bash
# Check for security vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Review and manually fix remaining issues
npm audit fix --force  # Use with caution
```

#### 2. Expo SDK Updates
Follow the official [Expo SDK upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/):

```bash
# Update to latest Expo SDK
npx expo install expo@latest

# Fix dependency versions for current SDK
npx expo install --fix

# Test thoroughly
npm start
```

#### 3. React Native Updates
Follow the [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/):

1. Review changes between versions
2. Apply platform-specific updates
3. Update dependencies
4. Test on both iOS and Android

#### 4. Regular Package Updates
```bash
# Check outdated packages
npm outdated

# Update specific package
npm update <package-name>

# Or update package.json and reinstall
npm install
```

**Best Practice:** Update packages individually and test after each update to isolate issues.

---

## Historical Optimization Attempts (v2-v4 - Archived)

The following strategies were attempted but ultimately did not resolve the peer dependency issues:

### Key Optimization Strategies (v3-v4)

#### 1. Drastically Reduced Concurrent PR Limit (100 → 3)

**Critical change:** The previous configuration had `open-pull-requests-limit: 100` which meant Dependabot would attempt to create up to 100 PRs in a single run. Each PR requires:
- Dependency resolution
- Lock file updates
- Compatibility checks
- Security scanning

**Impact:** Limiting to 3 PRs means Dependabot does minimal work per run, staying well under the 45-minute timeout.

#### 2. Changed Schedule (Weekly → Monthly)

**Rationale:** 
- Monthly runs reduce the frequency of heavy operations
- Gives Dependabot more "rest time" between runs
- Security updates still arrive (just batched monthly instead of weekly)
- Reduces npm registry load

#### 3. Minimal Dependency Grouping

**Kept group:**
- `expo-sdk` - **Critical** - Expo packages must be updated together for compatibility

**Removed groups:**
- All others (development-dependencies, react-native-firebase, babel, bitcoin)
- Rationale: Reduces resolution complexity while keeping critical compatibility intact

#### 4. Expanded Strategic Ignore Rules

Added ignore rules to prevent updates that require careful manual testing:

```yaml
ignore:
  - dependency-name: "expo-mcp"  # Dev tool - manual updates preferred
  - dependency-name: "@babel/*"
    update-types:
      - "version-update:semver-patch"  # Only ignore patch, allow security/minor/major
  - dependency-name: "babel-*"
    update-types:
      - "version-update:semver-patch"
  - dependency-name: "react"
    update-types:
      - "version-update:semver-major"
      - "version-update:semver-minor"  # React updates require careful testing
  - dependency-name: "react-native"
    update-types:
      - "version-update:semver-major"
      - "version-update:semver-minor"  # RN updates require migration
  - dependency-name: "react-dom"
    update-types:
      - "version-update:semver-major"
      - "version-update:semver-minor"  # Tied to React version
```

**Important:** 
- Security fixes still auto-update for ALL packages
- Patch updates for most packages still auto-update
- Only major/minor updates for critical packages (React, React Native) are manual

### 5. Security Coverage Maintained

All packages still receive:
- ✅ Security updates (all severity levels) - **HIGHEST PRIORITY**
- ✅ Patch updates for most packages (except Babel, React, React Native, React DOM)
- ⚠️ Major/minor version updates for non-critical packages only
- ❌ Major/minor updates for React/React Native (manual testing required)

## Expected Results

With these optimizations:

1. **Timeout Prevention:**
   - 3 PRs max = minimal concurrent work
   - Monthly schedule = reduced frequency
   - Minimal grouping = faster resolution

2. **Security Maintained:**
   - All packages get security patches automatically
   - Critical vulnerabilities still addressed quickly
   - No compromise on security posture

3. **Manageable Updates:**
   - 3 PRs per month is reasonable for manual review
   - React/React Native updates remain manual (as they should be)
   - Expo SDK updates grouped for compatibility

## Monitoring & Success Criteria

### How to Verify Success

1. **Check Dependabot Logs:**
   - Go to: Repository → Insights → Dependency graph → Dependabot
   - Look for successful npm ecosystem runs
   - Check completion time (should be < 45 minutes)

2. **Review Created PRs:**
   - Should see 1-3 npm dependency PRs per month
   - PRs should have proper labels (`dependencies`, `npm`)
   - Commit messages should follow `chore(deps)` format

3. **Monitor for Timeouts:**
   - If still timing out, further reduce `open-pull-requests-limit` to 1
   - Consider adding more packages to ignore list
   - May need to switch to security-only updates

### Timeline

- **Next Dependabot run:** Monthly on a Monday at 09:00 UTC (GitHub selects which Monday)
- **Expected:** Successful completion with 1-3 PRs created
- **Fallback:** If timeout persists, see "Additional Mitigation Options" below

## Troubleshooting Dependabot Issues

### Registry URL Malformation Issue (Fixed 2026-01-06)

**Symptoms:**
- Dependabot logs show malformed URLs like `https://registry.npmjs.org:443http://registry.npmjs.org:443/package`
- Error: "Cannot read TLS response from mitm'd server lookup registry.npmjs.org:443http: no such host"
- Updates fail with "Error while updating peer dependency"

**Root Cause:**
The `.npmrc` file with `package-manager-strict=true` setting interfered with Dependabot's internal npm registry configuration, causing URL concatenation issues.

**Solution:**
Remove `.npmrc` file if it contains only `package-manager-strict=true`. The `packageManager` field in `package.json` provides equivalent package manager version enforcement without interfering with Dependabot:

```json
{
  "packageManager": "npm@10.2.4"
}
```

This field serves the same purpose as `package-manager-strict=true` but doesn't conflict with Dependabot's registry handling.

**Verification:**
- Local npm operations continue to work normally
- Package manager version is still enforced
- Dependabot can properly resolve npm registry URLs

## Additional Mitigation Options

If timeouts continue despite these optimizations:

### Option 1: Further Reduce PR Limit
```yaml
open-pull-requests-limit: 1  # Only create 1 PR per run
```

### Option 2: Security-Only Updates
```yaml
open-pull-requests-limit: 10
# Remove groups section entirely
# This speeds up processing significantly
```
Then rely on `npm audit` for security updates and manual updates for everything else.

### Option 3: Bi-Monthly Schedule
```yaml
schedule:
  interval: "monthly"
  # But manually trigger less often via GitHub UI
```

### Option 4: Targeted Ecosystem
Focus only on specific high-priority packages:
```yaml
allow:
  - dependency-type: "direct"  # Only direct dependencies, not transitive
```

## React Native + Expo Specific Considerations

### Why This Matters for React Native + Expo

React Native and Expo projects have unique characteristics that make Dependabot timeout issues more common:

1. **Massive dependency trees** - Native modules bring in many transitive dependencies
   - This project: 100+ direct, 1,500+ transitive dependencies
2. **Synchronized updates required** - Expo SDK packages must match versions
3. **Multiple ecosystems** - JavaScript + native (iOS/Android) dependencies
4. **Frequent updates** - React Native ecosystem moves quickly
5. **Complex resolution** - Native modules often have platform-specific requirements

### Best Practices for React Native + Expo

Based on this experience, here are recommendations:

1. **Minimize concurrent PRs** - Use `open-pull-requests-limit: 3` or even `1`
2. **Minimize grouping** - Only group packages that MUST be synchronized (Expo SDK)
3. **Monthly (not weekly) schedule** - Reduces frequency and timeout risk
4. **Strategic ignores** - Ignore major/minor updates for React/React Native
5. **Keep security updates** - Never ignore security-related updates
6. **Manual major updates** - Major Expo SDK/React Native upgrades should always be manual
7. **Monitor Dependabot logs** - Check GitHub Insights regularly for timeout issues

### Why `open-pull-requests-limit: 100` Failed

The previous configuration had this setting, which essentially means "try to update everything at once." For a project with 100+ dependencies, this is catastrophic:

- Dependabot attempts to resolve all dependencies
- Creates locks for up to 100 PRs
- npm registry calls timeout
- Total processing time exceeds 45 minutes
- Run is cancelled, no PRs created

**Solution:** Limit to 3 PRs means Dependabot picks the 3 highest-priority updates (usually security fixes) and processes only those.

## Comparison with Other Package Managers

| Ecosystem | Timeout Limit | This Project's Complexity |
|-----------|---------------|---------------------------|
| npm       | 45 minutes    | 21K lines in lock file ⚠️ |
| Gradle    | 45 minutes    | Much simpler ✅ |
| pip       | 45 minutes    | N/A |
| Bundler   | 45 minutes    | N/A |

JavaScript/npm is particularly prone to timeouts due to:
- Flat dependency structure in package-lock.json
- All transitive dependencies resolved explicitly
- Large number of packages in typical Node.js projects

## Testing & Verification

The configuration change will be tested on the next scheduled Dependabot run:
- **Schedule:** Monthly on a Monday at 09:00 UTC (GitHub selects which Monday)
- **Expected result:** Successful completion without timeout, 1-3 PRs created
- **Expected duration:** < 30 minutes (well under 45-minute limit)
- **Monitor:** Repository → Insights → Dependency graph → Dependabot

## Rollback Plan

If timeouts continue despite optimizations:

1. **Reduce to 1 PR:** Set `open-pull-requests-limit: 1`
2. **Remove Expo grouping:** Handle Expo updates manually
3. **Add more ignores:** Expand ignore list for problematic packages
4. **Security-only mode:** Remove groups entirely, rely on security updates only
5. **Disable npm ecosystem again:** Last resort - back to manual updates

## Version History & Changelog

### v5 - npm Disabled Due to Persistent Peer Dependency Errors (2026-01-06)
- ❌ **npm ecosystem completely disabled** (commented out in `.github/dependabot.yml`)
- **Decision:** After exhausting all optimization strategies, peer dependency resolution remains broken
- **Impact:** Dependabot will no longer attempt npm updates, eliminating error notifications
- **Mitigation:** Manual dependency management workflow documented (see above)
- **Gradle ecosystem:** Still enabled and working normally
- **Re-enable criteria:** Only if Dependabot improves peer dependency handling OR dependency tree is significantly simplified
- **Status:** Final solution until technical constraints change

### v4 - Fixed Registry URL Issue (2026-01-06)
- Fixed malformed npm registry URL issue preventing Dependabot from resolving dependencies
- **Problem:** Dependabot was encountering `https://registry.npmjs.org:443http://registry.npmjs.org:443/dotenv` (double protocol)
- **Root cause:** `.npmrc` file with `package-manager-strict=true` interfered with Dependabot's registry configuration
- **Solution:** Removed `.npmrc` file - `packageManager` field in package.json provides equivalent functionality
- **Impact:** Dependabot can now properly resolve npm registry URLs without conflicts
- **Status:** Monitoring - awaiting next monthly run to confirm fix

### v3 - Re-enabled npm updates (2026-01-05)
- Re-enabled npm ecosystem with aggressive timeout mitigation
- Reduced `open-pull-requests-limit` from 100 → 3
- Changed schedule from weekly → monthly
- Added React/React Native to ignore list (major/minor only)
- Expanded documentation with detailed rationale
- **Status:** Identified registry URL issue blocking updates

### v2 - Disabled npm updates (Prior state)
- npm ecosystem completely disabled
- Comment: "DISABLED: npm updates due to resolution errors"
- All JavaScript updates required manual intervention
- **Result:** No timeouts, but no automated updates either

### v1 - Simplified configuration
- Reduced groups from 5 → 1 (Expo SDK only)
- BUT: Still had `open-pull-requests-limit: 100`
- Weekly schedule maintained
- **Result:** Still timed out, led to complete disable

### v0 - Original complex configuration  
- 5 dependency groups
- Multiple concurrent PRs
- **Result:** Consistent timeouts after ~55 minutes

## References

- [Dependabot Configuration Options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Dependabot Version Updates](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/about-dependabot-version-updates)
- [Expo SDK Update Guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Dependabot Timeout Issues on GitHub](https://github.com/dependabot/dependabot-core/issues?q=is%3Aissue+timeout)
- [Best Practices for Large JavaScript Projects](https://github.com/dependabot/dependabot-core/blob/main/docs/best-practices.md)

## Summary

**Final Outcome (v5):** npm ecosystem disabled in Dependabot due to unsolvable peer dependency resolution errors.

### What We Learned

Attempted optimizations for large JavaScript projects:
1. ✅ Drastically limit concurrent PRs (`open-pull-requests-limit: 3`)
2. ✅ Reduce update frequency (monthly instead of weekly)
3. ✅ Minimize dependency grouping (only Expo SDK)
4. ✅ Strategic ignores (skip React/RN major/minor)
5. ✅ Remove `.npmrc` conflicts
6. ✅ Monitor and iterate

**Result:** Even with all optimizations, peer dependency resolution in complex React Native + Expo projects exceeds Dependabot's capabilities.

### The Underlying Issue

- **Project complexity:** 100+ direct, 1,500+ transitive dependencies, 21K+ lines in package-lock.json
- **React Native ecosystem:** Complex peer dependency constraints across native modules
- **Dependabot limitations:** 45-minute timeout insufficient for resolving such complex dependency graphs
- **Peer dependencies:** Multiple conflicting requirements that Dependabot cannot reconcile

### Recommended Approach

For large React Native + Expo projects:
1. **Use manual dependency management** (documented above)
2. **Enable Dependabot for native dependencies** (Gradle, CocoaPods work better)
3. **Run `npm audit` monthly** for security updates
4. **Follow official upgrade guides** for Expo SDK and React Native
5. **Test each update thoroughly** before merging

**When to re-enable:** Only if Dependabot significantly improves peer dependency resolution OR the project's dependency tree is dramatically simplified.
