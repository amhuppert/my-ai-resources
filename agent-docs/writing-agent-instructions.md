# Writing Effective AI Agent Instructions

A comprehensive guide for authoring instructions that AI agents can reliably follow, applicable to CLAUDE.md files, Claude Code custom slash commands, Claude Skills, and any other AI instruction format.

## Core Principles

### Context is a Shared Resource

The context window is shared between instructions, conversation history, code files, and other resources. Every token of instruction competes with tokens of actual work.

**Guidelines:**

- Keep instructions concise and focused
- Include only information the AI doesn't already possess
- Remove redundancy and verbosity
- Use progressive disclosure to layer complexity

**Example:**

- ✗ Bad: "You should make sure to always check that the API endpoint is valid before making a request to it"
- ✓ Good: "Validate API endpoints before requests"

### Match Specificity to Task Fragility

Different tasks require different levels of prescriptiveness. Match your instruction specificity to the consequences of variation:

**High Freedom (Text Instructions):**

- Use when: Multiple valid approaches exist, outcomes are similar
- Example: "Improve code readability"
- Risk: Low - Different refactorings achieve similar results

**Medium Freedom (Pseudocode/Patterns):**

- Use when: Preferred approach exists but some variation acceptable
- Example: "For API calls: validate input → make request → handle errors → return result"
- Risk: Medium - Wrong order causes issues, but implementation details flexible

**Low Freedom (Exact Scripts/Code):**

- Use when: Operations are error-prone, order-dependent, or have side effects
- Example: Providing complete bash script for git operations
- Risk: High - Wrong sequence corrupts state

### Purpose-Driven Design

Every instruction set should clearly communicate:

1. **What it does** - The specific capability or knowledge provided
2. **When to use it** - The conditions that should trigger its use
3. **How to use it** - The practical execution steps

**Example (Claude Skill description):**

```yaml
description: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.
```

## Structure & Organization

### Progressive Disclosure

Structure instructions like a table of contents - start with essentials, layer in detail:

**Level 1: Overview**

- Purpose statement
- When to use
- Quick reference

**Level 2: Core Instructions**

- Primary workflows
- Essential patterns
- Key constraints

**Level 3: Reference Details**

- Edge cases
- Advanced usage
- Detailed specifications

**Implementation patterns:**

- Keep main instruction file as overview (<500 lines for skills)
- Split complex content into separate reference files
- Keep references one level deep (avoid nested references)
- Add table of contents to files >100 lines

### Consistent Terminology

Choose one term for each concept and use it throughout:

**Example:**

- ✓ Good: Always use "API endpoint" consistently
- ✗ Bad: Mix "API endpoint", "URL", "path", "route" interchangeably

**Why it matters:**

- Reduces cognitive load
- Prevents confusion about whether different terms mean different things
- Makes instructions easier to search and reference

### Logical Grouping

Organize related instructions together:

**By workflow stage:**

```
1. Planning Phase
2. Implementation Phase
3. Validation Phase
```

**By domain:**

```
## Database Operations
## API Integration
## Error Handling
```

**By tool or resource:**

```
## Using the Read Tool
## Using the Write Tool
## Using the Bash Tool
```

## Content Patterns

### The Template Pattern

Provide templates to show expected output format. Match template strictness to requirements:

**Flexible Template (when variation acceptable):**

```
## Summary
[Brief description]

## Details
[Relevant details]
```

**Strict Template (when format critical):**

```json
{
  "status": "success" | "error",
  "data": {...},
  "timestamp": "ISO-8601 datetime"
}
```

### The Example Pattern

Include concrete input/output pairs showing desired style and detail level:

**Example:**

```
## Task
"Rotate this PDF 90 degrees clockwise"

## Expected Response
1. Read the PDF file
2. Execute scripts/rotate_pdf.py --angle 90 --direction cw input.pdf
3. Verify rotation with scripts/validate_pdf.py
4. Report: "Rotated input.pdf 90° clockwise. Output: input_rotated.pdf"
```

**Why examples work:**

