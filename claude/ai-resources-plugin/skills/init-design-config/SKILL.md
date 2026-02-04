---
name: init-design-config
description: This skill should be used when the user wants to initialize or set up the DESIGN-AGENTS.md configuration file for the /design workflow. Discovers project context and populates the config with detected values.
allowed-tools: Read, Grep, Glob, Write
---

Initialize a `memory-bank/DESIGN-AGENTS.md` configuration file for the `/design` workflow, populated with values discovered from project context.

## Process

### Step 1: Check if File Exists

Check if `memory-bank/DESIGN-AGENTS.md` already exists.

If it exists, report to user and ask if they want to overwrite or abort.

### Step 2: Discover Project Context

Gather information from the project to populate the configuration:

**Design System File:**

1. Search for design system files:
   - Glob for `**/design-system*.md`, `**/design-spec*.md`, `**/*-design*.md`
   - Check `docs/`, `agent-docs/`, `memory-bank/` directories
2. If found, use the path; otherwise use placeholder `[path/to/design-system.md - remove if none]`

**Requirements File:**

1. Search for requirements files:
   - Glob for `memory-bank/*requirements*.md`, `memory-bank/*REQUIREMENTS*.md`
   - Also check `docs/*requirements*.md`, `**/PRD*.md`
2. If found, use the path; otherwise use placeholder `[auto-detected from memory-bank/*requirements*.md]`

**Existing Project Agents:**

1. Check if `.claude/agents/` directory exists
2. If it does, list any existing agents that might be design-related
3. Note these for potential inclusion in Research/Review sections

**Project Type (for suggestions):**

1. Check for `tsconfig.json` → suggest TypeScript-related agents
2. Check for `app.json` with expo → suggest mobile-related agents
3. Check `memory-bank/project-brief.md` for domain hints

### Step 3: Generate Configuration Content

Create the DESIGN-AGENTS.md content:

```markdown
# Design Agents Configuration

This file configures project-specific agents for the `/design` workflow.

## Configuration

Optional settings for the design workflow:

- design-system-file: [discovered path or placeholder]
- requirements-file: [discovered path or placeholder]

## Research Agents

Domain experts that gather information during Phase 2 (before design synthesis).
These agents run in parallel to research specific aspects of the problem domain.

Add entries as: `- agent-name: Brief description of expertise`

[If domain hints found from project-brief.md, add suggestions as comments:]

<!-- Suggested based on project context:
- [domain]-expert-agent: Researches [domain] best practices and patterns
-->

## Review Agents

Additional reviewers beyond the universal agents that run during Phase 4.
These agents evaluate the design draft for project-specific concerns.

Add entries as: `- agent-name: Brief description of what it reviews`

[If existing project agents found, list them as suggestions:]

<!-- Existing agents in .claude/agents/ that could be added:
- [agent-name]: [description if available]
-->

<!-- Common review agents to consider:
- security-review-agent: Reviews for authentication, authorization, and data protection
- performance-review-agent: Reviews for performance bottlenecks and optimization opportunities
- accessibility-review-agent: Reviews for WCAG compliance and inclusive design
-->
```

### Step 4: Create Directory if Needed

If `memory-bank/` directory doesn't exist, create it.

### Step 5: Write the File

Write the generated content to `memory-bank/DESIGN-AGENTS.md`.

### Step 6: Report Results

Report to the user:

```markdown
## DESIGN-AGENTS.md Initialized

**Location**: memory-bank/DESIGN-AGENTS.md

### Discovered Values

- **Design System**: [path found | not found - placeholder added]
- **Requirements**: [path found | not found - will auto-detect]

### Next Steps

1. Review and update `memory-bank/DESIGN-AGENTS.md`
2. Remove placeholder comments for unused sections
3. Add project-specific research and review agents:
   - Use `/add-design-agent` to create new agents
   - Or manually add existing agents from `.claude/agents/`
4. Run `/design` to start the design workflow

### Universal Agents (always included)

The following agents run automatically for all projects:

- requirements-validation-agent
- software-engineering-agent
- simplicity-advocate-agent
- testing-strategy-agent
- ux-usability-agent

### Conditional Agents (auto-detected)

These agents are included based on project type:
[List which conditional agents will be included based on detection]

- [If TypeScript]: typescript-type-safety-agent ✓
- [If Expo]: expo-best-practices-agent ✓
- [If design system configured]: design-system-agent ✓
```
