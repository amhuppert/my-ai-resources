# Iteration Workflow

Use this workflow when `{DESIGN_DIR}/design.md` exists and you want to improve it. Mode selection, agent selection (including focus filtering), and coordination rules are in SKILL.md.

## Phase I-1: Load Context

Read these files:

1. `{DESIGN_DIR}/design.md` - The existing design
2. Requirements file - locate it with the same logic as Phase 1 of `references/new-workflow.md`
3. Any existing research files in `{DESIGN_DIR}/research-*.md`

Note `FOCUS_OR_MODE` as the focus area if provided.

## Phase I-2: Targeted Review (Parallel Agents)

Select agents using the focus filtering rules in SKILL.md's Agent Selection section, then launch them together with this prompt:

```
Review the existing design at `{DESIGN_DIR}/design.md`.

[If focus provided]: Focus specifically on: {focus_area}
[If no focus]: Provide a comprehensive review.

Your task:
1. Identify issues, gaps, or weaknesses
2. Suggest specific improvements with rationale
3. Note what's done well
4. Prioritize findings: Critical > Major > Minor > Suggestion

Write your review to `{DESIGN_DIR}/iteration-review-{agent-name}.md`

Format:
# {Agent Name} Review - Iteration

## Summary
[1-2 sentence overall assessment]

## Critical Issues
[Issues that would cause implementation failure]

## Major Issues
[Significant problems that should be fixed]

## Minor Issues
[Small improvements worth considering]

## Suggestions
[Nice-to-have improvements]

## Questions for Clarification
[Anything unclear needing input]

## What's Working Well
[Positive aspects]
```

## Phase I-3: Synthesize Feedback

Read all `{DESIGN_DIR}/iteration-review-*.md` files.

1. **Aggregate issues** - Combine similar issues from multiple agents
2. **Prioritize** - Order by severity and number of agents flagging it
3. **Identify conflicts** - Note where agents disagree
4. **Determine scope** - What can be addressed in this iteration?

If needed, ask the user to:

- Resolve conflicting recommendations
- Clarify requirements ambiguities
- Get approval for significant changes
- Narrow scope if too many issues

## Phase I-4: Apply Improvements

Update `{DESIGN_DIR}/design.md`:

1. **Critical issues** - Must fix
2. **Major issues** - Fix if straightforward
3. **Minor issues** - Fix if quick
4. **Suggestions** - Apply judgment

When making changes:

- Update relevant sections
- Add/update Design Decisions entries explaining changes
- Increment version in metadata
- Add entry to Change Log

## Phase I-5: Validate Changes (Optional)

If significant changes were made, optionally re-run affected review agents.
Limit to 1 validation pass.

## Phase I-6: Present Changes to User

Summarize the iteration:

```markdown
## Design Iteration Summary

### Changes Made

- [List of changes with brief rationale]

### Issues Addressed

- [Which issues were fixed]

### Issues Deferred

- [What was not addressed and why]

### New Questions

- [Any new questions that arose]

### Recommendation

[Next steps: another iteration, move to implementation, or specific area needs attention]
```

Ask user if they want to:

1. Accept the changes
2. Run another iteration (with optional focus)
3. Revert changes
4. Move to implementation
