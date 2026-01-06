# Dependabot Configuration for React Native + Expo

## Overview

This document explains the Dependabot configuration for the BitSleuth Wallet, a React Native + Expo mobile application.

**Status:** ❌ npm updates DISABLED due to persistent peer dependency resolution errors (as of 2026-01-06)

See [`dependabot-timeout-fix.md`](./dependabot-timeout-fix.md) for detailed analysis of timeout issues and mitigation strategies.

## Configuration File

The Dependabot configuration is located at `.github/dependabot.yml` and is configured to manage dependencies for:

1. **npm** - ❌ DISABLED - JavaScript/TypeScript dependencies (commented out)
2. **Gradle** - ✅ ENABLED - Android native dependencies

**Note:** CocoaPods is not supported by GitHub Dependabot. iOS native dependencies (managed via CocoaPods) must be updated manually or through other automation tools.

## Package Ecosystems

### 1. NPM (JavaScript/TypeScript)

**Directory:** `/`  
**Schedule:** N/A (disabled)  
**PR Limit:** N/A (disabled)  
**Status:** ❌ DISABLED - Peer dependency resolution failures

#### Why npm is Disabled (v5 - 2026-01-06)

Despite multiple optimization attempts, Dependabot continues to fail with peer dependency resolution errors in this project:

**Challenges:**
- 100+ direct dependencies, 1,500+ transitive dependencies
- 21,000+ lines in package-lock.json
- Complex peer dependency requirements from React Native ecosystem
- Multiple conflicting peer dependency constraints
- Exceeds Dependabot's 45-minute timeout limit

**Previous Attempts:**
- ✅ Removed `.npmrc` file (fixed registry URL malformation)
- ✅ Reduced PR limit from 100 → 3
- ✅ Changed schedule from weekly → monthly
- ✅ Minimized grouping (only Expo SDK)
- ✅ Added strategic ignores
- ❌ Still experiencing peer dependency resolution failures

**Current Solution: Manual Dependency Management**

Until Dependabot improves peer dependency resolution or the dependency tree is simplified, npm dependencies must be managed manually:

1. **Security Updates:**
   ```bash
   npm audit
   npm audit fix
   ```
   Run monthly or when security advisories are received.

