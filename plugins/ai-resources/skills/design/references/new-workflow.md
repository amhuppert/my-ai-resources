# New Design Workflow

Use this workflow when creating a design from scratch. Mode selection, agent selection, and coordination rules are in SKILL.md.

## Phase 1: Context Gathering

Read these files to understand the project context:

1. `.kiro/steering/tech.md` - Project overview and tech stack
2. Find requirements file:
   - Check `memory-bank/DESIGN-AGENTS.md` for `requirements-file:` config
   - If not found, glob for `memory-bank/*requirements*.md` or `memory-bank/*REQUIREMENTS*.md`
3. If design system configured, read the design system spec file
4. Read any relevant source files referenced in requirements

If the requirements file cannot be found, ask the user for its location.

## Phase 2: Research Phase (Parallel Agents)

If `memory-bank/DESIGN-AGENTS.md` lists any Research Agents, launch them together.

For each research agent, use this prompt template:

```
Research [agent's domain] for this project.

Project context: [summary from Phase 1]
Requirements: [key requirements]

Write your findings to `{DESIGN_DIR}/research-{agent-name}.md`

Include:
- Executive Summary
- Key Findings
- Recommendations
- Tradeoffs and Alternatives
- References
```

If no research agents are configured, skip to Phase 3.

## Phase 3: Design Synthesis

Read all research outputs from `{DESIGN_DIR}/research-*.md`, then create an initial design document.

Create `{DESIGN_DIR}/design-draft.md` with:

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

Launch all review agents (universal + conditional + project-specific) together using the active client's agent-delegation mechanism.

For each review agent, use this prompt:

```
Review the design at `{DESIGN_DIR}/design-draft.md` against [agent's specialty].

Also read:
- Requirements file: [path]
- Project brief: .kiro/steering/tech.md
[If design-system-agent: - Design system: [path]]

Write your review to `{DESIGN_DIR}/review-{agent-name}.md`

Follow your standard output format.
```

## Phase 5: Design Refinement

Read all review outputs from `{DESIGN_DIR}/review-*.md`.

1. **Synthesize feedback** - Combine findings from all agents
2. **Resolve conflicts** - If agents disagree, document tradeoffs and make a decision
3. **Update design-draft.md** - Address Critical and Major issues
4. **Document decisions** - Add entries to Design Decisions section

If significant changes were made (Critical issues addressed), optionally re-run Phase 4 reviews.

## Phase 6: Final Design Document

Copy the refined `design-draft.md` to `{DESIGN_DIR}/design.md`.

Ensure it includes:

- Updated metadata (version, date, status: "Draft")
- Change Log with initial entry

## Phase 7: Present to User

Present the design to the user:

1. **Summarize** key design decisions (3-5 bullet points)
2. **Highlight** major tradeoffs made
3. **List** any open questions needing user input
4. **Ask** for approval or feedback
