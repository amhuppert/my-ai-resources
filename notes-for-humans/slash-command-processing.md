# Claude Code Slash Command Processing

This document describes the exact processing order and capabilities of Claude Code custom slash commands, based on empirical testing.

## Processing Pipeline

When a slash command is invoked, Claude Code processes it through the following stages:

### 1. Initial Markdown Parse

- The command's markdown file is read
- YAML frontmatter is parsed for permissions (`allowed-tools`, etc.)

### 2. Bash Command Expansion (First Pass Only)

- Any `` !`command` `` syntax found in the **original markdown** is executed
- Command output **replaces** the `` !`command` `` syntax inline
- **This is a one-pass operation** - bash commands in generated output are NOT recursively expanded

### 3. @ File Reference Expansion

- The entire expanded content is scanned for `@path/to/file` patterns
- Each `@` reference is converted to a file attachment
- This happens **after** bash command expansion, so dynamically generated `@` references work

### 4. Message Construction

- Multiple messages are created:
  - Message 1: Command metadata (`<command-message>`, `<command-name>`, `<command-args>`)
  - Message 2: The expanded markdown text
  - Messages 3+: File attachments (one per `@` reference)

### 5. API Request

- All messages and attachments are sent to the Claude API
- The model receives the full file contents

## What Works

### ✅ Dynamic File References

Bash commands can output `@` file reference syntax, which will be expanded:

```markdown
!`echo "@path/to/file.txt"`
```

This allows scripts to programmatically generate file references based on logic (e.g., finding all matching files in a directory).

### ✅ Static Bash Commands

Any bash command in the original markdown executes:

```markdown
!`ls -la`
!`git status`
!`read-file some-file.txt`
```

### ✅ Command Arguments

Commands can receive arguments via `process.argv`, including the arguments passed to the slash command if you pass $ARGUMENTS.

## What Doesn't Work

### ❌ Dynamic Bash Command Generation

Bash commands cannot generate other bash commands:

```markdown
!`echo '!\`ls\`'`
```

The inner command syntax will appear as literal text, not be executed. This is a security feature preventing command injection.

### ❌ Recursive Expansion

There is no recursive processing - all expansions happen in a single pass through the pipeline.

## Logging Behavior

### JSONL Logs (`~/.claude/projects/.../[session-id].jsonl`)

- Show the expanded slash command text (after bash execution)
- `@` references appear as **literal strings** (e.g., `@test-file.txt`)
- File attachment contents are **NOT logged**

### Debug Logs (`~/.claude/debug/[session-id].txt`)

When running with `--debug` flag:

- Shows that messages are created: "processPromptSlashCommand creating N messages"
- Shows Message 1 content (metadata)
- Shows Message 2 contains text with `@` references still unexpanded
- Shows Messages 3+ as `[ATTACHMENT]` without actual content
- **File attachment contents are NOT logged**

This means you cannot see the actual file contents sent to the model by examining logs - only that attachments were created.
