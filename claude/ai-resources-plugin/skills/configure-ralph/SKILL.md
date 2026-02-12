---
name: configure-ralph
description: This skill should be used when the user wants to configure ralph-claude-code for a new objective. It updates .ralph/PROMPT.md and .ralph/fix_plan.md files in projects that already have Ralph enabled. Use when the user says "configure ralph", "set up ralph for", "update ralph for a new objective", or wants to start a new development objective with Ralph.
---

# Configure Ralph

Configure ralph-claude-code for a new development objective by generating optimized PROMPT.md and fix_plan.md files.

## Prerequisites

This skill requires Ralph to already be enabled in the project. Verify by checking for:

- `.ralph/` directory exists
- `.ralphrc` configuration file exists

If Ralph is not enabled, instruct the user to run `ralph-enable` first.

## Workflow

### Step 1: Gather Objective Information

The objective can be provided via:

- File argument: `/configure-ralph @objective.md`
- Interactive prompts if details are insufficient

Read the provided objective file. If no file is provided or the objective lacks sufficient detail, use AskUserQuestion to gather:

1. **Project description**: What is being built? (1-2 sentences)
2. **Technology stack**: Languages, frameworks, key libraries with versions
3. **Key principles**: Development constraints, quality standards, conventions
4. **Current objectives**: Specific goals for this development phase
5. **Data entities/API contracts**: Key models, endpoints, or data structures (if applicable)

### Step 2: Analyze Existing Ralph Configuration

Read the existing `.ralph/` files to understand:

- Current `.ralphrc` settings (tool permissions, timeouts, rate limits)
- Any existing specs in `.ralph/specs/` that should be preserved or referenced
- Current `.ralph/AGENT.md` build/test commands

### Step 3: Generate PROMPT.md

Create `.ralph/PROMPT.md` with TWO parts: project-specific content followed by Ralph operational instructions.

**Part 1: Project-Specific Content** (customize per project):

```markdown
# Ralph Development Instructions

## Context

You are Ralph, building [PROJECT_DESCRIPTION].

## Technology Stack

- [Language/Framework] [version]
- [Key library] [version]
- ...

## Key Principles

- [Principle 1]
- [Principle 2]
- ...

## Current Objectives

1. [Specific, measurable goal]
2. [Specific, measurable goal]

## Data Entities / API Contracts

[Define key models, endpoints, data structures with specific details]

## Quality Standards

- [Testing requirements]
- [Code style expectations]
- [Documentation requirements]
```

<guidelines type="prompt-md">
- Be specific and concrete - avoid vague instructions
- Include version numbers for all technologies
- Define data structures with field names and types
- Specify testing requirements (coverage thresholds, test types)
- Keep principles actionable - things Claude can verify
</guidelines>

**Part 2: Ralph Operational Instructions** (append verbatim from reference):

