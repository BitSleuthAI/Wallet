# Skills Directory

This directory contains specialized agent skills for BitSleuth Wallet development. Each skill is a domain expert with specific knowledge and capabilities.

## Available Skills

### 1. developer-guide
**Purpose**: Comprehensive technical guide for BitSleuth Wallet development  
**Expertise**: React Native/Expo, Bitcoin protocol, cryptography, security best practices  
**Use When**: Need guidance on architecture, conventions, Bitcoin operations, security

### 2. frontend-design
**Purpose**: Create distinctive, production-grade mobile interfaces  
**Expertise**: React Native UI/UX, mobile design patterns, animations, platform-specific design  
**Use When**: Building screens, components, or user experiences that need exceptional design quality

### 3. webapp-testing
**Purpose**: Testing and debugging React Native + Expo mobile applications  
**Expertise**: Development server management, iOS/Android testing, debugging workflows  
**Use When**: Testing app functionality, debugging UI behavior, verifying mobile-specific features

## Skill Structure

Each skill directory contains:

```
[skill-name]/
├── SKILL.md           # Core skill instructions and guidance
├── SKILL_MEMORY.md    # Learning memory from actual usage
└── README.md          # (optional) Skill overview
```

## Feedback Loop System

Skills in this directory implement a **self-learning feedback loop**:

1. **Skill Usage** → Agent invokes skill to complete a task
2. **Outcome** → Task succeeds, fails, or partially succeeds  
3. **Reflection** → Agent reflects on what worked and what didn't
4. **Recording** → Agent logs experience in `SKILL_MEMORY.md`
5. **Pattern Recognition** → Patterns emerge from accumulated feedback
6. **Evolution** → `SKILL.md` is updated based on validated patterns

### Key Files

- **`SKILL.md`**: Core instructions (stable, updated deliberately)
- **`SKILL_MEMORY.md`**: Learning buffer (dynamic, updated frequently)
- **`FEEDBACK_TEMPLATE.md`**: Template for consistent feedback recording
- **`FEEDBACK_LOOP_GUIDE.md`**: Complete system documentation

## How to Use Skills

### As an Agent

1. **Before**: Read both `SKILL.md` (core guidance) and `SKILL_MEMORY.md` (recent learnings)
2. **During**: Apply the skill's guidance to your task
3. **After**: Record your experience in `SKILL_MEMORY.md` following the template

### Recording Feedback

After using a skill, add an entry to its `SKILL_MEMORY.md`:

```markdown
### [DATE] - [SUCCESS/FAILURE/PARTIAL]

**Skill Used**: [skill-name]
**Task Context**: [What you were trying to do]
**Outcome**: [What happened]
**What Worked Well**: [Effective guidance]
**What Didn't Work**: [Gaps or issues]
**Key Learnings**: [Insights gained]
**Recommended Updates**: [Specific improvements]
**Impact Level**: [HIGH/MEDIUM/LOW]
```

See `FEEDBACK_TEMPLATE.md` for the complete template.

## Updating Skills

### Update SKILL_MEMORY.md

- ✅ After each significant skill usage
- ✅ With specific, concrete observations
- ✅ Following the feedback template
- ✅ Including both successes and failures

### Update SKILL.md

Only when:
- ✅ Strong patterns emerge from multiple feedback entries
- ✅ Critical gaps are consistently identified
- ✅ Best practices are validated across contexts
- ✅ Ecosystem changes require updates
- ✅ Security issues are discovered (immediate)

Do NOT update SKILL.md:
- ❌ Based on single incidents (unless security-critical)
- ❌ With unvalidated hunches or theories
- ❌ Using temporary workarounds
- ❌ Based on personal preference without evidence

## Philosophy

> **Skills are living, learning systems—not static documentation.**

Every skill usage is an opportunity to learn and improve. By recording outcomes and identifying patterns, skills become more effective over time. This creates institutional memory that benefits all agents.

## Resources

- **Complete Guide**: See `FEEDBACK_LOOP_GUIDE.md` for full system documentation
- **Feedback Template**: See `FEEDBACK_TEMPLATE.md` for recording format
- **AGENTS.md**: See main agent documentation for integration with workflows

## Contributing

When creating new skills:

1. Create a directory under `.github/skills/[skill-name]/`
2. Add `SKILL.md` with core instructions
3. Add `SKILL_MEMORY.md` using the template from existing skills
4. Document the skill's purpose and expertise clearly
5. Update this README with the new skill information

---

**Remember**: The power of this system comes from consistent feedback recording and thoughtful pattern recognition. Your observations today make the skills better tomorrow.
