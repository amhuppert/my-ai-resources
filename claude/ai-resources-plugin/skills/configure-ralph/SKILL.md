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

Create `.ralph/PROMPT.md` following this structure:

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

- ...

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

## Discovered

<!-- Ralph will add discovered tasks here as it works -->
```

<guidelines type="fix-plan">
- Each task should be specific and independently completable
- Use checkbox format: `- [ ] Task description`
- Order tasks by dependency (earlier tasks should not depend on later ones)
- Include a "Discovered" section for Ralph to add tasks it finds
- Tasks should be small enough to complete in one loop iteration
- Avoid compound tasks - split "X and Y" into separate items
</guidelines>

### Step 5: Verify and Confirm

After generating files:

1. Read both generated files back to verify correctness
2. Present a summary to the user showing:
   - Key objectives identified
   - Number of tasks in fix_plan.md
   - Technology stack configured
3. Remind user to run `ralph --monitor` to start the development loop

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

## Discovered

<!-- Ralph will add discovered tasks here -->
</output-fix-plan>
</example>

## References

For detailed templates and best practices, see:

- [references/prompt-template.md](references/prompt-template.md) - Full PROMPT.md template with annotations
- [references/fix-plan-template.md](references/fix-plan-template.md) - fix_plan.md template with task writing guidelines
