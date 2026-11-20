# General code standards

## Control flow

Prefer early returns and guard clauses over deeply nested conditionals.

## Comments

Write comments only when the code cannot express the information directly:

- Why an approach was chosen over alternatives
- Business constraints or external requirements
- Non-obvious gotchas or edge cases
- Complex algorithms that need plain-language explanation

Do not add comments that restate what the code already shows:

```ts
// Bad: restates the line below
const role = session.accountMappings[accountId];

// Good: explains an external constraint invisible in the code
// Delay 2s because the Stripe webhook arrives before the DB commit finishes
await new Promise((resolve) => setTimeout(resolve, 2000));
```

Keep comments evergreen. Describe the current state of the code, never what changed, what was removed, or words like "new", "improved", "enhanced", or "recently refactored". Remove obsolete comments when refactoring, and do not delete existing comments unless you have verified they are factually wrong.

## Error handling

- Handle errors at system boundaries where external failures realistically happen (APIs, filesystem, network, user input).
- Let unexpected internal errors propagate instead of swallowing them; an uncaught failure surfaces bugs faster than defensive fallbacks for impossible states.
- Validate external payloads with Zod at the boundary where they enter the service layer, and let validation errors throw immediately.

## Software design

- **YAGNI:** do not add speculative features, hooks, or abstractions beyond current needs. When it does not conflict with YAGNI, keep boundaries clean enough to extend later.
- **Clarity over cleverness:** favor simple, readable, maintainable code even when a denser or slightly faster alternative exists.
- **Deduplicate real repetition:** factor out duplicated logic when the shared behavior is genuine, not accidental.
- **Explicit approval for high-risk scope changes:** stop and ask the user before discarding and rewriting an existing implementation from scratch, or before adding backward-compatibility shims.
