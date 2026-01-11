# Skills Feedback Loop System

## Overview

The Skills Feedback Loop System enables skills to learn and evolve based on actual usage outcomes. Instead of static instruction files, skills become living, adaptive systems that improve through reflection on successes and failures.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Skill Usage Cycle                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  1. Agent Invokes Skill      │
            │     (developer-guide,         │
            │      frontend-design, etc.)   │
            └──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  2. Skill Executes Task      │
            │     (guided by SKILL.md)     │
            └──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  3. Outcome Observed         │
            │     SUCCESS / FAILURE /      │
            │     PARTIAL                  │
            └──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  4. Reflection & Recording   │
            │     - What worked?           │
            │     - What didn't?           │
            │     - What was learned?      │
            └──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  5. Record in SKILL_MEMORY   │
            │     (structured feedback)    │
            └──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  6. Pattern Recognition      │
            │     - Repeated successes     │
            │     - Repeated failures      │
            │     - Common gaps            │
            └──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  7. Skill Evolution          │
            │     Update SKILL.md based    │
            │     on validated patterns    │
            └──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  8. Improved Future Usage    │
            │     (cycle continues)        │
            └──────────────────────────────┘
```

## File Structure

Each skill has three key files:

```
.github/skills/[skill-name]/
├── SKILL.md           # Core skill instructions (edited carefully)
├── SKILL_MEMORY.md    # Learning memory (frequently updated)
└── README.md          # (optional) Skill overview
```

Plus a shared template:

```
.github/skills/
└── FEEDBACK_TEMPLATE.md   # Template for consistent feedback
```

### SKILL.md - The Core Instructions

- **Purpose**: Contains the primary instructions and guidance for the skill
- **Update Frequency**: Infrequently, based on validated patterns from SKILL_MEMORY.md
- **Update Process**: Changes should be deliberate, based on strong evidence from multiple feedback entries
- **Stability**: Should remain relatively stable to avoid confusion

### SKILL_MEMORY.md - The Learning Buffer

- **Purpose**: Captures raw feedback, learnings, and observations from skill usage
- **Update Frequency**: After each significant skill usage
- **Update Process**: Agents append feedback entries following the template
- **Evolution**: Accumulates knowledge, identifies patterns, proposes SKILL.md updates

### Relationship

```
SKILL.md ← validates and synthesizes ← SKILL_MEMORY.md ← records ← Actual Usage
   │                                           │
   │ (slow, deliberate updates)                │ (fast, continuous recording)
   │                                           │
   └─── guides ──────────────────────────────┘
```

## How Agents Use This System

### During Skill Execution

1. **Read SKILL.md**: Get core instructions for the task
2. **Read SKILL_MEMORY.md**: Check recent learnings and known patterns
3. **Execute Task**: Apply guidance from both files
4. **Observe Outcome**: Success, failure, or partial success?

### After Skill Execution

1. **Reflect on Outcome**:
   - What was the task?
   - What worked well?
   - What didn't work?
   - What was learned?

2. **Record in SKILL_MEMORY.md**:
   - Add a feedback entry to the Feedback Log section
   - Use the template format for consistency
   - Be specific with examples and observations
   - Assign impact level (HIGH/MEDIUM/LOW)

3. **Look for Patterns** (if multiple entries exist):
   - Do you see repeated successes or failures?
   - Are there common gaps in the skill's coverage?
   - Should anything be elevated to SKILL.md?

4. **Propose Updates** (if warranted):
   - Add specific recommendations to "Pending SKILL.md Updates"
   - Don't edit SKILL.md directly yet—let patterns accumulate
   - High-impact learnings may warrant faster updates

### When to Update SKILL.md

Update SKILL.md when:
- **Strong Pattern Emerges**: Multiple feedback entries point to the same issue/success
- **Critical Gap Found**: Missing guidance causes repeated failures
- **Best Practice Validated**: A technique succeeds consistently across different contexts
- **Ecosystem Changes**: React Native, Expo, Bitcoin libraries evolve
- **Security Issue**: Any security-related learning should be promoted immediately

Do NOT update SKILL.md based on:
- Single isolated incidents (unless security-critical)
- Unvalidated hunches or theories
- Temporary workarounds
- Personal preferences without evidence

## Feedback Entry Template

Reference `.github/skills/FEEDBACK_TEMPLATE.md` for the complete template. Key components:

```markdown
### [DATE] - [SUCCESS/FAILURE/PARTIAL]

**Skill Used**: [skill-name]

**Task Context**: 
[Brief description]

**Outcome**:
[What happened]

**What Worked Well**:
[Effective techniques]

**What Didn't Work**:
[Issues, gaps, errors]

**Key Learnings**:
[Insights gained]

**Recommended Updates**:
[Specific SKILL.md improvements]

**Impact Level**: [HIGH/MEDIUM/LOW]
```

## Example Workflow

### Example: Frontend Design Skill

**Scenario**: Agent uses frontend-design skill to create a new transaction details screen.

**Step 1 - Before**: Agent reads `SKILL.md` and `SKILL_MEMORY.md`
- SKILL.md provides: Typography scale, color systems, animation guidelines
- SKILL_MEMORY.md shows: Recent pattern that users expect haptic feedback on copy actions

**Step 2 - During**: Agent implements the screen
- Applies SKILL.md guidance on layout and visual design
- Incorporates SKILL_MEMORY.md insight about haptic feedback for copy buttons

**Step 3 - After**: Agent reflects on outcome

The implementation worked well overall, but:
- Typography recommendations were perfect for titles but body text at 16pt felt cramped for transaction hashes
- Haptic feedback was well-received
- Discovered that monospace fonts are essential for transaction hashes (not mentioned in SKILL.md)

**Step 4 - Record**: Agent adds to `frontend-design/SKILL_MEMORY.md`:

```markdown
### 2026-01-11 18:30 - SUCCESS

