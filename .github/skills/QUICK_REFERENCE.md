# Skill Feedback Loop - Quick Reference

**Quick guide for agents using the skills feedback loop system.**

## TL;DR

**Before** using a skill: Read both `SKILL.md` and `SKILL_MEMORY.md`  
**After** using a skill: Record your experience in `SKILL_MEMORY.md`

## Using a Skill

### 1. Preparation
```bash
# Read core instructions
.github/skills/[skill-name]/SKILL.md

# Check recent learnings
.github/skills/[skill-name]/SKILL_MEMORY.md
```

### 2. Execution
- Apply guidance from SKILL.md
- Consider patterns from SKILL_MEMORY.md
- Pay attention to what works and what doesn't

### 3. Recording Feedback

Add to `SKILL_MEMORY.md` → Feedback Log section:

```markdown
### [DATE] - [SUCCESS/FAILURE/PARTIAL]

**Skill Used**: [skill-name]
**Task Context**: [Brief description of task]
**Outcome**: [What happened]
**What Worked Well**: [Effective techniques]
**What Didn't Work**: [Issues, gaps, errors]
**Key Learnings**: [Insights gained]
**Recommended Updates**: [Specific SKILL.md improvements]
**Impact Level**: [HIGH/MEDIUM/LOW]
```

## Impact Levels

- **HIGH**: Security issues, repeated failures, critical gaps → Fast action needed
- **MEDIUM**: Useful improvements, efficiency gains → Wait for patterns
- **LOW**: Edge cases, minor refinements → Accumulate before acting

## When to Update SKILL.md

✅ **DO Update** when:
- Strong pattern emerges (3+ similar feedback entries)
- Critical gap causes repeated failures
- Best practice validated across contexts
- Security issue discovered (immediate)

❌ **DON'T Update** based on:
- Single isolated incidents (unless security-critical)
- Unvalidated hunches
- Temporary workarounds
- Personal preferences

## File Relationships

```
SKILL.md          ← Long-term memory (stable, validated)
    ↑
    │ (patterns emerge)
    │
SKILL_MEMORY.md   ← Working memory (dynamic, evolving)
    ↑
    │ (feedback recorded)
    │
Your Experience   ← Actual skill usage
```

## Available Skills

- **developer-guide**: React Native/Expo, Bitcoin, cryptography, architecture
- **frontend-design**: Mobile UI/UX, design patterns, animations
- **webapp-testing**: Testing, debugging, iOS/Android workflows

## Resources

- **Full Guide**: `.github/skills/FEEDBACK_LOOP_GUIDE.md`
- **Examples**: `.github/skills/FEEDBACK_EXAMPLES.md`
- **Template**: `.github/skills/FEEDBACK_TEMPLATE.md`
- **AGENTS.md**: Main agent documentation (feedback loop section)

## Example Feedback Entry

```markdown
### 2026-01-11 18:30 - SUCCESS

**Skill Used**: frontend-design

**Task Context**: 
Created wallet card component with balance display and tap interaction.

**Outcome**:
Successfully implemented with spring animations and haptic feedback.
Users reported it feels smooth and responsive.

**What Worked Well**:
- Spring animation guidance (damping: 15, stiffness: 400) was perfect
- Haptic feedback on press adds premium feel
- 56pt minimum height ensured comfortable touch targets

**What Didn't Work**:
- No guidance on handling very long wallet names (needed truncation)
- Missing pattern for color contrast validation on custom backgrounds

**Key Learnings**:
- Text truncation is essential for mobile cards with user content
- Need to ensure text remains readable on custom wallet colors
- Combining spring animations + haptics creates delightful interactions

**Recommended Updates**:
1. Add "Handling User-Generated Content in Cards" section
2. Add color contrast validation pattern
3. Include text truncation examples

**Impact Level**: MEDIUM
```

## Remember

🧠 **Every skill usage is a learning opportunity**  
📝 **Record outcomes to help future agents**  
📈 **Skills improve through your feedback**  
🤝 **Contribute to collective intelligence**

---

**The more you contribute, the better the skills become.**