- Show implicit expectations that are hard to articulate
- Demonstrate appropriate detail level and tone
- Provide concrete reference point for quality

### The Workflow Pattern

Break complex operations into sequential, checklist-ready steps with validation:

**Structure:**

```
### Step 1: [Action Name]

[What to do and why]

**Validation:** [How to verify this step succeeded]

### Step 2: [Next Action]

[What to do and why]

**Validation:** [How to verify this step succeeded]
```

**Example:**

```
### Step 1: Analyze Current State

Run git status and git diff to understand uncommitted changes.

**Validation:** Confirm you have a clear list of modified files.

### Step 2: Stage Changes

Add relevant files with git add, excluding sensitive files (.env, credentials.json).

**Validation:** Run git status to verify correct files are staged.
```

### The Anti-Pattern Pattern

Explicitly call out what NOT to do when common mistakes exist:

**Structure:**

```
## Anti-Patterns to Avoid

- ✗ Don't [wrong approach] because [reason]
- ✗ Avoid [problematic pattern] since [consequence]
```

**Example:**

```
## Anti-Patterns to Avoid

- ✗ Don't assume packages are pre-installed - always check and install if needed
- ✗ Avoid deeply nested file references - Claude may only partially read nested files
- ✗ Don't use Windows-style paths (backslashes) - always use forward slashes
```

## Writing Style

### Imperative and Objective

Write instructions using imperative/infinitive form (verb-first), not second person:

**Examples:**

- ✓ Good: "Validate input before making API requests"
- ✓ Good: "To rotate a PDF, use the rotate_pdf.py script"
- ✗ Bad: "You should validate input before you make API requests"
- ✗ Bad: "If you want to rotate a PDF, you can use the rotate_pdf.py script"

**Why it matters:**

- More concise and direct
- Maintains objective, instructional tone
- Easier to parse and follow

### Third Person for Descriptions

When describing what instructions do or when to use them, use third person:

**Examples:**

- ✓ Good: "This skill should be used when rotating PDFs"
- ✓ Good: "These instructions guide the agent through git workflows"
- ✗ Bad: "Use this skill when you need to rotate PDFs"

### Avoid Conversational Language

Instructions are reference material, not dialogue:

**Examples:**

- ✓ Good: "Check file existence before reading"
- ✗ Bad: "Hey, make sure to check if the file exists before you try to read it, okay?"
- ✓ Good: "Required: Node.js 18+"
- ✗ Bad: "You'll need to have Node.js version 18 or higher installed on your system"

## Temporal Considerations

### Avoid Time-Sensitive Information

Don't use date-based conditions that will become outdated:

**Instead of dates:**

```
✗ Bad:
if year >= 2024:
    use_new_api()
else:
    use_old_api()
```

**Use "old patterns" sections:**

```
✓ Good:
## Current Pattern
Use the REST API v2 endpoint: /api/v2/users

## Old Patterns (for legacy codebases)
- REST API v1: /api/users (deprecated, use v2)
- SOAP API: /soap/users (deprecated, use REST v2)
```

### No Temporal References in Code/Comments

Avoid words like "new", "old", "recently", "improved", "enhanced":

**Examples:**

- ✗ Bad: `newUserService` or `improvedAuthHandler`
- ✓ Good: `userService` or `authHandler`
- ✗ Bad: `// Recently refactored to use async/await`
- ✓ Good: `// Uses async/await for cleaner error handling`

## Code & Script Patterns

### Error Handling

Scripts should solve problems rather than punt to the AI agent. Handle edge cases explicitly:

**Example:**

```python
# ✗ Bad - punts to AI
if not file_exists(input_file):
    raise Exception("File not found")

# ✓ Good - handles the problem
if not file_exists(input_file):
    print(f"Error: '{input_file}' not found")
    similar_files = find_similar_filenames(input_file)
    if similar_files:
        print(f"Did you mean one of these? {similar_files}")
    sys.exit(1)
```

### Justified Configuration Values

Explain all configuration parameters. Avoid magic numbers without justification:

**Examples:**

