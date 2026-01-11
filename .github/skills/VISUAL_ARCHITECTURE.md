# Skills Feedback Loop - Visual Architecture

This document provides visual diagrams of the feedback loop system architecture.

## System Overview Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                     SKILLS FEEDBACK LOOP SYSTEM                       │
│                   Living, Self-Improving Knowledge Base               │
└───────────────────────────────────────────────────────────────────────┘

                              Agent Uses Skill
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         ┌──────────────────────┐        ┌──────────────────────┐
         │     SKILL.md         │        │   SKILL_MEMORY.md    │
         │                      │        │                      │
         │ • Core Instructions  │        │ • Recent Learnings   │
         │ • Stable Guidance    │        │ • Feedback Entries   │
         │ • Validated Patterns │        │ • Emerging Patterns  │
         │                      │        │ • Pending Updates    │
         │ [Long-term Memory]   │        │ [Working Memory]     │
         └──────────┬───────────┘        └──────────┬───────────┘
                    │                               │
                    └───────────┬───────────────────┘
                                │
                                ▼
                      ┌──────────────────┐
                      │  Agent Executes  │
                      │      Task        │
                      └─────────┬────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
            ┌──────────────┐        ┌──────────────┐
            │   SUCCESS    │        │   FAILURE    │
            │      or      │        │      or      │
            │   PARTIAL    │        │   PARTIAL    │
            └──────┬───────┘        └──────┬───────┘
                   │                       │
                   └───────────┬───────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Agent Reflects:    │
                    │  • What worked?     │
                    │  • What didn't?     │
                    │  • What learned?    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Record in           │
                    │ SKILL_MEMORY.md     │
                    │ (Feedback Entry)    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
          Multiple uses accumulate        │
                    │                     │
                    ▼                     ▼
         ┌────────────────────┐  ┌────────────────────┐
         │  Patterns Emerge   │  │  Single Instance   │
         │                    │  │  (No pattern yet)  │
         │ • Repeated success │  └────────────────────┘
         │ • Repeated failure │
         │ • Common gaps      │
         └─────────┬──────────┘
                   │
                   ▼
         ┌────────────────────┐
         │ Pattern Validated  │
         │ Across Multiple    │
         │ Contexts           │
         └─────────┬──────────┘
                   │
                   ▼
         ┌────────────────────┐
         │  Update SKILL.md   │
         │  with Validated    │
         │  Improvement       │
         └─────────┬──────────┘
                   │
                   ▼
         ┌────────────────────┐
         │ Improved Guidance  │
         │ for Future Uses    │
         └────────────────────┘
                   │
                   └──────────────► (Cycle Continues)
```

## File Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    .github/skills/                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  README.md ─────────────────┐                                  │
│  FEEDBACK_TEMPLATE.md       │                                  │
│  FEEDBACK_LOOP_GUIDE.md     ├──► Documentation & Guidance      │
│  FEEDBACK_EXAMPLES.md       │                                  │
│  QUICK_REFERENCE.md ────────┘                                  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ developer-guide/                                       │   │
│  │                                                        │   │
│  │   SKILL.md ◄──────────┐                               │   │
│  │   (Core Instructions)  │                               │   │
│  │                        │                               │   │
│  │   SKILL_MEMORY.md      │                               │   │
│  │   (Learning Buffer) ───┘                               │   │
│  │   • Feedback entries                                   │   │
│  │   • Pattern recognition                                │   │
│  │   • Pending updates                                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ frontend-design/                                       │   │
│  │                                                        │   │
│  │   SKILL.md ◄──────────┐                               │   │
│  │   (Core Instructions)  │                               │   │
│  │                        │                               │   │
│  │   SKILL_MEMORY.md      │                               │   │
│  │   (Learning Buffer) ───┘                               │   │
│  │   • Design outcomes                                    │   │
│  │   • UI/UX learnings                                    │   │
│  │   • Platform insights                                  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ webapp-testing/                                        │   │
│  │                                                        │   │
│  │   SKILL.md ◄──────────┐                               │   │
│  │   (Core Instructions)  │                               │   │
│  │                        │                               │   │
│  │   SKILL_MEMORY.md      │                               │   │
│  │   (Learning Buffer) ───┘                               │   │
│  │   • Testing approaches                                 │   │
│  │   • Debug workflows                                    │   │
│  │   • Platform issues                                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                              │
                              ▼
                 ┌────────────────────────┐
                 │      AGENTS.md         │
                 │                        │
                 │  • Feedback loop guide │
                 │  • Agent instructions  │
                 │  • Integration docs    │
                 └────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │ docs/                  │
                 │                        │
                 │ SKILLS_FEEDBACK_LOOP_  │
                 │ SUMMARY.md             │
                 │                        │
                 │ • Implementation       │
                 │   summary              │
                 │ • Benefits & metrics   │
                 └────────────────────────┘
```

