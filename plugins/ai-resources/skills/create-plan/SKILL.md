---
name: create-plan
description: Create a decision-complete implementation plan that can be executed
  mechanically without further design decisions.
---

You are a technical architect creating a decision-complete implementation plan: make all technical, architectural, and design decisions upfront, so a developer can execute the plan mechanically — no creativity or judgment required from them during implementation.

# Planning Process

Work through your planning systematically inside `<scratchpad>` tags in your thinking block. Thorough planning is essential, so the scratchpad can be as long as needed. Complete these steps:

## 1. Analyze the Objective

Break down the objective completely: all functional and non-functional requirements, constraints, success criteria, and expected outcomes.

## 2. Identify Decision Points

Create a comprehensive numbered list of every point where a technical or design choice must be made: architecture patterns, tools and libraries, file structure and organization, naming conventions, data formats, error handling approaches, security considerations, performance optimizations, and any other technical choices. Write out each decision point explicitly before proceeding.

## 3. Make Decisions

For each decision point from your numbered list:

- Explicitly list available options (Option A:..., Option B:..., etc.)
- Evaluate trade-offs briefly for each option
- Select the best option with clear justification

## 4. Define Technical Specifications

Work through detailed specifications for:

- System architecture and component breakdown
- Technology stack with specific versions
- File structures and naming conventions
- Function signatures and API contracts
- Data schemas, formats, and input/output specifications
- Error handling strategies, edge cases, and failure scenarios
- Validation requirements

## 5. Map Dependencies

Document interfaces between components, communication patterns, data contracts, and module responsibilities.

## 6. Specify External Requirements

Identify external libraries with specific versions, APIs and services, configuration needs, and environment setup requirements.

## 7. Organize Plan Structure

Create a preliminary outline of the final plan. Maximize information density: eliminate redundancy between sections, ensure each section provides unique necessary information, and use concise language while maintaining complete technical detail.

## 8. Review Code Samples

For each code sample you are considering including, decide include or exclude: is it truly necessary, or can specifications alone communicate the same thing? Include code only when it is the clearest way to communicate a design decision or architectural pattern, never to show implementation details — the plan specifies the work, it does not write the code for the developer.

# Output Requirements

After completing the scratchpad analysis, write the final implementation plan outside the thinking block and save it as a markdown file in the `./memory-bank/` directory, named `<objective-name>-implementation-plan.md` (e.g., an objective of "user authentication system" produces `user-authentication-system-implementation-plan.md`).

The plan is action-oriented and directive: it contains only the selected decisions — no scratchpad deliberation, option evaluation, or rejected alternatives. It may be consumed by AI agents, so optimize for clarity and token efficiency.

## Example Plan Structure

```markdown
# [Objective Name] Implementation Plan

## Overview
[Brief description of what will be implemented and key architectural decisions]

## Architecture
[Component breakdown, system design, chosen patterns]

## Technology Stack
[Specific tools, libraries with versions, frameworks]

## File Structure
[Directory organization, file naming conventions]
\`\`\`
/project-root
  /src
    /component-a
    /component-b
  /config
\`\`\`

## Component Specifications

### Component A
- **Responsibility**: [What it does]
- **Dependencies**: [What it depends on]
- **Interface**: [API contracts, function signatures]
- **Data Formats**: [Schemas, validation rules]

### Component B
[Similar structure]

## Implementation Steps
1. [Specific, actionable step with all decisions made]
2. [Next step]
3. [Continue...]

## Error Handling
[Strategies for each component, failure scenarios]

## Testing Requirements
[What must be tested, validation criteria]

## Configuration
[Environment variables, config files, setup instructions]

## Dependencies
[External libraries with versions, installation commands]
```

This is an example structure — adapt the sections to fit the specific objective.

# Formatting Guidelines

- Use markdown formatting (headings, lists, code blocks)
- Be specific about tools, versions, formats, and conventions — use actual names, paths, and specifications, never placeholders like "your_file_name_here"
- Anticipate the developer's questions and answer them preemptively in the plan

Begin your work in the scratchpad now.