```python
# ✗ Bad
timeout = 30

# ✓ Good
# Timeout set to 30s - API SLA is 20s, plus 10s buffer for network latency
timeout = 30
```

```typescript
// ✗ Bad
const MAX_RETRIES = 3;

// ✓ Good
// Retry up to 3 times - balances reliability (99.9% success rate at 3 retries)
// with user experience (4 total attempts = ~40s max delay with exponential backoff)
const MAX_RETRIES = 3;
```

### Dependency Documentation

Always list required packages and verify availability:

**For scripts:**

```python
"""
Rotate PDF files.

Dependencies:
- PyPDF2>=3.0.0 (pip install PyPDF2)
- Pillow>=9.0.0 (pip install Pillow)

Verify installation:
  python -c "import PyPDF2; import PIL"
"""
```

**For instructions:**

```markdown
## Prerequisites

This workflow requires:

- Bun 1.0+ (`bun --version`)
- Git 2.30+ (`git --version`)
- jq (`which jq`)

Install missing dependencies before proceeding.
```

### Intermediate Validation

For batch or destructive operations, use plan-validate-execute workflow:

**Pattern:**

```
1. Analyze current state
2. Generate plan/diff showing proposed changes
3. Present plan for validation
4. Execute only after confirmation
```

**Example:**

```markdown
### Safe Batch Refactoring Workflow

1. **Analyze:** Search codebase for all occurrences of the pattern
2. **Plan:** Generate a list of files and specific changes to make
3. **Review:** Present the plan in a readable format (table or list)
4. **Confirm:** Wait for explicit approval before making changes
5. **Execute:** Apply changes file by file
6. **Verify:** Run tests and report any failures
```

## Development Process

### Start with Concrete Examples

Before writing instructions, understand concrete use cases:

**Process:**

1. Gather real examples of desired behavior
2. Identify patterns across examples
3. Extract generalizable principles
4. Write instructions that cover the examples

**Example questions to ask:**

- "Can you show me an example of when you'd use this?"
- "What would a user say that should trigger this?"
- "What should happen in this specific case?"
- "Are there edge cases or variations to consider?"

## Quality Checklist

Use this checklist to validate instruction quality:

**Clarity & Purpose:**

- [ ] Purpose clearly stated (what it does)
- [ ] Usage conditions clearly stated (when to use)
- [ ] Execution approach clearly stated (how to use)
- [ ] Appropriate specificity level for task requirements

**Structure & Organization:**

- [ ] Progressive disclosure (overview → details)
- [ ] Consistent terminology throughout
- [ ] Logical grouping of related content
- [ ] Table of contents for files >100 lines
- [ ] No deeply nested references (max 1 level)

**Content Quality:**

- [ ] Concrete examples with input/output pairs
- [ ] Templates for structured output (when applicable)
- [ ] Workflows with validation steps (for complex tasks)
- [ ] No time-sensitive information or temporal references
- [ ] Anti-patterns explicitly called out (when common mistakes exist)

**Writing Style:**

- [ ] Imperative/infinitive form (not second person)
- [ ] Objective, instructional language
- [ ] Third person for descriptions
- [ ] No conversational language or filler
- [ ] Concise (no redundancy or verbosity)

**Code & Scripts:**

- [ ] Error handling with helpful messages
- [ ] All configuration values justified
- [ ] Required dependencies listed
- [ ] File paths use forward slashes
- [ ] Intermediate validation for destructive operations

## Common Pitfalls

Avoid these common mistakes:

**Verbosity:**

- Writing conversationally instead of instructionally
- Including information AI already knows
- Repeating the same concept in different words

**Ambiguity:**

- Using multiple terms for the same concept
- Providing high-level guidance for error-prone operations
- Omitting examples when behavior isn't obvious

**Poor Structure:**

- Mixing different abstraction levels
- Deeply nesting references
- No table of contents for long documents

**Temporal Issues:**

- Date-based conditionals
- Words like "new", "old", "recently", "improved"
- Comments about what code used to do

**Incomplete Testing:**

- Writing without concrete examples
