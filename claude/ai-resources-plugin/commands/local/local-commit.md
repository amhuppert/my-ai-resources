---
name: local-commit
description: Commit changes to local private repository using lgit
allowed-tools: Bash(lgit add:*), Bash(lgit status:*), Bash(lgit diff:*), Bash(lgit commit -m:*)
---

# Commit Local Changes

Description of private versioning pattern: !`echo $HOME`/.claude/agent-docs/local-files-pattern.md

This command commits changes to the local private repository using the lgit wrapper.

!`lgit add .`

```bash
% lgit status
!`lgit status`
% lgit diff --cached
!`lgit diff --cached`
```

Think hard about the changes and generate a descriptive commit message.

Commit message format:

```
{one line commit summary}

{more detailed description of changes}
```

Then commit the changes using `lgit commit -m ...".
