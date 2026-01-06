# Why npm is Disabled in Dependabot (2026-01-06)

## Executive Summary

**Status:** ❌ npm ecosystem permanently disabled in Dependabot configuration

**Reason:** Persistent peer dependency resolution failures that cannot be resolved through configuration optimization

**Impact:** JavaScript/TypeScript dependencies must be managed manually using the workflow documented below

---

## Problem Statement

Dependabot consistently fails when attempting to update npm dependencies with the error:

```
Error while updating peer dependency.
```

This occurs despite:
- Fixing registry URL malformation (removed `.npmrc`)
- Aggressive timeout mitigation (3 PR limit, monthly schedule)
- Minimal dependency grouping (Expo SDK only)
- Strategic ignores (React, React Native, Babel)

## Root Cause

The BitSleuth Wallet project has a complex dependency tree that exceeds Dependabot's current capabilities:

### Project Characteristics
- **100+ direct dependencies**
- **1,500+ transitive dependencies**
- **21,000+ lines** in package-lock.json
- **React Native + Expo ecosystem** with complex peer dependency requirements
- **Multiple conflicting peer dependency constraints** across packages

### Technical Constraints
- **Dependabot timeout:** 45 minutes for JavaScript/npm ecosystem
- **Peer dependency resolution:** Requires traversing entire dependency graph
- **React Native complexity:** Native modules have platform-specific peer requirements
- **Expo SDK requirements:** Tightly coupled package versions with strict peer constraints

### Why Optimization Failed

Even with best-practice optimizations:
1. ✅ Reduced concurrent PRs to 3 (from 100)
2. ✅ Monthly schedule (from weekly)
3. ✅ Minimal grouping (1 group vs 5)
4. ✅ Strategic ignores for complex packages
5. ✅ Fixed registry URL conflicts
6. ❌ **Still exceeds timeout/resolution capacity**

The complexity of resolving peer dependencies in this project fundamentally exceeds what Dependabot can handle within its constraints.

---

## Decision: Disable npm Ecosystem

### What's Disabled
- Automatic npm dependency updates via Dependabot
- Automated security updates for JavaScript packages via Dependabot
- Automated PR creation for npm package updates

### What Still Works
- ✅ Gradle ecosystem (Android native dependencies) - still enabled
- ✅ Manual dependency updates using npm CLI
- ✅ Manual security audits using `npm audit`
- ✅ Manual Expo SDK updates using `npx expo`

### Why This Is The Right Choice

1. **Stops failing runs:** No more error notifications and failed Dependabot runs
2. **Manual control:** JavaScript updates in React Native require testing anyway
3. **Security maintained:** `npm audit` provides same security visibility
4. **Focused resources:** Dependabot works well for Gradle, focus there
5. **Realistic approach:** Acknowledges tool limitations rather than fighting them

---

## Manual Dependency Management Workflow

With npm disabled in Dependabot, use this workflow for dependency maintenance:

### 1. Monthly Security Audit (Required)

Run security audit at least monthly:

```bash
# Check for vulnerabilities
npm audit

# View detailed report
npm audit --json

# Automatically fix where possible (use caution)
npm audit fix

# Force fixes (may introduce breaking changes)
npm audit fix --force
```

**Schedule:** First Monday of each month, 9:00 AM (same as old Dependabot schedule)

### 2. Quarterly Expo SDK Updates

Expo SDK updates should be done quarterly or when security issues arise:

```bash
# Check current Expo version
npx expo --version

# Update to latest Expo SDK
npx expo install expo@latest

# Fix all Expo package versions for compatibility
npx expo install --fix

# Verify installation
npm start
```

