<user-level-instructions>

## Auto-Checkpointing

<critical>
  ALWAYS create checkpoints making BEFORE edits: `git commit -am "[AUTO] Before {brief summary}"`
  
  NEVER commit to `main` branch. If on `main`, create `feat/{description-of-changes}` branch first.
</critical>

## MCP Tools

- Use context7 MCP tools for latest 3rd party library docs.

## Rules

- Code formatter runs automatically in PostToolUse hook; do NOT run formatter again.
- **Control Flow**: Prefer early returns over nested conditionals for readability.
- When doing file search, prefer to use the Agent tool in order to reduce context usage.

## Commenting Rules

Only comment when code cannot convey the information:

- Why approach was chosen over alternatives
- Business constraints/requirements
- Non-obvious gotchas or edge cases
- Complex algorithms requiring explanation

<example type="invalid">
```ts
// Get the role for this account from the session
const role = session.accountMappings[accountId];
```
❌ Restates what code already shows clearly.
</example>

<example type="valid">
```ts
// Intentionally delay 2s - Stripe webhook arrives before DB commit completes
await new Promise(resolve => setTimeout(resolve, 2000));
```
✅ Explains constraint impossible to know from code alone
</example>

<example type="valid">
```ts
// Round down per EU regulatory requirement EU-2019/876
const taxAmount = Math.floor(grossAmount * 0.20);
```
✅ Explains requirement impossible to know from code alone
</example>

</user-level-instructions>