**Skill Used**: frontend-design

**Task Context**: 
Created transaction details screen with hash display, amount, confirmations, timestamp.

**Outcome**:
Screen implemented successfully with positive user feedback. Visual hierarchy clear, 
interactions smooth. Transaction hash display needed specific considerations not in SKILL.md.

**What Worked Well**:
- Typography scale worked perfectly for titles and labels
- Spring animations for screen transitions felt natural
- Color system provided good contrast for transaction states (pending/confirmed/failed)
- Haptic feedback on copy actions (from previous SKILL_MEMORY insight)

**What Didn't Work**:
- Body text size (16pt) felt cramped for 64-character transaction hashes
- No guidance in SKILL.md about monospace font requirements for technical data
- Missing pattern for "copy to clipboard" visual feedback

**Key Learnings**:
- Transaction hashes, addresses, and other technical Bitcoin data MUST use monospace fonts
- Technical data benefits from slightly smaller font size (14pt) to fit more characters
- Copy actions should have: 1) haptic feedback, 2) visual confirmation, 3) temporary state change
- Bitcoin data has unique display requirements not covered by general mobile design patterns

**Recommended Updates**:
1. Add section to SKILL.md: "Displaying Technical/Monospace Data"
   - When to use monospace fonts
   - Recommended size adjustments for long technical strings
   - Examples: transaction hashes, addresses, private keys
2. Add pattern: "Copy to Clipboard Interactions"
   - Haptic + visual + temporal feedback
   - Example implementation with react-native-reanimated
3. Update typography guidance to note exceptions for technical data

**Impact Level**: MEDIUM
```

**Step 5 - Pattern Recognition**: 
If future entries also highlight monospace font needs, this becomes a strong pattern worthy of SKILL.md update.

**Step 6 - Eventual SKILL.md Update**:
After 3-4 similar feedback entries about technical data display, update SKILL.md with new section on monospace typography for technical content.

## Benefits of This System

### 1. Continuous Improvement
- Skills get better with every use
- Learnings compound over time
- Agents benefit from collective experience

### 2. Evidence-Based Evolution
- Changes based on real outcomes, not speculation
- Patterns validated through multiple uses
- Strong signal-to-noise ratio

### 3. Institutional Memory
- Knowledge persists across agent sessions
- No need to re-learn the same lessons
- Historical context preserved

### 4. Balanced Stability
- SKILL.md stays stable (reduces confusion)
- SKILL_MEMORY.md captures variation (allows exploration)
- Updates happen when justified by evidence

### 5. Collaborative Learning
- Multiple agents contribute to the same skills
- Diverse perspectives improve coverage
- Cross-pollination of insights

## Best Practices

### For Recording Feedback

**DO**:
- ✅ Record feedback promptly after skill usage
- ✅ Be specific with examples and context
- ✅ Include both successes and failures
- ✅ Link to concrete artifacts (PRs, commits, files)
- ✅ Assign realistic impact levels
- ✅ Propose actionable updates

**DON'T**:
- ❌ Record vague or generic observations
- ❌ Only record failures (successes teach too!)
- ❌ Copy-paste without customization
- ❌ Inflate impact levels
- ❌ Propose changes without evidence

### For Updating Skills

**DO**:
- ✅ Wait for patterns to emerge (unless security-critical)
- ✅ Validate across multiple contexts
- ✅ Update SKILL.md deliberately
- ✅ Document why updates were made
- ✅ Keep both files synchronized in purpose

**DON'T**:
- ❌ Update SKILL.md based on single incidents
- ❌ Make massive changes all at once
- ❌ Delete SKILL_MEMORY.md entries (they're historical record)
- ❌ Ignore repeated patterns in SKILL_MEMORY.md
- ❌ Let SKILL_MEMORY.md grow indefinitely without synthesis

## Maintenance Guidelines

### Weekly Review (Recommended)
- Review new SKILL_MEMORY.md entries
- Identify emerging patterns
- Promote validated learnings to "Pending Updates"
- Discuss high-impact feedback

### Monthly Synthesis (Recommended)
- Review "Pending Updates" across all skills
- Update SKILL.md files with validated improvements
- Archive old SKILL_MEMORY.md entries if needed (keep recent + important)
- Document changes in "Changelog of Memory-Driven Updates"

### Quarterly Retrospective (Optional)
- Assess overall skill effectiveness
- Identify skills that need major revisions
- Consider new skills based on recurring needs
- Review and refine the feedback process itself

## Metrics for Success

Track these indicators to measure feedback loop effectiveness:

1. **Feedback Volume**: Are agents consistently recording outcomes?
2. **Pattern Recognition**: Are patterns emerging from SKILL_MEMORY.md?
3. **SKILL.md Evolution**: Are skills being updated based on evidence?
4. **Task Success Rate**: Are skills becoming more effective over time?
5. **Coverage Gaps Closed**: Are identified gaps being addressed?

## Future Enhancements

Potential improvements to this system:

- **Automated Pattern Detection**: Scripts to analyze SKILL_MEMORY.md and suggest updates
- **Cross-Skill Learning**: Insights from one skill informing another
- **Version Control**: Track SKILL.md changes alongside the feedback that triggered them
- **Impact Measurement**: Quantify improvement from skill updates
- **Search & Retrieval**: Tools to query historical feedback for similar scenarios

---

**The skills feedback loop transforms static documentation into living, learning systems. Each iteration makes the skills—and the agents using them—more effective.**
