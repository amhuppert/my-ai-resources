---
name: query-output-disclosure
description: Design progressive disclosure for the data agent-facing query
  commands return — bounded summary/outline defaults with stable zoom-in
  handles, explicit omission lines naming the exact follow-up command, and an
  escalation ladder from counts to scoped detail to file spillover. Includes a
  pattern menu (detail levels, field selection, filtering, pagination, search,
  ranked aggregation, sampling, delta output) and how query output doubles as an
  instruction surface. Use when designing list/show/search/status verbs for an
  agent CLI, when a query command can return large output, when an agent burns
  context reading query results, or when choosing default output size and
  drill-down flags for a read command.
---

# Query Output Disclosure

Progressive disclosure is most visible in help systems, but the same economics govern the data real commands return. A query verb that can emit hundreds of kilobytes decides, on the agent's behalf, to spend a huge slice of its context window — and unlike a file the agent chose to read with an offset, the cost arrives all at once. The inversion to internalize: **round trips are cheap; context is not.** An extra invocation costs a process spawn; an oversized result occupies the context window for the rest of the session. Design read verbs so the default answer is a bounded digest and every deeper level is one obvious command away.

## Two payloads, one disclosure graph

The tool surface discloses two kinds of content — instructions and data — and the split across commands is deliberately not clean:

- Help nodes disclose instructions almost exclusively (`progressive-disclosure-tooling`).
- Query commands disclose data primarily, but they participate in instruction disclosure too: success hints naming the next verb, usage errors listing valid children, reminders carrying invariants (`agent-feedback-tiers`).
- Some lines are both at once. "…and 130 more — narrow with `--status failed`" discloses a fact about the data (what was omitted) and an instruction (the exact command that reveals more).

Never treat instruction disclosure as confined to `--help`: a query command's output is often the highest-recency place to teach the agent its own next step.

## The default is a bounded digest

The default output of a query command is a summary or outline: enough structure to decide where to zoom, not the content itself.

- **Output size is a function of the flags, not the data.** The default level stays roughly constant as the underlying data grows — more records make the counts bigger, not the output longer.
- **Give each read verb an explicit output budget** (lines or tokens) and treat exceeding it as a defect, the same class as a wrong exit code.
- **Counts instead of contents.** "143 matches across 12 files, top 10 shown" beats 143 matches.
- **Diagnostics have a noise/signal split; data does not.** For linters and test runners the answer to volume is suppression — hide successes, keep failures (`ai-readable-tool-output`). Query data has no failure subset to keep; the answer is layering, not suppression.

## Every outline item carries its handle

Zoom-in only works if the agent can name what it wants next. Each outline item carries the stable identifier the follow-up command accepts verbatim — an id, path, section name, or line range.

- The handle round-trips: it appears in outline output exactly as the drill-down verb expects it (`show 7f3a`, `--section auth`, `--lines 120-180`).
- Handles are stable across invocations. Positional indexes that renumber when sort order or filters change point tomorrow's command at the wrong item.
- An outline without handles is a dead end: the agent sees that detail exists but must guess how to address it.

## Omission is explicit and actionable

Silent truncation reads as completeness — worse than dumping, because the agent draws conclusions from data it doesn't know is partial.

- Every cut states what was omitted, at minimum as a count: `showing 20 of 143`.
- The omission line names the exact next command: narrow (`--status failed`), page (`--offset 20`), or deepen (`show <id>`).
- In `--json` mode the same facts are structural: `total`, `returned`, `truncated`, a `next` cursor. Omission metadata is never text-mode-only (`cli-tools-for-agents`).

## The escalation ladder

Structure a query surface as levels, each one obvious command away from the last:

| Level | Shape | Example |
|---|---|---|
| 0 — existence | Counts and sizes only | `143 runs, 12 failed, oldest 2d` |
| 1 — outline | Digest with handles (**the default**) | one line per item: id, status, headline fields |
| 2 — scoped detail | One node in full | `show <id>`, `--section auth`, `--depth 2` |
| 3 — everything | Explicit opt-in | `--full`; past a size threshold, written to a file |

