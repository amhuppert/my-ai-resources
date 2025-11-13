# AI Agent Workflows

## Explore → Plan → Implement → Review

1. Explore: Understand the problem-space.
2. Plan: Develop a detailed implementation plan.
3. Implement: Code the solution according to the plan.
4. Review: User reviews the code and provides feedback.

## Architect and Implementer

Use two Claude Code agents in parallel: one focused on planning and reviewing ("Architect"), and the other focused on implementing ("Implementer").
The Architect reviews the work of the Implementer to ensure it follows the plan.

## Prime Context, Duplicate Chat

- Ask agent to prepare a detailed plan to complete a task and save it to a file.
- Once the plan is created, duplicate the chat to start work on each phase.
- That way, the context is always primed.
