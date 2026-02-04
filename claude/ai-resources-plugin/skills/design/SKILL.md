---
name: design
description: This skill should be used when the user wants to create or iterate on a software design. Orchestrates a multi-agent collaborative design workflow with parallel research and review phases. Supports "new" mode for fresh designs and iteration mode for improving existing designs.
argument-hint: [focus-area or "new"]
allowed-tools: Read, Grep, Glob, Write, Task, WebSearch, WebFetch, AskUserQuestion
---

Orchestrate a multi-agent design workflow to create or iterate on a design that meets project requirements.

## Arguments

- `$ARGUMENTS` or `$1`: Focus area or mode (optional)
  - `new` - Force creation of a new design from scratch (ignores existing design.md)
  - Any other text - Focus iteration on this specific area (e.g., "ux", "architecture", "types")
  - If not provided and design.md exists - Run general iteration to improve design
  - If not provided and no design.md - Run full new design workflow

---

## Mode Selection

First, determine which mode to run:

```
if $ARGUMENTS == "new":
    → Run NEW DESIGN WORKFLOW
else if file_exists("memory-bank/planning/design.md"):
    → Run ITERATION WORKFLOW (with optional focus: $ARGUMENTS)
else:
    → Run NEW DESIGN WORKFLOW
```

---

## Project Type Detection

Before running agents, detect project characteristics:

1. **TypeScript**: Check if `tsconfig.json` exists OR grep `memory-bank/project-brief.md` for "TypeScript"
2. **Expo**: Check if `app.json` contains "expo" key OR grep `memory-bank/project-brief.md` for "Expo"
3. **Design System**: Check if `memory-bank/DESIGN-AGENTS.md` contains `design-system-file:` and the referenced file exists

Store detection results for agent selection.

---

## Agent Selection

Build the list of agents to use:

**Universal agents (always include):**

- ai-resources:design:requirements-validation-agent
- ai-resources:design:software-engineering-agent
- ai-resources:design:simplicity-advocate-agent
- ai-resources:design:testing-strategy-agent
- ai-resources:design:ux-usability-agent

**Conditional agents (based on detection):**

- If TypeScript detected: add ai-resources:design:typescript-type-safety-agent
- If Expo detected: add ai-resources:design:expo-best-practices-agent
- If Design System configured: add ai-resources:design:design-system-agent

**Project-specific agents:**

- Read `memory-bank/DESIGN-AGENTS.md` if it exists
- Add any agents listed under "## Research Agents" (for Phase 2)
- Add any agents listed under "## Review Agents" (for Phase 4)
- These are project-local agents in `.claude/agents/`

---

# NEW DESIGN WORKFLOW

Use this workflow when creating a design from scratch.

## Phase 1: Context Gathering

Read these files to understand the project context:

1. `memory-bank/project-brief.md` - Project overview and tech stack
2. Find requirements file:
   - Check `memory-bank/DESIGN-AGENTS.md` for `requirements-file:` config
   - If not found, glob for `memory-bank/*requirements*.md` or `memory-bank/*REQUIREMENTS*.md`
3. If design system configured, read the design system spec file
4. Read any relevant source files referenced in requirements

If requirements file cannot be found, use AskUserQuestion to ask for its location.

## Phase 2: Research Phase (Parallel Agents)

If `memory-bank/DESIGN-AGENTS.md` lists any Research Agents, launch them ALL IN PARALLEL:

For each research agent, use this prompt template:

```
Research [agent's domain] for this project.

Project context: [summary from Phase 1]
Requirements: [key requirements]

Write your findings to `memory-bank/planning/research-{agent-name}.md`

Include:
- Executive Summary
- Key Findings
- Recommendations
- Tradeoffs and Alternatives
- References
```

Wait for all research agents to complete before proceeding.

If no research agents are configured, skip to Phase 3.

## Phase 3: Design Synthesis

Read all research outputs from `memory-bank/planning/research-*.md`, then create an initial design document.

Create `memory-bank/planning/design-draft.md` with:

1. **Metadata** - Version, date, status
2. **Summary** - Executive overview
3. **Requirements Addressed** - How each requirement is addressed
4. **Architecture** - Component structure, data flow
5. **Data Model** - Types, schemas, state shape
6. **Service Layer** - Service interfaces and responsibilities
7. **UI Components** - Screen hierarchy, component breakdown (if applicable)
8. **Algorithms** - Key algorithms and their rationale (if applicable)
9. **User Flows** - Key user journeys
10. **Testing Strategy** - Approach for each layer
11. **Design Decisions** - Key decisions with rationale
12. **Open Questions** - Unresolved issues

## Phase 4: Design Review (Parallel Agents)

Launch ALL review agents IN PARALLEL using the Task tool with multiple tool calls in a single message:

