# Token optimization for browser automation

Browser automation burns context mostly through accumulation: every inline snapshot stays in conversation history. Use these numbers and patterns to keep sessions lean.

## Cost baseline

| Source | Approximate cost |
| --- | --- |
| MCP tool definitions (core 22 tools) | ~3,400 tokens per message |
| Accessibility snapshot (typical page) | ~3,800 tokens |
| Accessibility snapshot (complex app) | 50,000 to 540,000 tokens |
| Screenshot (typical page) | ~10,000+ tokens |
| Full MCP automation session | ~114,000 tokens |
| Equivalent CLI session | ~27,000 tokens |

## CLI vs. MCP

Microsoft's benchmarks show roughly a 4x token reduction (114K to 27K) for equivalent tasks using Playwright CLI instead of MCP:

| Factor | CLI | MCP |
| --- | --- | --- |
| Snapshot delivery | Saved to disk as YAML | Streamed inline into context |
| Stale context after 20 steps | ~0 tokens | ~60,000 to 80,000 tokens |
| Idle schema overhead | None | ~3,400 tokens per message |
| Parallel sessions | Named sessions (`-s=name`) | Not supported |

Default to CLI. Fall back to MCP only when no shell is available or for a 1 to 3 step check. For MCP flag tuning and tool scoping (`--codegen none`, `--console-level error`, `--image-responses omit`, `selector`/`depth`/`filename`, `browser_fill_form`), see [`playwright-mcp-reference.md`](playwright-mcp-reference.md).

## Workflow habits that save tokens

- **Isolate multi-step work in a subagent.** When the host supports subagents, pass the URL, exact steps, and assertions so page state accumulates inside the subagent and only the pass/fail result returns to the main thread.
- **Go straight to the target URL.** Every navigation emits a new snapshot. Jump directly to `/users/1/edit` instead of clicking through `/users` and `/users/1`.
- **Supply URLs and selectors upfront.** Naming exact paths and `data-testid` attributes prevents exploratory round trips.
- **Extract data with JavaScript evaluation.** When you only need counts, text, or DOM state, run `playwright-cli eval "..."` (or `browser_evaluate` in MCP) rather than loading full snapshots across multiple pages.
- **Reuse auth state.** Log in once (or manually in a headed browser), save state, and reload it instead of replaying a 5 to 10 step login flow on every run:

  ```bash
  playwright-cli state-save auth.json
  playwright-cli state-load auth.json
  ```

- **Skip screenshots unless layout matters.** Accessibility snapshots already confirm DOM state after every action. Reserve screenshots for visual styling, layout bugs, and canvas/WebGL.

## Expensive mistakes to avoid

1. Reaching for MCP when the CLI is available.
2. Taking screenshots after every step "just to check."
3. Leaving MCP defaults on (`--console-level info`, `--codegen typescript`, `--image-responses allow`) or enabling unused `--caps`.
4. Taking unscoped full-page snapshots on dense SPAs instead of passing `selector`, `depth`, or `filename`.
5. Sending separate `browser_type` calls per input instead of batching with `browser_fill_form`.
6. Keeping the Playwright MCP server connected during unrelated work.
