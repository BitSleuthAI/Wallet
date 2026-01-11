# Getting Started with Skills Feedback Loop

**Quick start guide for agents to begin using the feedback loop system immediately.**

## What Is This?

The Skills Feedback Loop is a self-improving knowledge system. When you use a skill (like `developer-guide`, `frontend-design`, or `webapp-testing`), you record what worked and what didn't. Over time, skills learn from these experiences and become more effective.

## Quick Start (3 Steps)

### Step 1: Use a Skill

When you need to perform a task, check if a skill can help:

```bash
# Available skills:
.github/skills/developer-guide/     # React Native, Bitcoin, architecture
.github/skills/frontend-design/     # Mobile UI/UX, design patterns
.github/skills/webapp-testing/      # Testing, debugging, workflows
```

**Before using:** Read both files:
1. `SKILL.md` - Core instructions
2. `SKILL_MEMORY.md` - Recent learnings

### Step 2: Complete Your Task

Apply the guidance and pay attention to:
- What techniques worked well
- What was unclear or missing
- What problems you encountered
- What you learned

### Step 3: Record Feedback (5 minutes)

After completing your task, add an entry to `SKILL_MEMORY.md`:

Open the file:
```bash
.github/skills/[skill-name]/SKILL_MEMORY.md
```

Add to the **Feedback Log** section:

```markdown
### 2026-01-11 18:30 - SUCCESS

**Skill Used**: frontend-design

**Task Context**: 
Created wallet card component with balance and tap interaction.

**Outcome**:
Component works great. Spring animations feel natural, haptic feedback 
is perfect. One issue: long wallet names overflow the card.

**What Worked Well**:
- Spring animation guidance (damping: 15, stiffness: 400)
- Haptic feedback example was directly applicable
- Touch target size recommendations (56pt min)

**What Didn't Work**:
- No guidance on text truncation for long user-generated names
- Missing color contrast validation for custom backgrounds

**Key Learnings**:
- Always use Text.ellipsizeMode for user-generated content
- Custom wallet colors need contrast validation for readability
- react-native-reanimated is much better than Animated API

**Recommended Updates**:
1. Add "Handling User-Generated Content in Cards" section
2. Add color contrast validation pattern
3. Include text truncation examples

**Impact Level**: MEDIUM
```

**That's it!** You've contributed to making the skill better.

## What Happens Next?

### Your Feedback is Valuable

1. **Immediate**: Other agents can read your feedback in `SKILL_MEMORY.md`
2. **Short-term**: If 2-3 agents report the same issue, a pattern emerges
3. **Long-term**: Validated patterns get promoted to `SKILL.md` as improved guidance

### You Benefit Too

Next time you (or another agent) use the skill:
- `SKILL_MEMORY.md` shows recent learnings from others
- `SKILL.md` has been improved based on validated patterns
- You avoid problems others already encountered

## Impact Levels Explained

**HIGH** - Needs fast action:
- Security vulnerabilities
- Repeated failures causing significant delays
- Critical gaps in skill coverage

**MEDIUM** - Wait for pattern (3+ similar reports):
- Useful improvements
- Efficiency gains
- Missing examples or clarifications

**LOW** - Accumulate (5+ reports needed):
- Edge cases
- Minor refinements
- Nice-to-have additions

## Common Questions

### Q: How long should I spend on feedback?

**A:** 3-5 minutes. Be brief but specific. A few concrete examples beat lengthy vague observations.

### Q: Should I record every single skill usage?

**A:** Record significant uses where you learned something or encountered issues. Skip trivial or repeated tasks.

### Q: What if I'm not sure if something should be in SKILL.md?

**A:** Record it in `SKILL_MEMORY.md` with your best impact level guess. The pattern recognition process will determine if it's worth promoting.

### Q: Can I update SKILL.md directly?

**A:** Generally no. Let feedback accumulate and patterns emerge first. Exception: security issues get immediate updates.

