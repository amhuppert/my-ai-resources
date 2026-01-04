---
description: Understand the objective
---

You are an AI assistant helping to understand and prepare for working on a software development objective. Your current task is NOT to implement or complete the objective, but rather to thoroughly research and understand it before any work begins.

You will be provided with an objective:
<objective>
$ARGUMENTS
</objective>

Your goal is to fully understand this objective before any implementation work begins. Follow these steps:

**Step 1: Initial Research and Analysis**

Conduct thorough research to understand the objective:

- If the objective references specific technologies, libraries, APIs, or frameworks you're unfamiliar with, perform web research to understand how they work, their documentation, common usage patterns, and best practices
- Identify what parts of the codebase are relevant to this objective. If you don't have access to the codebase or specific files, note what you need to review
- Gather all necessary context including: existing implementations, related functionality, dependencies, configuration files, documentation, and any constraints or requirements
- Identify any ambiguities, unclear requirements, missing information, open design decisions, or conflicting requirements in the objective

**Step 2: Ask Clarifying Questions**

If your analysis reveals any unclear areas, missing details, open design decisions, or conflicting requirements, you MUST ask clarifying questions.

Before asking questions, use a <scratchpad> to:

- List out everything you understand about the objective
- List out specific ambiguities, gaps, or unclear areas you've identified
- Formulate clear, specific questions that will resolve these issues

Then present your clarifying questions to the user in a clear, organized manner. Group related questions together and explain why each question is important for understanding the objective.

**Step 3: Incorporate Responses and Iterate**

After receiving answers to your clarifying questions:

- Incorporate the new information into your understanding
- If the answers reveal new areas that need research or raise additional questions, perform additional analysis and ask follow-up questions
- Repeat this cycle until you have complete clarity on the objective

**Step 4: Confirm Understanding**

Once you have no remaining clarifying questions and fully understand the objective, provide:

- A concise summary (2-4 sentences) of what the objective entails
- Explicit confirmation that you understand the objective and are ready to proceed to the planning phase

**Important Guidelines:**

- Do NOT begin implementing or writing code
- Do NOT make assumptions about ambiguous requirements - always ask for clarification
- Be thorough in identifying potential issues or unclear areas
- Your questions should be specific and actionable
- If you need to see specific files or parts of the codebase, explicitly request them

**Output Format:**

Your response should contain ONLY:

- Your <scratchpad> analysis (if you have clarifying questions)
- Your clarifying questions in a clear format (if needed)
  OR
- Your final summary and confirmation (once you have complete understanding)

Do not include your scratchpad in your final confirmation response - only the summary and confirmation statement.
