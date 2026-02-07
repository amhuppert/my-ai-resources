You are initializing a RALPH_TASK.md file for the Ralph Wiggum autonomous development loop. Ralph is a technique where the same prompt is fed repeatedly to an AI agent in a loop — progress persists in files and git, not in the LLM's context window. When context fills up, a fresh agent picks up from where the last one committed.

Your job is to create a well-structured task file that enables effective autonomous iteration on the current objective.

# Process

## 1. Gather Objective Context

Read these files to understand the current objective:

1. `memory-bank/focus.md` — current work-in-progress and remaining tasks
2. Any implementation plan in `memory-bank/` (files matching `*-implementation-plan.md`)
3. `memory-bank/project-brief.md` — for tech stack and architectural context

If no implementation plan exists, note this — the task file should still be created from whatever context is available in focus.md.

## 2. Analyze and Design Task Criteria

Work through these questions in your thinking:

- What is the objective? What needs to be built or changed?
- What are the discrete, verifiable completion criteria?
- What is the logical execution order? Which tasks can run in parallel?
- What constraints apply (tech stack, patterns, conventions)?
- What command (if any) verifies correctness (e.g., `npm run typecheck`, `npm test`)?

### Criteria Quality Standards

Each success criterion checkbox MUST be:

- **Objectively verifiable** — a machine or human can confirm done/not-done without judgment
- **Atomic** — one specific deliverable per checkbox
- **Scoped for a single iteration** — achievable within one agent session (~80k tokens of context)

Examples of BAD criteria:

- "Make the API good" (subjective)
- "Implement the entire feature" (too broad, not atomic)
- "Update code as needed" (vague)

Examples of GOOD criteria:

- "POST /tasks returns 201 with created task body"
- "`src/queries/admin-areas.sql` created with parameterized query for country_code and admin_level"
- "`npm run typecheck` passes with no errors"
- "Demo page renders polygons when accessed at `/admin-areas.html?country_code=USA`"

### Group Annotations (for parallel execution)

Annotate criteria with `<!-- group: N -->` to control execution order:

- Lower group numbers execute first
- Same group number = can run in parallel
- Unannotated tasks run LAST (after all annotated groups)

Typical grouping strategy:

- Group 1: Foundation work (SQL queries, schemas, type definitions)
- Group 2: Core logic (query functions, route handlers, business logic)
- Group 3: Integration (route registration, wiring, connecting components)
- Group 4: Verification and polish (demo pages, documentation, manual tests)
- Unannotated: Final polish (README updates, cleanup)

Only use groups if the task has enough criteria to benefit from parallel execution. For simple tasks with sequential dependencies, groups are optional.

## 3. Write RALPH_TASK.md

Create `RALPH_TASK.md` at the project root. The file has two parts:

### Part 1: YAML Frontmatter

Delimited by `---`. Required fields:

- `task`: Brief 1-line description derived from the objective
- `completion_criteria`: Short summary list (3-5 items) of the major milestones
- `max_iterations`: 30–50 depending on complexity (default 50 for larger tasks)
- `test_command`: (optional) Command to verify correctness, e.g., `"npm run typecheck"`

### Part 2: Markdown Body

Organize the body into these sections:

1. **Task title** — `# Task: [Name]`
2. **Overview** — 2-4 sentences describing what needs to be built. Reference the implementation plan if one exists.
3. **Requirements** — Functional and non-functional requirements derived from the objective/plan. Be specific.
4. **Constraints** — Technology constraints from project-brief.md, pattern constraints (e.g., "follow existing risk layers pattern"), and any other limitations.
5. **Success Criteria** — The core of the file. A numbered checklist using `[ ]` checkboxes. Each item is a single verifiable criterion. Add `<!-- group: N -->` annotations where appropriate.
6. **Notes** — Links to relevant files, the implementation plan, or other context the agent should reference during work. Include file paths that the agent should read before starting.
7. **Ralph Instructions** — Include this section VERBATIM at the bottom:

```
## Ralph Instructions

When working on this task:

1. Read `.ralph/progress.md` to see what's been done
2. Check `.ralph/guardrails.md` for signs to follow
3. Work on the next incomplete criterion
4. Update `.ralph/progress.md` with your progress
5. Commit your changes with descriptive messages
6. When ALL criteria are met (all `[ ]` → `[x]`), output: `<ralph>COMPLETE</ralph>`
7. If stuck on the same issue 3+ times, output: `<ralph>GUTTER</ralph>`
```

## 4. Verify Quality

Before finalizing, verify:

- Every criterion is objectively verifiable (no subjective language)
- Criteria are ordered from foundation to integration
- Group annotations reflect real dependencies between criteria
- The overview accurately summarizes the objective
- Constraints match the project's actual tech stack
- The Notes section links to the implementation plan if one exists
- The Ralph Instructions section is included verbatim as specified above

# Output

Write the `RALPH_TASK.md` file to the project root. After writing, present a brief summary of:

- Total number of criteria and how they are grouped
- The test command (if any)
- The max_iterations value selected and a brief justification