### Q: What if I disagree with existing guidance?

**A:** Record your experience in `SKILL_MEMORY.md`. If your approach succeeds and others validate it, the guidance will evolve.

## Examples

### Example 1: Quick Success

You used `developer-guide` to implement Bitcoin transaction signing. Everything worked perfectly following the examples.

**Do this:**
```markdown
### 2026-01-11 - SUCCESS

**Skill Used**: developer-guide
**Task Context**: Implemented transaction signing with bitcoinjs-lib
**Outcome**: Perfect! Examples were clear and complete.
**What Worked Well**: Step-by-step signing example, error handling guidance
**What Didn't Work**: N/A
**Key Learnings**: Following the pattern exactly = zero issues
**Recommended Updates**: None needed
**Impact Level**: LOW
```

**Why record a success?** It validates that the guidance is working. If many agents succeed with the same guidance, we know it's good.

### Example 2: Partial Success with Learning

You used `frontend-design` to create a screen. Design looks good but you discovered the guidance on animations was unclear.

**Do this:**
```markdown
### 2026-01-11 - PARTIAL

**Skill Used**: frontend-design
**Task Context**: Created transaction history screen with animations
**Outcome**: Screen works but animation setup took 2 hours (should've been 30 min)
**What Worked Well**: Layout guidance, color system
**What Didn't Work**: Animation example assumed knowledge of Reanimated v4 API
**Key Learnings**: Need clearer imports and hook setup for animations
**Recommended Updates**: Add complete animation example with all imports
**Impact Level**: MEDIUM
```

### Example 3: Clear Failure

You used `webapp-testing` to test biometrics. Simulator tests gave false positives; real device showed the failures.

**Do this:**
```markdown
### 2026-01-11 - FAILURE

**Skill Used**: webapp-testing
**Task Context**: Tested Face ID authentication flow
**Outcome**: Tests passed on simulator but failed on device. Wasted 3 hours.
**What Worked Well**: Metro bundler troubleshooting section
**What Didn't Work**: Guidance said "simulator or device" for biometric testing
**Key Learnings**: Biometric testing REQUIRES physical device. Simulators unreliable.
**Recommended Updates**: Add critical warning: biometric features MUST test on real devices
**Impact Level**: HIGH
```

## Resources

| Document | Purpose | When to Use |
|----------|---------|-------------|
| `QUICK_REFERENCE.md` (this file) | Get started quickly | First time using system |
| `FEEDBACK_TEMPLATE.md` | Feedback entry format | When recording feedback |
| `FEEDBACK_EXAMPLES.md` | Realistic examples | Need inspiration for entries |
| `FEEDBACK_LOOP_GUIDE.md` | Complete system guide | Deep dive into how it works |
| `VISUAL_ARCHITECTURE.md` | System diagrams | Understanding the architecture |
| `README.md` | Skills directory overview | High-level understanding |

## Best Practices

### ✅ DO:
- Record feedback promptly (while details are fresh)
- Be specific with examples
- Include both successes and failures
- Assign realistic impact levels
- Propose actionable improvements

### ❌ DON'T:
- Write vague observations ("it was hard")
- Only record failures (successes matter too!)
- Inflate impact levels
- Make changes to SKILL.md without pattern validation
- Skip recording significant learnings

## The Bigger Picture

Every feedback entry you write:
- ✨ Helps the next agent work more efficiently
- 📚 Builds institutional knowledge
- 🎯 Identifies gaps in guidance
- 🔄 Drives continuous improvement
- 🤝 Creates collective intelligence

**Your 5 minutes of reflection can save hours for others.**

---

## Ready to Start?

1. Pick a skill relevant to your task
2. Read `SKILL.md` and `SKILL_MEMORY.md`
3. Complete your task
4. Record your experience (use template above)
5. Continue your work

**That's all there is to it. Welcome to the feedback loop!** 🎉
