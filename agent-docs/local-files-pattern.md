## Local Changes Versioning Pattern

**Architecture**: Dual-repo setup with shared public repo + private local repo for personal files.

```
shared-repo/
├── .git/              ← public repo (team)
├── .local/            ← private bare repo (personal)
└── .cursor/, memory-bank/, dev-local/, CLAUDE.md, etc.  ← versioned privately
```

### Key Commands

**lgit** = wrapper around `git --git-dir="$PWD/.local" --work-tree="$PWD"`:

```bash
lgit status           # see private changes
lgit add .cursor/     # stage private files
lgit commit -m "msg"  # commit private changes
lgit push             # backup to private remote
```

### What's Tracked Privately

Private repo ignores all files by default (via `.gitignore` or `.git/info/exclude`), then whitelists:

- `.cursor/` (project rules, settings)
- `memory-bank/`
- `.claude/`
- `dev-local/`
- `CLAUDE.md`
- possibly others...

### Branch Sync

Private repo auto-follows public repo branches via post-checkout hook.
When you `git switch feature/foo`, private repo also switches to `feature/foo`.

### Usage for Claude Code

- Use `lgit` for any operations on `.cursor/`, `memory-bank/`, or other private files
- Use regular `git` for shared project files
- Private files are invisible to teammates (in `.gitignore`)
