---
name: design
description: Create or iterate on a software design via a multi-agent workflow
  with parallel research and review phases. Stores artifacts in
  memory-bank/planning/{name}/.
---

Orchestrate a multi-agent design workflow to create or iterate on a design that meets project requirements.

## Arguments

- Design name (required) - Slug for the design subdirectory (e.g., "user-auth", "payment-flow")
  - Creates/uses directory: `memory-bank/planning/{name}/`
  - If not provided, ask user for the design name or list existing designs
- Mode or focus area (optional)
  - `new` - Force creation of a new design from scratch (ignores existing design.md)
  - Any other text - Focus iteration on this specific area (e.g., "ux", "architecture", "types")
  - If not provided and design.md exists - Run general iteration to improve design
  - If not provided and no design.md - Run full new design workflow

## Design Directory

All artifacts for a design are stored in `memory-bank/planning/{name}/`:

```
memory-bank/planning/{name}/
├── design.md                     # Current design document
├── design-draft.md               # Working draft (new design workflow)
├── research-*.md                 # Research agent outputs
├── review-*.md                   # Review outputs (new design)
└── iteration-review-*.md         # Iteration review outputs
```

## Mode Selection

First, validate the design name and determine which mode to run:

```
Parse DESIGN_NAME and optional FOCUS_OR_MODE from the user's invocation.

if DESIGN_NAME is empty:
    → Search for existing designs: memory-bank/planning/*/design.md
    → If found, list them and ask user to select or provide a name
    → If none found, ask user for a new design name
    → Store selected/provided name as DESIGN_NAME

DESIGN_DIR = memory-bank/planning/{DESIGN_NAME}

if FOCUS_OR_MODE == "new":
    → Run NEW DESIGN WORKFLOW
else if file_exists("{DESIGN_DIR}/design.md"):
    → Run ITERATION WORKFLOW (with optional focus: FOCUS_OR_MODE)
else:
    → Run NEW DESIGN WORKFLOW
```

For the NEW workflow steps, read `references/new-workflow.md`.
For the ITERATION workflow steps, read `references/iteration-workflow.md`.

## Project Type Detection

Before running agents, detect project characteristics:

1. **TypeScript**: Check if `tsconfig.json` exists OR grep `.kiro/steering/tech.md` for "TypeScript"
2. **Expo**: Check if `app.json` contains "expo" key OR grep `.kiro/steering/tech.md` for "Expo"
3. **Design System**: Check if `memory-bank/DESIGN-AGENTS.md` contains `design-system-file:` and the referenced file exists

Store detection results for agent selection.

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
- Add any agents listed under "## Research Agents" (research phase) and "## Review Agents" (review phases)
- These are project-local agents in `.claude/agents/`

**Focus filtering (iteration mode):** when the user provides a focus area, limit review to the matching agents; with no focus or "all", use all applicable agents.

- "ux", "ui", "usability", "interface" → ux-usability-agent, design-system-agent (if configured)
- "architecture", "code", "engineering" → software-engineering-agent, typescript-type-safety-agent, expo-best-practices-agent, testing-strategy-agent, simplicity-advocate-agent
- "requirements", "features" → requirements-validation-agent, simplicity-advocate-agent
- "type", "typescript", "types" → typescript-type-safety-agent
- "expo", "mobile" → expo-best-practices-agent
- "test", "testing" → testing-strategy-agent
- "simple", "complexity" → simplicity-advocate-agent

## Agent Coordination Rules

1. Agents within a phase are independent and communicate only through files in `{DESIGN_DIR}`, so launch them together in a single batch of parallel delegation calls to minimize wall-clock time.
2. Phases are sequential: wait for every agent in a phase to complete before starting the next phase.
3. Context efficiency: agents read only the files they need.
4. Max iterations: run the review cycle at most 2 times per workflow invocation.

## Error Handling

- **Missing design name**: List existing designs or ask user to provide a name
- **Invalid design name**: Must be a valid slug (lowercase, alphanumeric, hyphens)
- **Missing requirements file**: Ask the user for its location
- **Missing DESIGN-AGENTS.md**: Proceed with only universal + auto-detected agents
- **Agent failure**: Log error, continue with other agents, report at end
- **No design.md for iteration**: Switch to NEW DESIGN mode automatically
- **Missing design directory**: Create `memory-bank/planning/{DESIGN_NAME}/` if it doesn't exist
