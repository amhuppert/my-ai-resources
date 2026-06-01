# Claude Code Changelog Review

**Period**: April 13, 2026 to May 30, 2026
**Mode**: Default (significant changes only)
**Versions covered**: 2.1.102 through 2.1.158
**Generated**: May 30, 2026

> **Coverage note**: This review continues from the previous one, which ended at 2.1.101 (April 12). Entries from 2.1.117 onward were retrieved in full. Versions 2.1.102–2.1.116 (≈April 13–22) could not be retrieved — both the hosted changelog and the GitHub raw file truncate before reaching them. Based on the surrounding releases, that window appears to have been incremental fixes rather than headline features, but it is not independently verified here.

## Highlights

This was a transformative seven weeks — arguably the largest single jump in Claude Code's capabilities since background agents shipped. Three things define the period: **Opus 4.8** landed as the new default model alongside **dynamic workflows**, which let Claude orchestrate tens to hundreds of background agents from a single prompt. The new **agent view** (`claude agents`) turned background execution from a niche feature into a first-class workspace where every session — running, blocked, or done — lives in one list. And **auto mode** quietly graduated from an opt-in experiment to the default permission experience. Underneath all of it, the largest share of changelog volume by far went to hardening background/detached sessions, which is the throughline connecting nearly every release.

## Major Features

### Opus 4.8 — New Default Model

*v2.1.154 — May 28*

Opus 4.8 is now the default model and defaults to **high effort**, with a new `/effort xhigh` tier reserved for the hardest tasks. The economics of fast mode shifted meaningfully too: on Opus 4.8, fast mode now costs 2× the standard rate for 2.5× the speed — a far better ratio than before, making "fast" a genuinely viable everyday setting rather than a premium splurge.

Two related changes matter for daily use. First, the **lean system prompt is now the default** for all models except Haiku, Sonnet, and Opus 4.7-and-earlier — meaning 4.8 starts every session with less baseline context overhead, leaving more room for your actual work. Second, Claude now **reserves the multiple-choice question prompt** (`AskUserQuestion`) for decisions it genuinely cannot make on its own, rather than interrupting you when it already has enough context to proceed. If 4.8 feels like it asks fewer clarifying questions, that's deliberate.

A migration note for fast-mode users: `CLAUDE_CODE_OPUS_4_6_FAST_MODE_OVERRIDE` is deprecated and slated for removal on June 1. To keep fast mode on Opus 4.6, switch with `/model claude-opus-4-6[1m]` then `/fast on`.

### Dynamic Workflows — Orchestrate Hundreds of Agents

*v2.1.154 — May 28*

This is the period's most consequential new capability. You can now ask Claude to **create a workflow**, and it will author and run a script that orchestrates work across tens to hundreds of subagents in the background — fanning out parallel searches, running adversarial verification passes, pipelining multi-stage transforms, and synthesizing results. Run `/workflows` to view your runs.

Why it matters: this is a step-change in the scale of work a single request can take on. Tasks that were previously too large for one context window — auditing an entire codebase, migrating every call site of a deprecated API, researching a question across dozens of sources — become tractable because the orchestration runs as deterministic JavaScript while the individual agents do the bounded work. It's the difference between "Claude does the task" and "Claude builds a machine that does the task."

Practical caveats discovered around the rollout: workflows can spawn dozens of agents and consume a large amount of tokens, so they're meant for genuinely large work, not quick checks. The feature is keyword-triggered — and that created enough noise that the team shipped a **"Workflow keyword trigger" setting in `/config`** (v2.1.158) to stop the literal word "workflow" appearing in a prompt from spuriously kicking one off. Pressing backspace right after the trigger keyword now dismisses the request (same as `alt+w`). There was also a bug, since fixed, where the term "workflow" anywhere in output created a spurious trigger and made long output unreadable.

### Agent View (`claude agents`) — One List for Every Session

*v2.1.139 — May 11 (Research Preview)*

`claude agents` opens a single dashboard listing every Claude Code session — running, blocked on your input, or done. This is the UI that makes background execution actually usable: instead of losing track of detached sessions, you get a live roster with awaiting-input counts (even surfaced in the terminal tab title so an alt-tabbed window tells you when an agent needs you), PR columns, and the ability to attach/detach at will.

The agent view accumulated an enormous amount of polish over the following two weeks — by my count it was the single most-touched area in the period. Highlights that affect workflow:

