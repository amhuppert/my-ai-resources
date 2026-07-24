---
name: worktree
description: "Create a git worktree for parallel Claude Code sessions."
disable-model-invocation: true
argument-hint: "<branch> [-b, --base <branch>]"
allowed-tools: Bash(ai worktree:*)
---

# Git Worktree Creator

Create a git worktree for parallel AI coding sessions.

Treat the user's invocation input as arguments in the form
`<branch> [-b, --base <branch>]`. If the branch is missing, ask for it. Then run
`ai worktree` with those arguments and report the created worktree path.
