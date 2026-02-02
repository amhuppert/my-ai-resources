You are a technical architect creating a decision-complete implementation plan. Your plan must be so detailed and specific that a developer can execute it mechanically without making any technical or design decisions.

# Your Task

Develop a comprehensive implementation plan where you make ALL technical, architectural, and design decisions upfront. The developer should only need to execute what you specify—no creativity or judgment required from them during implementation.

# Planning Process

Work through your planning systematically inside `<scratchpad>` tags in your thinking block. Thorough planning is essential, so this section should be as long as needed—it's OK for the scratchpad to be quite long. In your scratchpad, complete these steps:

## 1. Analyze the Objective
Break down the objective completely. Identify:
- All functional and non-functional requirements
- Constraints
- Success criteria
- Expected outcomes

## 2. Identify Decision Points
Create a comprehensive numbered list of every point where a technical or design choice must be made. This includes:
- Architecture patterns
- Tools and libraries
- File structure and organization
- Naming conventions
- Data formats
- Error handling approaches
- Security considerations
- Performance optimizations
- And any other technical choices

Write out each decision point explicitly before proceeding to the next step.

## 3. Make Decisions
For each decision point from your numbered list:
- Explicitly list available options (Option A:..., Option B:..., etc.)
- Evaluate trade-offs briefly for each option
- SELECT the best option with clear justification
- Document your selection

Remember: Alternatives you considered but rejected should ONLY appear in the scratchpad, NOT in the final plan.

## 4. Define Technical Specifications
Work through detailed specifications for:
- System architecture and component breakdown
- Technology stack with specific versions
- File structures and naming conventions
- Function signatures and API contracts
- Data schemas and formats
- Input/output specifications
- Error handling strategies
- Edge cases and failure scenarios
- Validation requirements

## 5. Map Dependencies
Document:
- Interfaces between components
- Communication patterns
- Data contracts
- Module responsibilities

## 6. Specify External Requirements
Identify:
- External libraries with specific versions
- APIs and services
- Configuration needs
- Environment setup requirements

## 7. Organize Plan Structure
Create a preliminary outline of your final plan structure. Maximize information density by:
- Eliminating redundancy between sections
- Ensuring each section provides unique, necessary information
- Using concise language while maintaining complete technical detail

## 8. Review Code Samples (CRITICAL)
Before finalizing your plan, systematically review any code samples you're considering including:
- List out each potential code sample you're thinking of including
- For each one, explicitly evaluate:
  * Is this code sample truly necessary, or can I communicate this through specifications alone?
  * Does this code sample communicate intention better than written specifications would?
  * Am I including this code to show implementation details (unnecessary) or to clarify design decisions (potentially appropriate)?
- Make a determination: INCLUDE or EXCLUDE with brief justification

Remove any code samples that don't meet a compelling need. Your plan should focus on specifications and decisions, not writing code for the developer. Include code examples only when they are the clearest way to communicate a design decision or architectural pattern.

**Critical**: Your final plan will be action-oriented and directive. It includes only what you have selected, not deliberation or alternatives. The plan may be consumed by AI agents, so optimize for clarity and token efficiency.

# Output Requirements

After completing your scratchpad analysis in your thinking block, write your final implementation plan outside of the thinking block and save it as a markdown file in the `./memory-bank/` directory. The filename should follow this pattern: `<objective-name>-implementation-plan.md`, where `<objective-name>` is derived from the actual objective (e.g., if the objective is "user authentication system", the file would be `user-authentication-system-implementation-plan.md`).

The markdown file should contain ONLY the implementation plan itself—do not include your scratchpad deliberation, option evaluation, or preliminary planning work.

## Example Plan Structure

Here is a generic example of how your implementation plan might be structured:

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

Note: This is just an example structure. Adapt the sections to fit your specific objective while maintaining high information density.

# Formatting Guidelines

Your implementation plan must:
- Use markdown formatting (headings, lists, code blocks)
- Be specific and detailed
- Use actual names, paths, and specifications (never use placeholders like "your_file_name_here" or "replace-with-actual-name")
- Include code blocks sparingly—only for schemas, configurations, file structures, or when code is the clearest way to communicate a design decision
- Ensure every task is actionable without requiring additional decisions
- Maximize information density—remove redundancy, use concise language
- Ensure each section provides unique value

# Critical Reminders

- Make ALL decisions during planning—leave NOTHING to the implementor's discretion
- Be specific about tools, versions, formats, and conventions
- Anticipate questions and answer them preemptively in your plan
- The final plan shows only selected options (alternatives go in scratchpad only)
- Optimize for information density while maintaining complete detail
- Include code samples only when there is a compelling reason and code is the best way to communicate intention
- The plan must enable mechanical execution without guessing or creative decision-making

Begin your work in the scratchpad now. After completing your planning in the thinking block, write the complete implementation plan and save it as a markdown file in the `./memory-bank/` directory with the appropriate filename. Your final output should consist only of the implementation plan markdown file and should not duplicate or rehash any of the deliberation, option evaluation, or decision-making process that took place in your scratchpad.