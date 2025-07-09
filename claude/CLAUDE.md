# CLAUDE.md

## Auto-Checkpointing

<critical>
  ALWAYS create checkpoints making BEFORE edits: `git commit -am "[AUTO] Before {brief summary}"`
  
  NEVER commit to `main` branch. If on `main`, create `feat/{branch-name}` branch first.
</critical>

## MCP Tools

- Use context7 MCP tools for latest 3rd party library docs.

## Rules

- Code formatter runs automatically in PostToolUse hook; do NOT run formatter again.