Level 3 past a threshold goes to a file — path returned, never streamed to stdout. That delegates further disclosure to the agent's own file tools (ranged reads, grep), which already handle large files well, and mirrors the file-payload rule for large inputs (`cli-tools-for-agents`) and the manifest-plus-files shape for agent responses (`agent-structured-output`).

## The pattern menu

Distinct mechanisms bound output along different axes. Pick the fewest that fit the shape of the data; they compose freely (filter + fields + page in one verb is normal). Exact implementations vary per instance — what stays fixed is the contract: bounded default, stable handles, explicit omission.

**Deepen per item**

1. **Detail levels.** `--format summary|full`, `--depth N`, or verb pairs (`list` for the outline, `show <id>` for one item).
2. **Field selection.** The caller names what it needs: `--fields id,status,durationMs` or `--include body`. The default field set *is* the outline; large fields are elided by default, printing size and the fetch flag instead of the value (`body: <8.2 KB — use --include body>`).

**Narrow the item set**

3. **Filtering.** Domain criteria — `--status failed`, `--since 2h`, `--author x`. Prefer filters over paging: the agent usually knows what it is looking for, and a filter gets there in one call.
4. **Pagination.** `--limit`/`--offset` or a cursor. The fallback when no better criterion exists; order by relevance or recency so the first page is the useful page.
5. **Search within content.** For large blobs rather than item lists: `search <pattern>` returning matches with a few lines of bounded context plus handles — grep-shaped.

**Raise the altitude**

6. **Ranked aggregation.** Top-N by a metric, group-by counts, hotspots — a digest computed over *all* the data with bounded output. The log-analysis CLI in `logging-for-agent-debugging` is this pattern applied to one domain.
7. **Sampling.** Schema or stats plus a few representative records, for when the agent needs the shape of the data, not the records.

**Change the baseline**

8. **Delta output.** Only what changed since a cursor or timestamp — for status verbs an agent polls in a loop, where re-sending unchanged state is pure waste.

Every flag here is registry surface: it must appear in the command's help node and derive from the same typed registry, or the disclosure ladder itself drifts (`progressive-disclosure-tooling`).

## Suggested next commands ride the hint tier

The follow-up examples in query output are hints and follow hint discipline (`agent-feedback-tiers`): one line, imperative, real registered names only.

- Omission *facts* are primary output — they change what the data means and may not be skipped. The suggested next command is advisory and hint-shaped.
- One vocabulary: a hint that names a flag or verb must match the registry entry exactly, so zoom-in hints cannot point at commands that don't exist.

## Anti-patterns

- **Dump-by-default.** A read verb returning every record in full because "the agent might need it." The agent needed the outline.
- **Silent truncation.** A capped result with no omission line teaches the agent that partial data is complete.
- **Outlines without handles.** Detail is visible but unaddressable; the agent guesses identifiers.
- **Unstable handles.** Positional indexes that renumber between calls; tomorrow's `show 3` is a different item.
- **Pagination as the only narrowing tool.** Forcing the agent to walk pages when a filter would land in one call.
- **Unbounded `--json`.** Treating structured mode as exempt from the volume contract; a 500 KB JSON dump is worse than a 500 KB text dump.
- **Full detail in list output "to save a round trip."** Round trips are cheap; context is not.
- **Full dumps streamed to stdout.** Past the threshold, the full form belongs in a file the agent can read progressively.
- **Speculative pattern buffet.** Implementing all eight patterns up front. Add mechanisms against observed need, like every other agent-facing surface.

## Related skills

- `cli-tools-for-agents` — the surrounding output contract: text-by-default, exit codes, file payloads, structured errors
- `progressive-disclosure-tooling` — the instruction side: help as a disclosure graph derived from one typed registry
- `agent-feedback-tiers` — hint/reminder/instruction tiers governing the guidance embedded in query output
- `logging-for-agent-debugging` — a full domain instance: a bounded log-analysis CLI with ranked digests
- `agent-structured-output` — the same manifest-plus-files shape applied to agent responses