For each review agent (universal + conditional + project-specific), use this prompt:

```
Review the design at `memory-bank/planning/design-draft.md` against [agent's specialty].

Also read:
- Requirements file: [path]
- Project brief: memory-bank/project-brief.md
[If design-system-agent: - Design system: [path]]

Write your review to `memory-bank/planning/review-{agent-name}.md`

Follow your standard output format.
```

Wait for all reviews to complete.

## Phase 5: Design Refinement

Read all review outputs from `memory-bank/planning/review-*.md`.

1. **Synthesize feedback** - Combine findings from all agents
2. **Resolve conflicts** - If agents disagree, document tradeoffs and make a decision
3. **Update design-draft.md** - Address Critical and Major issues
4. **Document decisions** - Add entries to Design Decisions section

If significant changes were made (Critical issues addressed), optionally re-run Phase 4 reviews.
Maximum 2 review cycles total.

## Phase 6: Final Design Document

Copy the refined `design-draft.md` to `memory-bank/planning/design.md`.

Ensure it includes:

- Updated metadata (version, date, status: "Draft")
- Change Log with initial entry

## Phase 7: Present to User

Present the design to the user:

1. **Summarize** key design decisions (3-5 bullet points)
2. **Highlight** major tradeoffs made
3. **List** any open questions needing user input
4. **Ask** for approval or feedback

---

# ITERATION WORKFLOW

Use this workflow when `memory-bank/planning/design.md` exists and you want to improve it.

## Phase I-1: Load Context

Read these files:

1. `memory-bank/planning/design.md` - The existing design
2. Requirements file (same logic as new design workflow)
3. Any existing research files in `memory-bank/planning/research-*.md`

Note the focus area from `$ARGUMENTS` if provided.

## Phase I-2: Targeted Review (Parallel Agents)

Select agents based on focus area. If no focus provided, use ALL agents.

**Focus area mapping:**

- "ux", "ui", "usability", "interface" → ux-usability-agent, design-system-agent (if configured)
- "architecture", "code", "engineering" → software-engineering-agent, typescript-type-safety-agent, expo-best-practices-agent, testing-strategy-agent, simplicity-advocate-agent
- "requirements", "features" → requirements-validation-agent, simplicity-advocate-agent
- "type", "typescript", "types" → typescript-type-safety-agent
- "expo", "mobile" → expo-best-practices-agent
- "test", "testing" → testing-strategy-agent
- "simple", "complexity" → simplicity-advocate-agent
- No focus or "all" → ALL applicable agents

Launch selected agents IN PARALLEL with this prompt:

```
Review the existing design at `memory-bank/planning/design.md`.

[If focus provided]: Focus specifically on: {focus_area}
[If no focus]: Provide a comprehensive review.

Your task:
1. Identify issues, gaps, or weaknesses
2. Suggest specific improvements with rationale
3. Note what's done well
4. Prioritize findings: Critical > Major > Minor > Suggestion

Write your review to `memory-bank/planning/iteration-review-{agent-name}.md`

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

Wait for all reviews to complete.

## Phase I-3: Synthesize Feedback

Read all `memory-bank/planning/iteration-review-*.md` files.

1. **Aggregate issues** - Combine similar issues from multiple agents
2. **Prioritize** - Order by severity and number of agents flagging it
3. **Identify conflicts** - Note where agents disagree
4. **Determine scope** - What can be addressed in this iteration?

If needed, use AskUserQuestion to:

- Resolve conflicting recommendations
- Clarify requirements ambiguities
- Get approval for significant changes
- Narrow scope if too many issues

## Phase I-4: Apply Improvements

Update `memory-bank/planning/design.md`:

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

---

## Agent Coordination Rules

1. **Parallel execution**: Always launch independent agents in a SINGLE message with multiple Task tool calls
2. **Sequential dependencies**: Wait for research before synthesis, synthesis before review
3. **Communication via files**: Agents write to `memory-bank/planning/` directory
4. **Context efficiency**: Agents read only files they need
5. **Max iterations**: Run review cycle at most 2 times per workflow invocation
6. **Focus respect**: When user provides focus, limit scope to relevant agents

## Directory Structure

```
memory-bank/planning/
├── research-*.md                 # Research agent outputs
├── design-draft.md               # Working design (new design workflow)
├── design.md                     # Current design document
├── review-*.md                   # Review outputs (new design)
└── iteration-review-*.md         # Iteration review outputs
```

## Error Handling

- **Missing requirements file**: Ask user for location via AskUserQuestion
- **Missing DESIGN-AGENTS.md**: Proceed with only universal + auto-detected agents
- **Agent failure**: Log error, continue with other agents, report at end
- **No design.md for iteration**: Switch to NEW DESIGN mode automatically
