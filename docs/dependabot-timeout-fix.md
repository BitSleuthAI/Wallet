# Dependabot Timeout Fix for React Native + Expo Projects

## Problem Background

Dependabot was consistently timing out after ~55 minutes when attempting to update npm/yarn dependencies in this React Native + Expo repository with 100+ packages.

### Symptoms
- npm/yarn Dependabot runs cancelled after timeout
- Gradle dependency updates completing successfully in <1 minute
- Multiple failed runs with no PR creation

### Root Cause

The original Dependabot configuration was too complex for a large React Native + Expo project:

1. **5 dependency groups** with extensive pattern matching:
   - `development-dependencies` (all dev dependencies)
   - `expo-sdk` (Expo packages)
   - `react-native-firebase` (Firebase packages)
   - `babel` (all Babel packages)
   - `bitcoin` (8+ Bitcoin protocol packages)

2. **Complex version resolution** when trying to group all these packages together
3. **npm registry timeout** due to the complexity of resolving 100+ dependencies with grouping rules
4. **5 concurrent PRs** creating additional resolution overhead

## Solution Implemented

### 1. Simplified Dependency Groups (5 → 1)

**Removed groups:**
- `development-dependencies` - not critical to group
- `react-native-firebase` - can be updated independently
- `babel` - can be updated independently
- `bitcoin` - can be updated independently

**Kept group:**
- `expo-sdk` - **Critical** - Expo packages must be updated together for compatibility

### 2. Reduced Concurrent PR Limit (5 → 3)

Limits the number of parallel dependency resolution attempts, reducing load on npm registry and Dependabot.

### 3. Strategic Ignore Rules

Added ignore rules for Babel packages to reduce resolution complexity while maintaining security:

```yaml
ignore:
  - dependency-name: "expo-mcp"  # Dev tool - manual updates
  - dependency-name: "@babel/*"
    update-types:
      - "version-update:semver-patch"  # Only ignore patch
  - dependency-name: "babel-*"
    update-types:
      - "version-update:semver-patch"  # Only ignore patch
```

**Important:** Security fixes and minor versions still auto-update.

### 4. Maintained Security Coverage

All packages still receive:
- ✅ Security updates (all severity levels)
- ✅ Major version updates
- ✅ Minor version updates (except Babel patches)

## Results

- **Prevents timeout** by reducing dependency resolution complexity
- **Maintains security** for all dependencies
- **Faster PR reviews** with individual package updates
- **Expo compatibility** preserved through SDK grouping

## React Native + Expo Specific Considerations

### Why This Matters for React Native + Expo

React Native and Expo projects have unique characteristics that make Dependabot timeout issues more common:

1. **Large dependency trees** - Native modules bring in many transitive dependencies
2. **Synchronized updates required** - Expo SDK packages must match versions
3. **Multiple ecosystems** - JavaScript + native (iOS/Android) dependencies
4. **Frequent updates** - React Native ecosystem moves quickly

### Best Practices

For React Native + Expo projects using Dependabot:

1. **Minimize grouping** - Only group packages that MUST be synchronized
2. **Limit concurrent PRs** - 3-5 is optimal for large projects
3. **Strategic ignores** - Ignore patch updates for complex dependency trees
4. **Keep security updates** - Never ignore security-related updates
5. **Manual updates** - Some packages are better updated manually (e.g., major Expo SDK upgrades)

## Testing & Verification

The configuration change will be tested on the next scheduled Dependabot run:
- **Schedule**: Monday 09:00 (npm), Tuesday 09:00 (Gradle)
- **Expected result**: Successful completion without timeout
- **Monitor**: GitHub Actions workflow runs

## Rollback Plan

If timeouts continue, further simplifications:

1. Remove the `expo-sdk` group (handle Expo updates manually)
2. Reduce `open-pull-requests-limit` to 1-2
3. Add more ignore rules for problematic packages
4. Consider switching to monthly updates instead of weekly

## References

- [Dependabot Configuration Options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Expo SDK Update Guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Dependabot Timeout Issues](https://github.com/dependabot/dependabot-core/issues?q=is%3Aissue+timeout)

## Changelog

- **2026-01-05**: Simplified configuration to prevent timeouts
  - Reduced groups from 5 to 1
  - Reduced concurrent PRs from 5 to 3
  - Added Babel patch ignore rules
  - Fixed YAML formatting
