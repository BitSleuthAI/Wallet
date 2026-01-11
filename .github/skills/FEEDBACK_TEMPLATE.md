# Skill Feedback Entry Template

Use this template to record skill usage outcomes for the learning feedback loop.

## Feedback Entry Format

```markdown
### [YYYY-MM-DD HH:MM] - [SUCCESS/FAILURE/PARTIAL]

**Skill Used**: [skill-name]

**Task Context**: 
Brief description of the task the skill was used for.

**Outcome**:
- What happened when the skill was invoked
- Were the expected results achieved?
- Any unexpected behaviors or results

**What Worked Well**:
- Techniques/approaches that were effective
- Instructions that were clear and helpful
- Successful patterns that should be reinforced

**What Didn't Work**:
- Instructions that were unclear or misleading
- Gaps in the skill's knowledge or coverage
- Errors or inefficiencies in the approach

**Key Learnings**:
- Insights gained from this usage
- Patterns to remember for future tasks
- Specific improvements needed in the skill

**Recommended Updates**:
- Specific sections of SKILL.md that should be updated
- New examples or patterns to add
- Clarifications or corrections needed

**Impact Level**: [HIGH/MEDIUM/LOW]
- HIGH: Critical learning that should immediately influence the skill
- MEDIUM: Useful insight that improves the skill
- LOW: Minor observation or edge case
```

## Usage Guidelines

1. **Record After Each Significant Skill Usage**: Document outcomes when a skill is invoked for a meaningful task
2. **Be Specific**: Include concrete examples, not vague observations
3. **Focus on Actionable Insights**: What can be learned and applied to future tasks?
4. **Consider Both Success and Failure**: Both teach valuable lessons
5. **Link to Context**: Reference PR numbers, issue numbers, or specific commits when relevant

## Example Entry

```markdown
### 2026-01-11 17:00 - SUCCESS

**Skill Used**: frontend-design

**Task Context**: 
Created a new wallet selection screen with card-based layout and smooth transitions.

**Outcome**:
Successfully implemented a modern, polished wallet selection interface with:
- Card-based layout with proper shadows
- Spring-based animations on card press
- Platform-specific touch feedback
- Proper safe area handling

**What Worked Well**:
- The gradient guidance in SKILL.md was clear and effective
- Typography scale recommendations produced readable, hierarchical text
- react-native-reanimated examples were directly applicable
- Haptic feedback integration worked seamlessly

**What Didn't Work**:
- SKILL.md didn't mention handling of long wallet names (overflow/truncation)
- Missing guidance on empty states for wallet lists
- No specific examples for grid vs list layout decisions

**Key Learnings**:
- Mobile card layouts benefit from consistent 16-24pt spacing
- Users expect immediate haptic feedback on interactive elements
- Empty states are critical for good UX but often overlooked

**Recommended Updates**:
1. Add section on text overflow handling in mobile cards
2. Include empty state design patterns (illustrations, CTAs)
3. Add decision matrix for grid vs list layouts based on content density

**Impact Level**: MEDIUM
```
