<user-instructions>

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

</user-instructions>