- **Background shell sessions**: type `! <command>` in the dispatch input to run a shell command as an attachable/detachable background session, also available as `claude --bg --exec '<command>'` (v2.1.154).
- **Configuration parity**: dispatched sessions now honor `--add-dir`, `--settings`, `--mcp-config`, `--plugin-dir`, `--permission-mode`, `--model`, `--effort`, and `--dangerously-skip-permissions` (v2.1.142–143).
- **`--json` output** for scripting status bars and session pickers (v2.1.145).
- **Pinned sessions** (`Ctrl+T`) stay alive when idle and restart in place to apply updates (v2.1.147).
- **Resume integration**: `claude --bg` sessions now appear in `/resume`, marked `bg` (v2.1.144).

If you tried background agents earlier and found them hard to keep track of, this is the release that fixes that.

### `/goal` — Persistent Completion Conditions

*v2.1.139 — May 11*

The `/goal` command lets you set a **completion condition** and Claude keeps working across turns until that condition is met — in interactive, `-p`, and Remote Control modes. A live overlay panel shows elapsed time, turn count, and token spend so you can watch the cost accumulate.

This is distinct from `/loop` (which repeats on an interval) and from a single long turn: `/goal` is outcome-driven. You describe what "done" looks like — "all tests pass," "no TypeScript errors in `src/`" — and Claude iterates autonomously toward it. A follow-up fix (v2.1.143) stopped the evaluator from firing prematurely while background shells or delegated subagents were still running, which is important: the goal should only be judged complete once the work it spawned actually finishes.

## Significant Enhancements

### Auto Mode Goes Mainstream

Auto mode — where a safety classifier evaluates each action instead of prompting you — matured from experiment to default over the period:

- **No more opt-in consent** required (v2.1.152, May 27).
- **Available on Bedrock, Vertex, and Foundry** for Opus 4.7 and 4.8 via `CLAUDE_CODE_ENABLE_AUTO_MODE=1` (v2.1.158, May 30) — previously first-party only.
- The classifier got better at **detecting data exfiltration**, particularly bulk transfers of repository contents (v2.1.154), and a new `autoMode.hard_deny` setting (v2.1.136) lets you define rules that block unconditionally regardless of inferred user intent.

The trajectory here is clear: Anthropic is positioning auto mode as the everyday permission experience, with the classifier — not a wall of prompts — as the primary guardrail. If you've avoided it, it's worth re-evaluating now that it's the default and the exfiltration detection has tightened.

### `/code-review` and `/simplify` Settle Into Distinct Roles

These two commands churned through several identities this period before landing in a sensible split — worth understanding if you use either:

- **v2.1.147**: `/simplify` was *renamed* to `/code-review`, now reporting correctness bugs at a chosen effort level (e.g. `/code-review high`), with `--comment` to post findings as inline GitHub PR comments. The old cleanup-and-fix behavior was removed.
- **v2.1.152**: `/code-review --fix` gained the ability to apply review findings to your working tree, and `/simplify` was reintroduced as an alias for it.
- **v2.1.154**: The split finalized — **`/simplify` now runs a cleanup-only review** (reuse, simplification, efficiency, altitude) and applies fixes, while **`/code-review` hunts for correctness bugs**. They're now genuinely different tools: one for quality cleanup, one for bug-finding.

If you scripted against the intermediate behaviors, re-check them — this area moved three times in two weeks.

### Plugins Without a Marketplace

*v2.1.157 — May 29*

Plugins dropped into `.claude/skills` directories are now **automatically loaded with no marketplace required**, and `claude plugin init <name>` scaffolds a new plugin there. This substantially lowers the barrier to local/project-specific plugins — you can now just create a directory and have it picked up, rather than standing up a marketplace entry. Combined with the new `/reload-skills` command (v2.1.152) and `SessionStart` hooks that can return `reloadSkills: true`, the skill-authoring loop is now fast enough to iterate on within a single session.

### Skills and Hooks Gain Real Control Surfaces

A cluster of changes made skills and hooks meaningfully more powerful:

- **`disallowed-tools` in skill/command frontmatter** (v2.1.152) removes tools from the model while a skill is active — useful for forcing a skill down a specific path.
- **`MessageDisplay` hook** (v2.1.152) lets hooks transform or hide assistant message text as it's displayed.
- **`SessionTitle` and `ToolSearch` hook events** (v2.1.118) compute custom session titles and customize which tools appear in a session (e.g. hiding archived MCP servers).
- **Hooks can invoke MCP tools directly** via `type: "mcp_tool"` (v2.1.118), and `PostToolUse` hooks can replace tool output for all tools, not just MCP (v2.1.121).
- **Effort awareness**: hooks now receive the active effort level (`effort.level` / `$CLAUDE_EFFORT`), and Bash commands can read `$CLAUDE_EFFORT` (v2.1.133).

### `/usage` Becomes the One-Stop Cost Dashboard

*v2.1.118, v2.1.149*