Read [references/ralph-operational-instructions.md](references/ralph-operational-instructions.md) and append its content block (everything inside the ```markdown fence) to the end of the generated PROMPT.md.

<critical>
The operational instructions section is MANDATORY. Without it, Ralph's exit detection system cannot function because:
- Claude won't output the RALPH_STATUS block that Ralph parses for exit signals
- Claude won't know when to set EXIT_SIGNAL: true vs false
- Ralph will either never exit or exit prematurely
- The circuit breaker and response analyzer depend on structured status output
</critical>

### Step 4: Generate fix_plan.md

Create `.ralph/fix_plan.md` with prioritized, actionable tasks:

```markdown
# Fix Plan - [Project Name]

## Priority 1: Foundation

- [ ] [Setup task - environment, dependencies, structure]
- [ ] [Core infrastructure task]

## Priority 2: Core Features

- [ ] [Feature implementation task]
- [ ] [Feature implementation task]

## Priority 3: Integration & Testing

- [ ] [Integration task]
- [ ] [Testing task]

## Priority 4: Polish

- [ ] [Documentation task]
- [ ] [Refinement task]

## Completed

<!-- Items Ralph has finished will be moved here -->

## Discovered

<!-- Ralph will add discovered tasks here as it works -->

## Notes

- [Any relevant context about task dependencies or approach]
```

<guidelines type="fix-plan">
- Each task should be specific and independently completable
- Use checkbox format: `- [ ] Task description`
- Order tasks by dependency (earlier tasks should not depend on later ones)
- Include "Completed", "Discovered", and "Notes" sections
- Tasks should be small enough to complete in one loop iteration
- Avoid compound tasks - split "X and Y" into separate items
</guidelines>

### Step 5: Update .ralphrc Tool Permissions

Read the current `.ralphrc` and check if `ALLOWED_TOOLS` matches the project's technology stack. Update if needed.

**Tool permission patterns by project type:**

| Project Type       | Required ALLOWED_TOOLS additions               |
| ------------------ | ---------------------------------------------- |
| TypeScript/Node.js | `Bash(npm *),Bash(npx *)`                      |
| Python             | `Bash(pip *),Bash(python *),Bash(pytest)`      |
| Rust               | `Bash(cargo *)`                                |
| Go                 | `Bash(go *)`                                   |
| General            | `Write,Read,Edit,Bash(git *)` (always include) |

If the detected project type requires tools not in the current `ALLOWED_TOOLS`, update `.ralphrc` accordingly. Also update `PROJECT_TYPE` and `PROJECT_NAME` if they are still set to defaults.

### Step 6: Verify and Confirm

After generating files:

1. Read both generated files back to verify correctness
2. Verify PROMPT.md contains the RALPH_STATUS block (search for `---RALPH_STATUS---`)
3. Verify fix_plan.md has checkbox items with `- [ ]` format
4. Present a summary to the user showing:
   - Key objectives identified
   - Number of tasks in fix_plan.md
   - Technology stack configured
   - Any `.ralphrc` changes made
5. Remind user to run `ralph --monitor` to start the development loop

## Example Transformation

<example>
<input>
Objective: Build a REST API for a todo application using FastAPI and SQLite. Should support CRUD operations for todos with due dates and priority levels. Include authentication with JWT tokens.
</input>

<output-prompt-md>
# Ralph Development Instructions

## Context

You are Ralph, building a REST API for a todo application with user authentication.

## Technology Stack

- Python 3.11
- FastAPI 0.104+
- SQLite with SQLAlchemy 2.0
- Pydantic 2.0 for validation
- python-jose for JWT handling
- pytest for testing

## Key Principles

- Use async/await for all database operations
- Validate all inputs with Pydantic models
- Return consistent error responses with proper HTTP status codes
- Use dependency injection for database sessions and auth

## Current Objectives

1. Implement user authentication with JWT tokens
2. Create CRUD endpoints for todo items
3. Add filtering and sorting for todo lists
4. Achieve 80% test coverage

## Data Entities

### User

- id: int (primary key)
- email: str (unique)
- hashed_password: str
- created_at: datetime

### Todo

- id: int (primary key)
- user_id: int (foreign key)
- title: str (max 200 chars)
- description: str (optional)
- due_date: datetime (optional)
- priority: enum (low, medium, high)
- completed: bool (default false)
- created_at: datetime
- updated_at: datetime

## Quality Standards

- All endpoints must have OpenAPI documentation
- Input validation on all user-provided data
- Unit tests for business logic, integration tests for endpoints
- 80% minimum test coverage

## Testing Guidelines (CRITICAL)

- LIMIT testing to ~20% of your total effort per loop
- PRIORITIZE: Implementation > Documentation > Tests
- Only write tests for NEW functionality you implement
- Do NOT refactor existing tests unless broken
- Do NOT add "additional test coverage" as busy work
- Focus on CORE functionality first, comprehensive testing later

## Execution Guidelines

- Before making changes: search codebase using subagents
- After implementation: run ESSENTIAL tests for the modified code only
- If tests fail: fix them as part of your current work
- Keep .ralph/AGENT.md updated with build/run instructions
- Document the WHY behind tests and implementations
- No placeholder implementations - build it properly
- ONE task per loop - focus on the most important thing

## Status Reporting (CRITICAL - Ralph needs this!)

**IMPORTANT**: At the end of your response, ALWAYS include this status block:

```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | DOCUMENTATION | REFACTORING
EXIT_SIGNAL: false | true
RECOMMENDATION: <one line summary of what to do next>
---END_RALPH_STATUS---
```

### When to set EXIT_SIGNAL: true

Set EXIT_SIGNAL to **true** when ALL of these conditions are met:

1. All items in fix_plan.md are marked [x]
2. All tests are passing (or no tests exist for valid reasons)
3. No errors or warnings in the last execution
4. All requirements from specs/ are implemented
5. You have nothing meaningful left to implement

### What NOT to do

- Do NOT continue with busy work when EXIT_SIGNAL should be true
- Do NOT run tests repeatedly without implementing new features
- Do NOT refactor code that is already working fine
- Do NOT add features not in the specifications
- Do NOT forget to include the status block (Ralph depends on it!)

## File Structure

- .ralph/: Ralph-specific configuration and documentation
  - specs/: Project specifications and requirements
  - fix_plan.md: Prioritized TODO list
  - AGENT.md: Project build and run instructions
  - PROMPT.md: This file - Ralph development instructions
  - logs/: Loop execution logs
  - docs/generated/: Auto-generated documentation
- src/: Source code implementation

## Current Task

Follow .ralph/fix_plan.md and choose the most important item to implement next.
Use your judgment to prioritize what will have the biggest impact on project progress.

Remember: Quality over speed. Build it right the first time. Know when you're done.
</output-prompt-md>

<output-fix-plan>
# Fix Plan - Todo API

## Priority 1: Foundation

- [ ] Initialize FastAPI project structure with proper directory layout
- [ ] Set up SQLite database with SQLAlchemy models
- [ ] Create Pydantic schemas for User and Todo entities
- [ ] Configure pytest with async support

## Priority 2: Authentication

- [ ] Implement user registration endpoint (POST /auth/register)
- [ ] Implement login endpoint returning JWT (POST /auth/login)
- [ ] Create JWT verification dependency
- [ ] Add protected route decorator

## Priority 3: Todo CRUD

- [ ] Implement create todo endpoint (POST /todos)
- [ ] Implement list todos endpoint with pagination (GET /todos)
- [ ] Implement get single todo endpoint (GET /todos/{id})
- [ ] Implement update todo endpoint (PUT /todos/{id})
- [ ] Implement delete todo endpoint (DELETE /todos/{id})
- [ ] Add filtering by priority and completion status
- [ ] Add sorting by due_date and created_at

## Priority 4: Polish

- [ ] Add comprehensive error handling middleware
- [ ] Write integration tests for all endpoints
- [ ] Ensure OpenAPI documentation is complete
- [ ] Add README with setup and usage instructions

## Completed

## Discovered

<!-- Ralph will add discovered tasks here -->

## Notes

- Authentication must be implemented before protected Todo endpoints
- Use Alembic for database migrations if schema changes are needed
  </output-fix-plan>

<output-ralphrc-changes>
Updated .ralphrc:
- PROJECT_NAME="todo-api"
- PROJECT_TYPE="python"
- ALLOWED_TOOLS="Write,Read,Edit,Bash(git *),Bash(pip *),Bash(python *),Bash(pytest)"
</output-ralphrc-changes>
</example>

## References

For detailed templates and best practices, see:

- [references/prompt-template.md](references/prompt-template.md) - PROMPT.md project-specific content template with annotations
- [references/ralph-operational-instructions.md](references/ralph-operational-instructions.md) - Ralph operational instructions (MUST be appended to every PROMPT.md)
- [references/fix-plan-template.md](references/fix-plan-template.md) - fix_plan.md template with task writing guidelines
