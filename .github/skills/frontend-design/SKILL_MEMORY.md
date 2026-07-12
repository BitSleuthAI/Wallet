# Frontend Design Skill Memory

This file captures learnings and feedback from using the frontend-design skill. It serves as a living memory that informs future updates to SKILL.md.

## Purpose

The frontend-design skill guides creation of distinctive, production-grade mobile interfaces for React Native + Expo. This memory file tracks:
- Design patterns that resonate with users
- Implementation challenges and solutions
- Platform-specific quirks discovered
- Visual trends and techniques that prove effective

## Core Principles

These principles guide how this skill evolves:

1. **Design Intent Over Trends**: Thoughtful design decisions beat following trends
2. **Performance Matters**: Beautiful but laggy UI fails; 60fps is non-negotiable
3. **Platform Native First**: Respect iOS/Android conventions before breaking them
4. **Accessibility is Design**: Touch targets, contrast, screen readers are core design constraints
5. **Real Device Testing**: Simulators lie; test on actual phones

## Feedback Log

### Template for New Entries
```
[YYYY-MM-DD] - [SUCCESS/FAILURE/PARTIAL] - [Impact: HIGH/MEDIUM/LOW]
Context: [What UI/screen was being designed]
Outcome: [What was created, how it performed]
Learning: [Design insights gained]
Action: [How SKILL.md should be updated, if at all]
```

### Entries

---

[2026-07-03] - SUCCESS - Impact: HIGH
Context: Brand/color unification pass across the whole app (light-mode
gradients, error boundary, toasts, skeletons, default wallet color) plus a
new transaction review sheet and shared button primitive.
Outcome: The app previously shipped two palettes at once — a Bitcoin-orange
theme in constants/themes.ts and a legacy cyan/coral set hardcoded in
components. Deriving every surface from theme tokens (and mirroring the
dark-branch gradient structure in light mode) made light and dark feel like
one product. System-appearance-driven theming (light/dark/system, default
system) replaced the manual-only toggle.
Learning: Hardcoded hex "hotspots" cluster in three places: loading/empty
fallbacks copy-pasted across screens, error/warning cards, and orphaned
"delight" components that were built against an older brand and never
imported. A grep for the legacy hex values is a fast completeness check.
Action: Emphasize "no raw hex where a theme token exists" and recommend a
single ScreenLoading-style fallback component per app.

---

[2026-07-03] - SUCCESS - Impact: MEDIUM
Context: Interaction-polish follow-up: unified press feedback across the
whole app and finished the animation-system consolidation.
Outcome: Two-tier press-feedback system — AppButton (spring scale +
haptics) for real CTAs, PressableOpacity (opacity dim) for rows and icon
buttons — gives every tap target consistent feedback without redesigning
bespoke layouts. Migrating the last legacy Animated code to Reanimated
means one animation vocabulary (shared values + withTiming/withSpring)
across splash, tab transitions, charts, and list rows.
Learning: A mechanical drop-in wrapper (PressableOpacity) converts a large
legacy surface safely; reserving the expressive primitive (AppButton) for
deliberate CTAs keeps visual hierarchy meaningful.
Action: Document the two-tier press-feedback convention as the default
pattern for new screens.

---

## Pattern Recognition

As feedback accumulates, look for:
- **Delightful Patterns**: UI techniques that consistently impress → promote in SKILL.md
- **Performance Pitfalls**: Design choices that cause jank → warn against in SKILL.md
- **Platform Friction**: Patterns that fight iOS/Android conventions → document better approaches
- **Accessibility Wins**: Techniques that improve usability → emphasize in SKILL.md
- **2025 Evolution**: As mobile design evolves → keep skill current

## Design Decisions Archive

Track significant design decisions and their outcomes:

**None yet** - Will be populated with real design choices and results

## Pending SKILL.md Updates

Track recommended updates here before they're applied:

**None yet** - Will be populated based on feedback patterns

## Changelog of Memory-Driven Updates

Track when learnings from this memory file resulted in SKILL.md changes:

**None yet** - This is the initial version

---

## Usage Notes for Agents

When you use the frontend-design skill:
1. After implementing a UI, document how well the guidance worked
2. Note any design decisions that deviated from SKILL.md and why
3. Record user feedback or performance issues if available
4. Track which examples/patterns from SKILL.md were most useful
5. Propose specific improvements to design guidance based on real outcomes

## Mobile-Specific Learnings to Watch For

Pay special attention to feedback about:
- **Touch Interactions**: Did 44pt minimum feel right? Any gesture conflicts?
- **Typography**: Were the size recommendations readable on actual devices?
- **Animations**: Did spring physics feel natural? Any jank detected?
- **Dark Mode**: Did the color systems work well in both themes?
- **Platform Differences**: Where did iOS and Android require different approaches?

The skill memory evolves mobile design thinking through practice, not theory.
