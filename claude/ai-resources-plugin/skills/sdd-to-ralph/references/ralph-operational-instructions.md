# Ralph Operational Instructions

This content MUST be appended to every generated PROMPT.md. Without it, Ralph's exit detection, circuit breaker, and session management systems cannot function.

## Content to Append

```markdown
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

---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | DOCUMENTATION | REFACTORING
EXIT_SIGNAL: false | true
RECOMMENDATION: <one line summary of what to do next>
---END_RALPH_STATUS---

### When to set EXIT_SIGNAL: true

Set EXIT_SIGNAL to **true** when ALL of these conditions are met:

1. All items in fix_plan.md are marked [x]
2. All tests are passing (or no tests exist for valid reasons)
3. No errors or warnings in the last execution
4. All requirements from specs/ are implemented
5. You have nothing meaningful left to implement

### Status Reporting Examples

**Work in progress:**
---RALPH_STATUS---
STATUS: IN_PROGRESS
TASKS_COMPLETED_THIS_LOOP: 2
FILES_MODIFIED: 5
TESTS_STATUS: PASSING
WORK_TYPE: IMPLEMENTATION
EXIT_SIGNAL: false
RECOMMENDATION: Continue with next priority task from fix_plan.md
---END_RALPH_STATUS---

**Project complete:**
---RALPH_STATUS---
STATUS: COMPLETE
TASKS_COMPLETED_THIS_LOOP: 1
FILES_MODIFIED: 1
TESTS_STATUS: PASSING
WORK_TYPE: DOCUMENTATION
EXIT_SIGNAL: true
RECOMMENDATION: All requirements met, project ready for review
---END_RALPH_STATUS---

**Stuck/blocked:**
---RALPH_STATUS---
STATUS: BLOCKED
TASKS_COMPLETED_THIS_LOOP: 0
FILES_MODIFIED: 0
TESTS_STATUS: FAILING
WORK_TYPE: DEBUGGING
EXIT_SIGNAL: false
RECOMMENDATION: Need human help - same error for 3 loops
---END_RALPH_STATUS---

### What NOT to do

- Do NOT continue with busy work when EXIT_SIGNAL should be true
- Do NOT run tests repeatedly without implementing new features
- Do NOT refactor code that is already working fine
- Do NOT add features not in the specifications
- Do NOT forget to include the status block (Ralph depends on it!)

## Exit Scenarios

Ralph's circuit breaker and response analyzer use these to detect completion.

### Successful Completion

All fix_plan.md items marked [x], tests passing, specs implemented → output STATUS: COMPLETE, EXIT_SIGNAL: true

### Test-Only Loop Detected

Last 3 loops only ran tests, no files modified → output STATUS: IN_PROGRESS, WORK_TYPE: TESTING, EXIT_SIGNAL: false. Ralph auto-exits after 3 consecutive test-only loops.

### Stuck on Recurring Error

Same error for 5+ loops, no fix progress → output STATUS: BLOCKED, EXIT_SIGNAL: false. Ralph's circuit breaker opens after 5 loops with same error.

### No Work Remaining

All tasks complete, nothing new in specs, tests passing → output STATUS: COMPLETE, EXIT_SIGNAL: true

### Making Progress

Tasks remain, files modified, tests passing → output STATUS: IN_PROGRESS, EXIT_SIGNAL: false

### Blocked on External Dependency

Cannot proceed without external API, library, or human decision → output STATUS: BLOCKED, EXIT_SIGNAL: false

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
```
