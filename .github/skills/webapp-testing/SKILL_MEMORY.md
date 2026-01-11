# WebApp Testing Skill Memory

This file captures learnings and feedback from using the webapp-testing skill. It serves as a living memory that informs future updates to SKILL.md.

## Purpose

The webapp-testing skill enables testing and debugging of React Native + Expo mobile apps. This memory file tracks:
- Testing approaches that catch bugs effectively
- Common issues and their reliable solutions
- Platform-specific testing challenges
- Workflow improvements discovered through use

## Core Principles

These principles guide how this skill evolves:

1. **Real Devices Reveal Truth**: Emulators miss native module bugs
2. **Reproducibility Matters**: If a bug can't be reproduced reliably, the test approach failed
3. **Fast Feedback Loops**: Faster testing cycles improve development velocity
4. **Security Testing Priority**: For a Bitcoin wallet, security tests are non-negotiable
5. **Both Platforms Always**: iOS-only or Android-only testing misses critical bugs

## Feedback Log

### Template for New Entries
```
[YYYY-MM-DD] - [SUCCESS/FAILURE/PARTIAL] - [Impact: HIGH/MEDIUM/LOW]
Context: [What was being tested]
Outcome: [Test results, bugs found/missed]
Learning: [Testing insights gained]
Action: [How SKILL.md should be updated, if at all]
```

### Entries

---

**Awaiting first feedback entry...**

When the webapp-testing skill is used to test mobile app functionality, outcomes should be recorded here. Track what testing approaches work, what breaks, and how to test more effectively.

---

## Pattern Recognition

As feedback accumulates, look for:
- **Reliable Bug Catchers**: Test approaches that consistently find issues → promote in SKILL.md
- **False Confidence**: Tests that pass but miss real bugs → document limitations in SKILL.md
- **Time Savers**: Workflow optimizations that speed up testing → add to SKILL.md
- **Platform Traps**: Platform-specific issues that need specific test approaches → document in SKILL.md
- **Tool Evolution**: As Expo/React Native testing tools evolve → update SKILL.md

## Known Issues Archive

Track recurring issues and their solutions:

**None yet** - Will be populated with actual testing challenges encountered

## Testing Workflow Improvements

Track discovered workflow optimizations:

**None yet** - Will be populated based on real testing experiences

## Pending SKILL.md Updates

Track recommended updates here before they're applied:

**None yet** - Will be populated based on feedback patterns

## Changelog of Memory-Driven Updates

Track when learnings from this memory file resulted in SKILL.md changes:

**None yet** - This is the initial version

---

## Usage Notes for Agents

When you use the webapp-testing skill:
1. Document which testing approaches were attempted and their effectiveness
2. Record bugs that were caught vs bugs that were missed
3. Note any platform-specific testing challenges encountered
4. Track Metro bundler issues and their solutions
5. Document any new testing patterns or scripts that proved useful

## Testing Scenarios to Watch For

Pay special attention to feedback about:
- **Native Module Testing**: Did biometric/camera/secure storage tests work as expected?
- **Network Conditions**: How well did offline/poor connection tests work?
- **Bitcoin Operations**: Were wallet/transaction tests safe and effective?
- **Build Issues**: Which iOS/Android build problems were most common?
- **Performance Testing**: What techniques effectively measured app performance?

The skill memory evolves mobile testing practices through empirical validation.
