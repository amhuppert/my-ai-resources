---
name: transcript-path
description: This skill should be used when the user asks to "find the transcript", "transcript file path", "path to this conversation", "where is the conversation log", "find the jsonl for session X", "transcript for project Y session Z", or otherwise wants to locate the on-disk Claude Code transcript file (.jsonl under ~/.claude/projects/) for the current conversation or another conversation specified by project path and session ID.
---

# Conversation Transcript Path

Locate the on-disk JSONL transcript for a Claude Code conversation — either the current one or any prior conversation given a project path and session ID.

## Storage Layout

Claude Code writes one transcript per session under:

```
~/.claude/projects/<encoded-project-path>/<session-id>.jsonl
```

- `<encoded-project-path>` — the absolute project path (the cwd the conversation was launched from) with every `/` and `.` replaced by `-`.
- `<session-id>` — a UUID such as `06af0d21-295c-4cc7-9f56-a11acd9d9bc0`.

Subagent transcripts (when a session spawned subagents) live one level deeper:

```
~/.claude/projects/<encoded-project-path>/<session-id>/subagents/agent-<short-hash>.jsonl
```

## Encode the Project Path

To convert an absolute project path to its on-disk directory name, replace every `/` and `.` with `-`. All other characters (letters, digits, existing dashes, capitals) pass through unchanged.

| Project path | Encoded directory |
|---|---|
| `/home/alex/github/my-ai-resources` | `-home-alex-github-my-ai-resources` |
| `/home/alex/github/active-recall-2025/.worktrees/feature-x` | `-home-alex-github-active-recall-2025--worktrees-feature-x` |
| `/tmp/claude-mcp-spike-CEk7Dk` | `-tmp-claude-mcp-spike-CEk7Dk` |

Note the `--` in worktree paths: `/.` produces a double dash because both characters are replaced.

One-liner to encode any path with `sed`:

```bash
echo "/abs/path/to/project" | sed 's/[/.]/-/g'
```

To verify the encoding is right, confirm the directory exists:

```bash
ls -d ~/.claude/projects/<encoded-project-path>
```

## Find the Current Conversation's Transcript

Claude does not have direct access to its own session ID inside the conversation. Use the fact that the live transcript is being appended to in real time — its mtime is the most recent.

Procedure:

1. Identify the conversation's launch cwd from the system context (the "Primary working directory" / "current working directory" provided at session start). Do not rely on `pwd` from a Bash call — earlier `cd` commands in the same Bash session may have moved it.
2. Encode that path as above.
3. Pick the most recently modified `.jsonl` in the resulting directory.

```bash
CONV_CWD="<conversation launch cwd>"
PROJECT_DIR="$HOME/.claude/projects/$(echo "$CONV_CWD" | sed 's/[/.]/-/g')"
ls -t "$PROJECT_DIR"/*.jsonl 2>/dev/null | head -n 1
```

To confirm the candidate really is the live conversation (rather than a recently-modified prior one), extract the `sessionId` from its tail and verify it matches the filename's UUID, then confirm the latest entry reflects something that just happened in this session:

```bash
tail -n 5 "<candidate-path>" | grep -o '"sessionId":"[^"]*"' | tail -n 1
```

The session ID inside the file must equal the basename without `.jsonl`. If the user has just sent a recognizable message, also confirm it appears in the last few entries.

## Find a Transcript by Project + Session ID

When the user supplies a project path (or already-encoded directory) and a session ID:

1. If the project is given as a regular filesystem path (contains `/` or `.`), encode it. If it contains no `/` and no `.`, it is already in encoded form — use it as-is.
2. Append `<session-id>.jsonl`.

```bash
project="/home/alex/github/some-project"
session="1234abcd-5678-90ef-1234-567890abcdef"
encoded=$(echo "$project" | sed 's/[/.]/-/g')
path="$HOME/.claude/projects/$encoded/$session.jsonl"
test -f "$path" && echo "$path" || echo "Not found: $path"
```

If the file is missing, also check whether it is a subagent transcript:

```bash
ls "$HOME/.claude/projects/$encoded/$session/subagents/"*.jsonl 2>/dev/null
```

## Verifying the Transcript

Each line in the JSONL is a JSON object. Useful fields on most entries: `type`, `cwd`, `sessionId`, `gitBranch`, `version`, `parentUuid`, `message`. To verify a transcript matches an expected project, find the first line that contains `cwd` and confirm it:

```bash
grep -m1 '"cwd"' "<path>" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('cwd'), d.get('sessionId'))"
```

## Troubleshooting

- **Encoded directory missing**: Double-check the project path. Worktrees have their own encoded directory distinct from the main repo's directory.
- **No `.jsonl` files in the directory**: The session may have crashed before writing, or the directory was created but never produced a turn.
- **Multiple recent files**: The highest-mtime file is the live one. Older files are prior sessions in the same project.
- **Path has unusual characters**: The encoding rule covered here (`/` and `.` → `-`) handles all common cases. If a path contains characters beyond letters, digits, dashes, slashes, and dots, list `~/.claude/projects/` and match against the actual directory name to discover the correct encoding rather than guessing.
