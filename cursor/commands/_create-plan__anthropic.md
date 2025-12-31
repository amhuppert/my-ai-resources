Create a highly detailed, decision-complete implementation plan for the current objective that a developer can follow mechanically without needing to make any further technical or design decisions. Your goal is to produce a plan so thorough that implementation becomes a straightforward execution task.

Your task is to develop a comprehensive implementation plan following these guidelines:

**Planning Process:**

1. **Requirements Analysis**: Begin by fully understanding and clarifying the objective. Identify all functional and non-functional requirements, constraints, success criteria, and expected outcomes.

2. **Technical Decision-Making**: For every architectural, technical, or design choice:

   - Identify the decision point
   - List available options
   - Briefly evaluate trade-offs
   - Select and document the preferred option with justification
   - Do NOT leave any decisions open or ambiguous

3. **Decomposition**: Break down the implementation into clear, sequential phases and tasks. Each task should:

   - Have a specific, measurable outcome
   - Include all necessary technical specifications
   - Specify tools, technologies, and libraries to use
   - Define file structures and naming conventions
   - Include function signatures and API contracts where applicable
   - Specify data schemas and formats
   - Define input/output specifications

4. **Edge Cases and Error Handling**: For each component:

   - Anticipate potential edge cases
   - Define error handling strategies
   - Specify expected behaviors for failure scenarios
   - Document validation requirements

5. **Dependencies and Interfaces**: If the plan involves multiple components:

   - Document interfaces between components
   - Specify communication patterns and protocols
   - Define data contracts
   - Clarify responsibilities of each module

6. **External Requirements**: Identify and specify:
   - External libraries and their versions
   - APIs and services required
   - Configuration requirements
   - Environment setup needs

**Working Through Your Plan:**

Use a <scratchpad> section to work through your planning process. In this scratchpad:

- Analyze the objective and break it down
- Identify all decision points
- Evaluate options for each decision
- Work through technical specifications
- Consider edge cases and dependencies
- Organize the structure of your plan

This scratchpad will help you think through everything systematically but will not be part of the final deliverable.

**Format Guidelines:**

- Use markdown formatting (headings, numbered lists, bullet points)
- Be extremely specific and detailed
- Include actual names, paths, and specifications (not placeholders)
- Use code blocks only for actual code snippets, schemas, or file structures
- Ensure every task is actionable without requiring additional decisions

**Critical Reminders:**

- Make ALL decisions during planning—architectural, technical, design, naming, etc.
- Leave NOTHING to the implementor's discretion or interpretation
- Be specific about tools, versions, formats, and conventions
- The plan should be detailed enough that a developer can implement it mechanically
- Anticipate questions and answer them preemptively in the plan

After completing your plan, save it as a markdown file in the `./memory-bank` directory with an appropriate descriptive filename (e.g., `implementation-plan-[project-name].md`).

Your final output should contain only the implementation plan. The scratchpad is for your internal planning process and helps you think through everything systematically, but your final answer should be the polished, complete implementation plan ready for a developer to execute.