`/cost` and `/stats` were **merged into `/usage`** (both remain as typing shortcuts to the relevant tab). More usefully, `/usage` now shows a **per-category breakdown of what's driving your limits** — skills, subagents, plugins, and per-MCP-server cost (v2.1.149). For anyone trying to understand why they're hitting rate limits, this finally attributes consumption to specific sources instead of one opaque number.

### Editor and Terminal Quality of Life

*v2.1.118 and throughout*

- **Vim visual mode** (`v`) and visual-line mode (`V`) with selection and operators (v2.1.118).
- **Custom named themes**: create and switch from `/theme`, or hand-edit JSON in `~/.claude/themes/`; plugins can ship themes (v2.1.118).
- **`/compact` subcommand** to manually trigger compaction with a preview and confirmation (v2.1.118), plus a Rewind-menu "Summarize up to here" option (v2.1.141).
- **GFM task-list checkboxes** now render as real checkboxes in markdown output (v2.1.149).
- **Read tool partial view**: a whole-file read that exceeds the token limit now returns a truncated first page with a "PARTIAL view" notice instead of a hard error (v2.1.145) — you'll see this behavior in this very review's tool output.

## Developer Experience

### Worktree and Background Isolation Controls

The background-agent machinery exposed several new knobs for teams whose repos don't fit the default assumptions:

- **`worktree.baseRef`** (`fresh` | `head`, v2.1.133) chooses whether new worktrees branch from `origin/<default>` or local `HEAD`. Note the default `fresh` changed `EnterWorktree`'s base back to `origin/<default>` — set `head` to keep unpushed commits. This setting flip-flopped a couple of times (see 2.1.128), so verify your behavior explicitly.
- **`worktree.bgIsolation: "none"`** (v2.1.143) lets background sessions edit the working copy directly, for repos where worktrees are impractical.
- A meaningful safety fix: worktree cleanup **no longer falls back to `rm -rf`** when `git worktree remove` fails (v2.1.143), preventing loss of gitignored or in-progress files.

### Windows / PowerShell Becomes First-Class

A sustained push made Windows a properly supported platform rather than a compatibility afterthought:

- **Git for Windows is no longer required** — when absent, Claude Code uses PowerShell as the shell tool (v2.1.120).
- The **PowerShell tool is enabled by default** on Windows for Bedrock/Vertex/Foundry users (v2.1.143) and now passes `-ExecutionPolicy Bypass` by default.
- Numerous permission-parsing fixes for PowerShell allow rules, plus detection of PowerShell installed via Microsoft Store / winget / .NET global tool.

### Security Hardening

Several permission-bypass holes were closed — worth noting because they affect the trust model:

- A **PowerShell permission bypass** where built-in `cd` functions (`cd..`, `cd\`, etc.) changed the working directory undetected, letting a later command read outside the workspace (v2.1.149).
- **Bare variable assignments** to non-allowlisted env vars in Bash commands being auto-approved (v2.1.145).
- Enterprise **login restrictions** (`forceLoginOrgUUID`, `forceLoginMethod`) not being enforced against third-party-provider and API-key sessions (v2.1.147).
- A custom API gateway potentially receiving the user's **Anthropic OAuth credential** instead of the gateway's own token (v2.1.153).

### Notable Operational Fixes

- **Startup hang up to 75s** when `api.anthropic.com` is unreachable (captive portal, VPN) — side-channel calls now time out after 15s (v2.1.144).
- **`find` in the Bash tool exhausting the macOS file/vnode table and crashing the host** on large directory trees (v2.1.149, with related fixes in 2.1.120/2.1.121).
- **Multi-GB memory growth** from image-heavy sessions, `/usage` on large histories, and stdio MCP servers writing non-protocol data to stdout (v2.1.121, v2.1.132).
- **1-hour prompt cache TTL silently downgraded to 5 minutes** (v2.1.129) — a real cost regression for cache-heavy workflows, now fixed.

## Summary

The connective theme of this period is **scale and autonomy**. Opus 4.8 raised the ceiling on what a single agent can reason through; dynamic workflows raised the ceiling on how many agents one prompt can marshal; `/goal` and the agent view made long-running, multi-session autonomous work something you can dispatch and supervise rather than babysit; and auto mode removed the prompt-wall friction that made autonomy tedious. Everything else — the relentless background-session hardening, the worktree controls, the Windows push — is infrastructure in service of that same direction: Claude Code is increasingly built to run *more work, more independently, for longer*, with the human supervising a fleet rather than driving a single thread. The flip side, visible in the workflow-keyword-trigger noise and the `/code-review` churn, is that features are shipping fast enough that the UX is still settling — worth keeping an eye on `/config` and re-reading frontmatter behaviors if you automate against these tools.