## Information Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    INFORMATION FLOW                              │
└──────────────────────────────────────────────────────────────────┘

SKILL USAGE CYCLE:

Agent Task ──┐
             │
             ▼
       Read SKILL.md
       (Get Core Guidance)
             │
             ▼
       Read SKILL_MEMORY.md
       (Check Recent Learnings)
             │
             ▼
       Execute Task
       (Apply Guidance)
             │
             ▼
       Observe Outcome
       (Success/Failure/Partial)
             │
             ▼
       Reflect on Experience
       (What worked? What didn't?)
             │
             ▼
       Record in SKILL_MEMORY.md
       (Structured Feedback Entry)
             │
             └──────────┐
                        │
                        ▼
                SKILL_MEMORY.md
                        │
                        │ (Accumulates over time)
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
      No Pattern Yet      Pattern Emerges
      (Keep recording)    (3+ similar entries)
                                  │
                                  ▼
                          Validate Pattern
                          (Multiple contexts)
                                  │
                                  ▼
                          Update SKILL.md
                          (Improve guidance)
                                  │
                                  ▼
                          Better Outcomes
                          (Next cycle)
```

## Feedback Entry Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│               FEEDBACK ENTRY LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

1. CREATION
   ─────────
   Agent completes task using skill
          │
          ▼
   Creates feedback entry in SKILL_MEMORY.md
   (Date, Context, Outcome, Learnings, Impact Level)


2. ACCUMULATION
   ────────────
   Multiple feedback entries collected over time
          │
          ▼
   Entry #1: Issue with fee estimation
   Entry #2: Same issue with fee estimation
   Entry #3: Fee estimation problem again
   Entry #4: Different feature works well
   Entry #5: Fee estimation still challenging


3. PATTERN RECOGNITION
   ───────────────────
   Review SKILL_MEMORY.md for patterns
          │
          ▼
   PATTERN IDENTIFIED:
   - Fee estimation guidance inadequate
   - 3+ entries report same issue
   - HIGH impact on development time


4. VALIDATION
   ──────────
   Confirm pattern across different contexts
          │
          ▼
   ✓ Multiple agents experienced it
   ✓ Different use cases
   ✓ Consistent feedback
   ✓ Impact confirmed


5. SKILL EVOLUTION
   ───────────────
   Update SKILL.md with improvement
          │
          ▼
   Add: "Fee Estimation Best Practices"
   - Concrete examples
   - Retry logic
   - Caching patterns


6. DOCUMENTATION
   ─────────────
   Document the change
          │
          ▼
   Update "Changelog of Memory-Driven Updates"
   in SKILL_MEMORY.md


7. VALIDATION OF FIX
   ─────────────────
   Future uses validate the improvement
          │
          ▼
   New feedback entries show:
   ✓ Fee estimation now easier
   ✓ Fewer issues reported
   ✓ Better outcomes
```

## Cross-Skill Pattern Recognition

```
┌─────────────────────────────────────────────────────────────────┐
│           CROSS-SKILL PATTERN RECOGNITION                       │
└─────────────────────────────────────────────────────────────────┘

developer-guide/SKILL_MEMORY.md
    │
    ├─ Entry: Bitcoin address validation unclear
    ├─ Entry: Missing testnet address handling
    ├─ Entry: Confusion about address types
    │
    ▼
 Pattern: Address validation issues (3 entries)


frontend-design/SKILL_MEMORY.md
    │
    ├─ Entry: How to display different address types?
    ├─ Entry: User confusion with address formats
    │
    ▼
 Pattern: Address display/UX issues (2 entries)


webapp-testing/SKILL_MEMORY.md
    │
    ├─ Entry: Address validation tests failing
    ├─ Entry: QR scanner accepting invalid addresses
    │
    ▼
 Pattern: Testing address validation (2 entries)

                    │
                    │ (7 total entries across 3 skills)
                    ▼
            ┌───────────────────┐
            │  CROSS-SKILL      │
            │  PATTERN          │
            │  IDENTIFIED       │
            │                   │
            │  "Bitcoin Address │
            │   Validation"     │
            │                   │
            │  Impact: HIGH     │
            └─────────┬─────────┘
                      │
                      ▼
            ┌───────────────────┐
            │  COORDINATED      │
            │  UPDATES          │
            └─────────┬─────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   Update        Update        Update
   developer-    frontend-     webapp-
   guide         design        testing
   SKILL.md      SKILL.md      SKILL.md
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
            ┌───────────────────┐
            │  Possibly Create  │
            │  Shared Resource: │
            │                   │
            │  docs/BITCOIN_    │
            │  ADDRESS_         │
            │  VALIDATION.md    │
            └───────────────────┘
```

## Impact Level Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                  IMPACT LEVEL DECISION TREE                     │
└─────────────────────────────────────────────────────────────────┘

Feedback Entry Created
         │
         ▼
Is it a security issue?
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ▼         ▼
 Impact:   Does it cause repeated failures?
  HIGH          │
                │
           ┌────┴────┐
           │         │
          YES       NO
           │         │
           ▼         ▼
        Impact:   Is it a critical gap affecting
         HIGH     multiple developers?
                       │
                  ┌────┴────┐
                  │         │
                 YES       NO
                  │         │
                  ▼         ▼
               Impact:   Does it provide useful
                HIGH     improvement/efficiency gain?
                              │
                         ┌────┴────┐
                         │         │
                        YES       NO
                         │         │
                         ▼         ▼
                      Impact:   Impact:
                      MEDIUM     LOW


ACTION BASED ON IMPACT:

HIGH Impact
  │
  └─► • Immediate attention
      • Update SKILL.md after 1-2 similar reports
      • Document thoroughly
      • Alert other agents

MEDIUM Impact
  │
  └─► • Wait for pattern (3+ entries)
      • Validate across contexts
      • Update SKILL.md when confirmed
      • Standard documentation

LOW Impact
  │
  └─► • Accumulate feedback
      • Wait for 5+ similar entries
      • Update only if pattern persists
      • May remain in SKILL_MEMORY only
```

## System Benefits Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM BENEFITS                              │
└─────────────────────────────────────────────────────────────────┘

TIME ──────────────────────────────────────────────────────────►

Without Feedback Loop:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Static SKILL.md
    │
    ├─ Agent A struggles with issue
    ├─ Agent B struggles with same issue
    ├─ Agent C struggles with same issue
    ├─ Documentation never improves
    └─ Knowledge lost between sessions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


With Feedback Loop:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Evolving SKILL.md + SKILL_MEMORY.md
    │
    ├─ Agent A struggles, records feedback (Entry #1)
    │
    ├─ Agent B struggles, records feedback (Entry #2)
    │
    ├─ Pattern recognized after Entry #3
    │
    ├─ SKILL.md updated with solution
    │
    ├─ Agent C succeeds easily (improved guidance)
    │
    ├─ Agent D succeeds easily (improved guidance)
    │
    └─ Continuous improvement, knowledge persists
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


Efficiency Gains:

 Task Success Rate
 ↑
 │                                      ┌────────────
 │                                   ┌──┘ (Skills improve)
 │                              ┌────┘
 │                         ┌────┘
 │                    ┌────┘ (Patterns identified)
 │               ┌────┘
 │          ┌────┘ (Feedback accumulates)
 │     ┌────┘
 │─────┘ (Initial state)
 │
 └─────────────────────────────────────────────────────► Time
```

---

These diagrams illustrate how the Skills Feedback Loop System creates a self-improving knowledge base through structured feedback collection, pattern recognition, and evidence-based evolution.