2. **Expo SDK Updates:**
   Follow the [Expo SDK upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
   ```bash
   npx expo install expo@latest
   npx expo install --fix
   ```

3. **React Native Updates:**
   Follow the [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/)
   
4. **Other Package Updates:**
   ```bash
   npm outdated
   npm update <package-name>
   ```
   Test thoroughly after each update.

#### Previous Configuration (v3-v4 - Archived)

The npm ecosystem was configured with aggressive timeout mitigation strategies:

- **Monthly schedule** (not weekly) to reduce frequency
- **3 PR limit** (down from 100) to minimize concurrent dependency resolution
- **Minimal grouping** to reduce resolution complexity
- **Strategic ignores** for packages requiring manual testing

#### Dependency Groups

**Current groups (1 total):**

- **expo-sdk**: All Expo SDK packages that must be updated together
  - Patterns: `expo`, `expo-*`, `@expo/*`
  - Update types: minor, patch
  - **Critical**: Expo packages are tightly coupled and should be updated in sync
  - Example: `expo-router` requires specific versions of `expo` core

**Removed groups (for timeout mitigation):**
- ❌ `development-dependencies` - Not critical to group
- ❌ `react-native-firebase` - Can be updated independently
- ❌ `babel` - Can be updated independently
- ❌ `bitcoin` - Can be updated independently

#### Strategic Ignores

Packages ignored for major/minor updates (patch and security updates still automatic):

- **expo-mcp**: Dev tool - manual updates preferred
- **@babel/\*** and **babel-\***: Patch updates ignored (security + major/minor still enabled)
- **react**: Major/minor updates require careful testing
- **react-native**: Major/minor updates require migration
- **react-dom**: Tied to React version

**Important:** Security updates are NEVER ignored for any package.

### 2. Gradle (Android)

**Directory:** `/android`  
**Schedule:** Weekly on Tuesdays at 09:00 UTC  
**PR Limit:** 3

Gradle manages native Android dependencies including:
- React Native Android libraries
- Expo modules
- Firebase Android SDKs
- Google Play Services
- Other native Android libraries

**Labels:** `dependencies`, `android`, `native`

## Timeout Mitigation Strategy

### Why Timeouts Were a Problem

The project has:
- 100+ direct npm dependencies
- 1,500+ transitive dependencies
- 21,000+ lines in package-lock.json

**GitHub Dependabot timeout limit:** 45 minutes for JavaScript/npm

Previous configurations consistently exceeded this limit, causing:
- Failed Dependabot runs
- No PRs created
- npm ecosystem eventually disabled entirely

### Current Solution

The configuration uses multiple strategies to stay under the 45-minute timeout:

1. **Reduced PR limit** (100 → 3)
   - Most critical change
   - Limits concurrent dependency resolution work
   - Focuses on highest-priority updates (usually security)

2. **Monthly schedule** (weekly → monthly)
   - Reduces frequency of heavy operations
   - Gives more time between runs
   - Security updates still arrive promptly

3. **Minimal grouping** (5 groups → 1)
   - Only Expo SDK grouped (critical for compatibility)
   - Reduces resolution complexity significantly

4. **Strategic ignores**
   - React/React Native major/minor updates manual
   - Babel patch updates ignored
   - Reduces resolution attempts

5. **Focus on security**
   - All packages still get security updates
   - Critical vulnerabilities never ignored
   - Patch updates for most packages still automatic

### Expected Results

- ✅ Dependabot completes in < 30 minutes
- ✅ 1-3 PRs created per month
- ✅ Security updates automatic
- ✅ No timeouts

See [`dependabot-timeout-fix.md`](./dependabot-timeout-fix.md) for full analysis and version history.

## Best Practices

### For Reviewers

When reviewing Dependabot PRs:

1. **Security updates**: Review and merge promptly
2. **Expo SDK updates**: Test thoroughly on both iOS and Android
3. **Patch updates**: Generally safe, but test basic functionality
4. **Native dependencies**: Test on physical devices when possible

### Monitoring

Check Dependabot status regularly:
- **Location**: Repository → Insights → Dependency graph → Dependabot
- **Next npm run**: Monthly on a Monday at 09:00 UTC (GitHub selects which Monday)
- **Next Gradle run**: Every Tuesday at 09:00 UTC
- **Expected**: npm runs complete in < 30 minutes with 1-3 PRs

### What to Do If Timeouts Return

If npm runs start timing out again:

1. **Reduce PR limit further**: Set `open-pull-requests-limit: 1`
2. **Remove Expo grouping**: Handle Expo SDK updates manually
3. **Add more ignores**: Expand ignore list for problematic packages
4. **Check logs**: Review Dependabot logs for specific timeout patterns
5. **Consider security-only**: Remove groups entirely, focus on security

See [`dependabot-timeout-fix.md`](./dependabot-timeout-fix.md) for detailed troubleshooting.

## Update Schedule Summary

| Ecosystem | Schedule | PR Limit | Critical Notes |
|-----------|----------|----------|----------------|
| npm | Monthly (Monday 09:00 UTC)* | 3 | Timeout mitigation active |
| Gradle | Weekly (Tuesday 09:00 UTC) | 3 | No timeout issues |

*GitHub selects which Monday of the month

## Security Coverage

All packages receive:
- ✅ Security updates (any severity, any package)
- ✅ Patch updates (most packages)
- ⚠️ Major/minor updates (selective - React/RN manual only)

**Critical:** Security is never compromised. All security updates are automatic regardless of ignore rules.

## Troubleshooting

### Common Issues and Solutions

#### Issue: Malformed Registry URL

**Symptoms:**
- Error: `GET https://registry.npmjs.org:443http://registry.npmjs.org:443/package`
- "Cannot read TLS response from mitm'd server"
- "Error while updating peer dependency"

**Root Cause:**
`.npmrc` file with `package-manager-strict=true` interferes with Dependabot's registry configuration.

**Solutions:**
1. Remove `.npmrc` if it only contains `package-manager-strict=true`
2. The `packageManager` field in package.json provides equivalent functionality
3. Verify package.json has: `"packageManager": "npm@10.2.4"`

**Fixed:** 2026-01-06 - `.npmrc` removed from repository

#### Issue: npm Dependabot Times Out

**Symptoms:**
- Dependabot run cancelled after ~45 minutes
- No PRs created
- Error in Dependabot logs about timeout

**Solutions:**
1. Current configuration already implements timeout mitigation
2. If still occurring, reduce `open-pull-requests-limit` from 3 to 1
3. Remove Expo SDK grouping
4. Add more packages to ignore list

**Reference:** See [`dependabot-timeout-fix.md`](./dependabot-timeout-fix.md)

#### Issue: Dependabot Fails to Create PR

**Symptoms:**
- Run completes but no PRs appear
- Error messages in logs

**Solutions:**
1. Check that directories exist (`/android` has `build.gradle`)
2. Verify YAML syntax: `python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"`
3. Check GitHub's Dependabot logs in repository Insights
4. Ensure package-ecosystem values are valid

#### Issue: Conflicting Expo SDK Updates

**Symptoms:**
- Expo packages update individually causing version mismatch
- App fails to build after Dependabot PR

**Solutions:**
1. Check that Expo SDK grouping is configured correctly
2. Review [Expo SDK compatibility docs](https://docs.expo.dev/)
3. May need to pin certain packages temporarily
4. Reject individual PRs, wait for grouped PR

#### Issue: Native Build Failures After Updates

**Symptoms:**
- iOS or Android build fails after merging Dependabot PR

**Solutions:**
1. **iOS**: Run `cd ios && pod install && cd ..`
2. **Android**: Run `cd android && ./gradlew clean && cd ..`
3. Clear Metro cache: `npx expo start -c`
4. Check for breaking changes in package changelogs

## Version History

### v5 - Disabled npm Due to Persistent Peer Dependency Errors (2026-01-06)
- ❌ npm ecosystem completely disabled (commented out in dependabot.yml)
- **Reason:** Persistent peer dependency resolution failures despite all mitigations
- Even after fixing registry URL issue, complex dependency tree exceeds Dependabot capabilities
- Manual dependency management workflow documented
- Gradle ecosystem remains enabled and functional
- **Next steps:** Re-enable only if Dependabot improves or dependency tree is simplified

### v4 - Fixed Registry URL Issue (2026-01-06)
- Fixed malformed npm registry URL preventing dependency resolution
- Removed `.npmrc` file with `package-manager-strict=true`
- Package manager enforcement preserved via package.json `packageManager` field
- Dependabot can now properly access npm registry
- **Result:** Registry access fixed, but peer dependency resolution still fails

### v3 - Re-enabled npm with Timeout Mitigation (2026-01-05)
- ✅ Re-enabled npm ecosystem
- Reduced `open-pull-requests-limit` from 100 → 3
- Changed schedule from weekly → monthly
- Kept only Expo SDK grouping
- Added React/React Native to ignore list (major/minor)
- Comprehensive documentation updates
- **Result:** Still experiencing failures

### v2 - npm Disabled (Previous)
- ❌ npm ecosystem completely disabled
- Comment: "DISABLED: npm updates due to resolution errors"
- Only Gradle ecosystem active

### v1 - Simplified (Prior attempt)
- Reduced groups from 5 → 1
- Still had `open-pull-requests-limit: 100`
- Result: Still timed out

### v0 - Original Complex Configuration
- 5 dependency groups
- Multiple concurrent PRs
- Result: Consistent timeouts

## References

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Expo SDK Versioning](https://docs.expo.dev/versions/latest/)
- [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/)