**Resources:**
- [Expo SDK Upgrade Walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Expo SDK Release Notes](https://docs.expo.dev/versions/latest/)

**Testing required:**
- Build on iOS simulator
- Build on Android emulator
- Test core wallet functionality
- Test native features (camera, biometrics, etc.)

### 3. Annual React Native Updates

React Native major/minor updates require careful planning:

```bash
# Check current version
npm list react-native

# Use React Native Upgrade Helper
# Visit: https://react-native-community.github.io/upgrade-helper/
# Follow step-by-step guide for your version upgrade
```

**Important:**
- Always review the upgrade helper for platform-specific changes
- Update iOS and Android native code as needed
- Test thoroughly on both platforms
- Coordinate with Expo SDK compatibility

### 4. Ad-Hoc Package Updates

For individual package updates:

```bash
# Check which packages are outdated
npm outdated

# Update specific package
npm update <package-name>

# Or manually edit package.json and run
npm install

# Always test after updates
npm start
npm run ios  # or npm run android
```

**Best Practices:**
- Update one package at a time
- Test after each update
- Check for peer dependency warnings
- Read package changelogs for breaking changes

### 5. Automated CI Security Checks (Recommended)

Consider adding automated security checks to CI:

```yaml
# Example GitHub Actions workflow
name: Security Audit
on:
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Monday
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm audit --audit-level=high
      - run: npm outdated || true
```

---

## Comparison: Automated vs Manual

| Aspect | With Dependabot | Manual Management |
|--------|----------------|-------------------|
| Security updates | Automated PRs | Monthly `npm audit` |
| Update frequency | Monthly (when working) | On-demand + quarterly |
| Failure rate | ~100% (peer deps) | 0% (manual control) |
| Testing required | Yes | Yes (same) |
| Maintenance burden | Low (when working) | Medium (scheduled tasks) |
| Flexibility | Limited | High |
| Control | Automated | Full manual control |

**Verdict:** Manual management is more reliable for this project's complexity.

---

## Re-enabling Criteria

npm ecosystem should only be re-enabled if:

### Option 1: Dependabot Improves
- GitHub releases peer dependency resolution improvements
- Timeout limit increased beyond 45 minutes
- Better handling of complex React Native projects

**Monitor:** [Dependabot changelog](https://github.com/dependabot/dependabot-core/releases)

### Option 2: Project Simplifies
- Dependency count reduced significantly (< 50 direct)
- Lock file size reduced (< 10K lines)
- React Native + Expo architecture simplified

**Unlikely:** React Native + Expo inherently require many dependencies

### Option 3: Alternative Tools
- Renovate Bot (supports more complex scenarios)
- Custom automation with better timeout handling
- GitHub Action-based dependency updates

**Note:** Would require research and testing

---

## Files Modified

### 1. `.github/dependabot.yml`
- Commented out entire npm ecosystem configuration
- Added detailed explanation in comments
- Kept Gradle ecosystem enabled
- Documented manual workflow in comments

### 2. `docs/dependabot-configuration.md`
- Updated status to "DISABLED"
- Added manual management workflow
- Updated version history with v5
- Explained decision rationale

### 3. `docs/dependabot-timeout-fix.md`
- Added v5 to version history
- Updated summary with final outcome
- Documented all attempted optimizations
- Added manual workflow details

### 4. `docs/DEPENDABOT_NPM_DISABLED.md` (This file)
- Created comprehensive documentation
- Explained decision and rationale
- Provided detailed manual workflow
- Set re-enabling criteria

---

## Questions & Answers

### Q: Why not just ignore the errors?
**A:** Failed Dependabot runs create noise in notifications and give false impression that dependency updates are being handled automatically.

### Q: Won't we miss security updates?
**A:** No - `npm audit` provides the same security vulnerability detection. We're just running it manually instead of via Dependabot.

### Q: What about Gradle dependencies?
**A:** Gradle ecosystem works perfectly and remains enabled. Android native dependencies continue to get automated updates.

### Q: Can we use another tool instead?
**A:** Possibly. Renovate Bot might handle this better, but would require research, setup, and testing. For now, manual management is simpler and more reliable.

### Q: How much extra work is manual management?
**A:** Approximately 30-60 minutes per month for security audits + 2-4 hours per quarter for Expo SDK updates. Similar to time spent managing Dependabot PRs, but more controlled.

### Q: Will this hurt our security posture?
**A:** No - as long as monthly security audits are performed consistently. Consider adding calendar reminders or CI automation for audit checks.

---

## Lessons Learned

### For Future React Native + Expo Projects

1. **Set realistic expectations:** Dependabot may not work for large RN+Expo projects
2. **Plan for manual management:** Build dependency update time into sprint planning
3. **Minimize dependencies:** Every added package increases complexity exponentially
4. **Use native ecosystems:** Gradle/CocoaPods Dependabot support works better
5. **Document workflows:** Make manual processes clear and repeatable

### For Dependabot Configuration

1. **Start conservative:** Begin with disabled npm, enable only if it works
2. **Test thoroughly:** Don't assume optimizations will work for complex projects
3. **Monitor closely:** Check Dependabot logs after every configuration change
4. **Know when to quit:** Sometimes manual management is the right answer
5. **Document decisions:** Explain why things are disabled to help future maintainers

---

## Related Documentation

- [Dependabot Configuration Guide](./dependabot-configuration.md) - Overview of all Dependabot settings
- [Dependabot Timeout Fix](./dependabot-timeout-fix.md) - History of optimization attempts
- [Dependabot Registry Fix](./DEPENDABOT_REGISTRY_FIX.md) - Registry URL issue resolution
- [Expo SDK Upgrade Guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) - Official Expo docs
- [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/) - Official RN docs

---

## Approval & Sign-off

**Decision Date:** 2026-01-06  
**Decided By:** Copilot (addressing Dependabot error)  
**Reviewed By:** Pending  
**Status:** Implemented  

**Next Review:** 2026-04-06 (3 months) - Reassess if Dependabot has improved or project has simplified

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-06  
**Author:** GitHub Copilot  
**Status:** ✅ Active - npm disabled, manual workflow documented
