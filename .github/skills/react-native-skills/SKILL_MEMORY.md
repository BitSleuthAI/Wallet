# React Native Skills Memory

This file captures learnings and feedback from applying the react-native-skills rules. It serves as a living memory that informs future updates to SKILL.md (see AGENTS.md for the feedback loop).

## Feedback Log

### Template for New Entries
```
[YYYY-MM-DD] - [SUCCESS/FAILURE/PARTIAL] - [Impact: HIGH/MEDIUM/LOW]
Context: [What was being built/changed]
Outcome: [What happened]
Learning: [Insights gained]
Action: [How SKILL.md should be updated, if at all]
```

### Entries

---

[2026-07-03] - SUCCESS - Impact: HIGH
Context: App-wide visual + performance revamp (theme extraction, formSheet
modals, AppButton primitive, send-flow review sheet, list virtualization).
Outcome: Rules §9.3 (Pressable over TouchableOpacity) and §9.7 (native
formSheet modals) were directly applicable and produced noticeably better
UX: the new `components/AppButton.tsx` is Pressable-based with Reanimated
spring feedback, and five bare `animationType="slide"` JS modals (settings
currency/auto-lock/wallet pickers, home + manage-wallets edit dialogs) plus
the new send review sheet now use `presentationStyle="formSheet"`.
Learning: When converting a transparent JS overlay modal to formSheet, the
`transparent` prop and the manual dark overlay View must both be removed,
and the content container becomes the sheet root (flex: 1, themed
background). Selection rows benefit from a HapticService.light() call.
Legacy screens still use TouchableOpacity extensively; converting only
high-traffic CTAs first kept the diff reviewable.
Action: SKILL.md could add a short "converting existing JS modals to
formSheet" checklist (remove transparent + overlay wrapper; flex: 1 root;
onRequestClose still required for Android back).

---

## Pending SKILL.md Updates

- Consider a migration checklist for JS `<Modal transparent>` → `presentationStyle="formSheet"` (see 2026-07-03 entry).

## Changelog of Memory-Driven Updates

**None yet** - This is the initial version
