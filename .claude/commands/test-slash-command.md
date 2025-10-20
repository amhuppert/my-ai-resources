---
description: Test TypeScript script argument passing
allowed-tools: Bash(bun run:*), Bash(read-file:*)
---

This is a command for testing/verifying Claude Code custom slash command functionality.

## 0. Context

Working directory: !`pwd`

## 1. Claude `@` File References - Project File

Referencing test-file.txt (this will work):

@test-file.txt

## 2. read-file Tool - Project File

Using the read-file tool to read test-file.txt (this will work):

!`read-file test-file.txt`

## 3. TypeScript template command - `@` File References

The TypeScript script will echo the arguments received and some `@` file reference syntax for reading test-file.txt. It will then use the read-file tool to read test-file.txt.

- File references will work (they are processed after bash command expansion)
- Bash commands syntax (`read-file` in this case) will NOT work (Bash commmands are run in one pass only, not recursively)

```
!`bun run /home/alex/github/my-ai-resources/typescript/scripts/test-slash-args.ts $ARGUMENTS`
```

Agent Task: Summarize the output. Any takeaways?
