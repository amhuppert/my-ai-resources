# Claude Code Changelog Review

**Period**: April 5, 2026 to April 12, 2026
**Mode**: Default (significant changes only)
**Versions covered**: 2.1.96 through 2.1.101
**Generated**: April 12, 2026

## Highlights

This was one of the more consequential weeks for Claude Code. The Monitor tool introduces a fundamentally new interaction pattern — event-driven background monitoring that replaces expensive polling loops. Enterprise adoption gets a major boost with automatic OS CA certificate trust and an interactive Vertex AI setup wizard. And `/team-onboarding` tackles the human side of AI tooling by generating ramp-up guides from your actual usage.

## Major Features

### Monitor Tool — Event-Driven Background Monitoring

*v2.1.98 — April 9*

Claude Code can now spawn background processes and react to their stdout in real time, without blocking your conversation thread. This replaces the previous pattern of using `/loop` or `ScheduleWakeup` to periodically poll for changes — a pattern that burned a full prompt's worth of tokens every cycle regardless of whether anything happened.

With Monitor, you can tell Claude to watch a log file, tail a dev server, or follow `kubectl logs`, and it will only consume tokens when something interesting actually appears. Each stdout line streams in as an event; if nothing relevant lands, nothing happens.

**Practical use cases**: Watch your Next.js dev server for compilation errors while you keep chatting. Monitor CI logs for a build you just triggered. Tail application logs and have Claude react to errors as they occur.

**Limitations**: Not available on Bedrock, Vertex AI, or Foundry. Follows the same permission rules as the Bash tool.

### `/team-onboarding` — Generate Ramp-Up Guides from Your Usage

*v2.1.101 — April 10*

This command analyzes how you've been using Claude Code locally — your CLAUDE.md configuration, memory files, common workflows — and generates a structured onboarding guide that helps teammates get productive faster. Instead of writing "here's how we use Claude Code" documentation by hand, you can generate it from the patterns you've already established.

This is particularly useful for teams adopting Claude Code incrementally, where one person has dialed in their setup and wants to propagate it. The generated guide pairs naturally with your project's existing CLAUDE.md and steering files.

### Focus View Toggle (`Ctrl+O`)

*v2.1.97 — April 8*

In NO_FLICKER mode, `Ctrl+O` now cycles through view states: normal prompt, transcript mode, and a new focus view. Focus view strips the display down to just your last prompt, a one-line summary of tool calls (with edit diffstats), and Claude's final response. Everything in between — the step-by-step tool output, intermediate reasoning — is collapsed.

This matters for longer interactions where the conversation history pushes your prompt off-screen. Instead of scrolling through pages of tool calls to find what Claude actually concluded, focus view gives you the answer immediately. It's especially useful when reviewing the results of multi-step operations like code reviews or refactoring sessions.

**Requires**: `CLAUDE_CODE_NO_FLICKER=1` environment variable (v2.1.89+).

## Significant Enhancements

### OS CA Certificate Store Trust by Default

*v2.1.101 — April 10*

Claude Code now trusts your operating system's certificate store alongside its bundled Mozilla CAs. This means enterprise TLS-inspection proxies (CrowdStrike Falcon, Zscaler, etc.) work out of the box — no more `NODE_EXTRA_CA_CERTS` workarounds or custom certificate configuration.

This was one of the more persistent friction points for enterprise users. If your company's security infrastructure injects its own root CA (and most do), Claude Code previously needed manual certificate setup that varied by platform. Now it reads the same trust store your browser uses. Set `CLAUDE_CODE_CERT_STORE=bundled` if you specifically need to opt out.

### Interactive Vertex AI Setup Wizard

*v2.1.98 — April 9*

Setting up Claude Code with Google Vertex AI previously required manually exporting environment variables for GCP authentication, project IDs, and region configuration. The new setup wizard, accessible from the login screen under "3rd-party platform", walks you through the entire process: choosing an authentication method (ADC, service account key, or existing environment credentials), selecting your project and region, verifying the connection works, and optionally pinning specific models. Configuration is saved to your user settings file automatically. Run `/setup-vertex` anytime to reconfigure.

### Ultraplan Auto-Creates Cloud Environments

*v2.1.101 — April 10*

Ultraplan — the feature that offloads planning to a cloud session running Opus 4.6 for up to 30 minutes — previously required you to set up a cloud environment through the web interface before you could use it. Now it auto-creates a default environment on first use. This removes what was effectively a prerequisite step that discouraged first-time usage.

### Subprocess Sandboxing with PID Namespace Isolation

*v2.1.98 — April 9*

When `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` is set, Claude Code now strips cloud credentials (Anthropic API keys, AWS tokens, etc.) from Bash, hook, and MCP subprocesses. On Linux, it additionally isolates subprocesses in their own PID namespace so they can't see or signal other processes. Combined with the new `CLAUDE_CODE_SCRIPT_CAPS` variable (which limits per-session script invocations), this gives CI/CD pipelines and automated workflows tighter control over what Claude's subprocesses can access.

### Improved `/agents` Interface

*v2.1.98 — April 9*

The `/agents` command now has a tabbed layout: a **Running** tab shows live subagent instances with their status, and a **Library** tab lists available agent types with actions to run or view instances. Agent types with active instances show a `● N running` indicator. This makes it significantly easier to manage multiple concurrent background agents.

### Rate-Limit Retry Messages Now Show What Was Hit

*v2.1.101 — April 10*

When you hit a rate limit, the retry message now tells you which specific limit was triggered and when it resets, replacing the previous opaque countdown. Small quality-of-life change, but if you're hitting limits frequently (common on Team/Pro plans during heavy usage), knowing whether it's a tokens-per-minute or requests-per-minute limit helps you decide whether to wait or adjust your approach.

## Security Fixes Worth Noting

Three security fixes in this period warrant attention:

- **Command injection in POSIX `which` fallback** (v2.1.101): A vulnerability in the LSP binary detection path could allow command injection. Fixed.
- **Bash tool permission bypass via backslash-escaped flags** (v2.1.98): A backslash-escaped flag could trick the permission system into auto-allowing a command as read-only, enabling arbitrary code execution.
- **Compound Bash commands bypassing forced permission prompts** (v2.1.98): In auto and bypass-permissions modes, compound commands could skip safety checks that should have been enforced.

If you're running Claude Code in automated environments or with relaxed permission modes, updating to 2.1.101 is particularly important.

## Summary

The theme of this week is Claude Code maturing for both individual power users and enterprise teams. The Monitor tool represents a genuine paradigm shift in how background tasks work — moving from expensive polling to event-driven streaming. The enterprise improvements (CA trust, Vertex wizard, subprocess sandboxing) lower adoption barriers in corporate environments. And the UX refinements (focus view, `/agents` tabs, better rate-limit messages) show continued polish for daily users. The security fixes in Bash tool permissions are a reminder to stay current, especially in automated or CI environments.
