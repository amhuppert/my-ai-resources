---
name: progressive-disclosure-tooling
description: Structure a CLI or tool surface as a progressive-disclosure graph
  where every subcommand's --help is a self-contained mini-skill, and derive
  every guidance surface from one typed registry so documentation drift becomes
  structurally impossible. Use when writing --help text, designing tool help
  systems, organizing command documentation for agents, or fighting drift
  between help text, parsers, and skill docs.
---

# Progressive-Disclosure Tooling

Agents should discover a tool surface pull-based, node by node, instead of front-loading one large document. Make every subcommand a node in a disclosure graph whose `--help` is a self-contained mini-skill, and make every guidance surface — help text, flag allowlists, parser sets, usage, skill-doc references — a derivation from one typed registry. Hand-synced copies of the same facts will drift, and drift in agent-facing docs is worse than absence: it trains distrust.

## The tool surface is a disclosure graph

Every subcommand is a node. A node's `--help` is a mini-skill containing:

- **Description** — 1–4 lines of what it does.
- **Usage** — the invocation shapes.
- **Flags** — command-specific flags only; global flags get one pointer line, never repeated per node.
- **≥ 1 example** for every leaf node.
- **Optional domain context** — ≤ 4 lines, only when a domain-model fact genuinely earns its place.
- **Lateral edges** — related commands, each with a one-liner.
- **Outbound edges to skill docs** — "load X when Y", so help routes the agent to deeper documentation exactly when it becomes relevant.

Agents navigate the graph node by node via `--help`, pulling only what the current step needs.

## Terse hubs, rich leaves

- Group nodes render as indexes: their summary, one line per child, plus their own related/skills edges.
- High-traffic nodes (top-level usage, group indexes) stay terse; richness lives at the leaves the agent deliberately navigates to. This keeps the token cost of graph-walking low.
- Resolve help by longest-prefix match on the full positional path, so `tool group verb --help` lands on the leaf, not the group.
- An unknown path under a matched parent fails with a usage error whose hint lists the parent's children — the error itself is a graph edge.

## Examples earn their place

An example that restates the usage line is noise. Examples exist to teach **failure-prone shapes**: range syntaxes, payload file shapes, ordering constraints ("always validate first — exit 2 lists issues one per line"). In one real review of agent tool usage, a range-syntax mistake was the #1 observed friction — that is what the example slot is for.

## One vocabulary across hints, errors, and help

Hints, error messages, and help text share one vocabulary. A hint that names a command must match that command's help node exactly; an error that suggests a flag must use the flag's registered name. Success/error hints form the chain edges of the same graph (`validate` → `create` → `start`; connection errors → `doctor`), so the agent experiences one coherent map, not three dialects.

## Single source of truth: the typed registry

All command metadata lives in typed entries (path, summary, description, usage, flags with kinds, examples, domain context, related edges, skill refs), authored in colocated per-command files and aggregated centrally. The aggregator throws at module init on duplicate paths or a leaf whose parent group node is missing — a malformed registry fails every test run, not at runtime in an agent session.

**Every surface derives from the registry:**

| Derived surface | Instead of |
|---|---|
| Per-command help text | A hand-written help record |
| Per-command flag allowlists | Hand-written arrays at each validation call site |
| The parser's boolean-flag set | A hand-maintained constant |
| Top-level usage | A hand-written usage string |
| Group dispatch (valid verbs, "requires a subcommand" errors) | Hand-listed verbs per group module |
| The generated command reference in the agent-facing skill doc | Manually synced doc sections |

Hand-syncing any of these is a defect. In one real audit, a command accepted three flags its help never documented — the classic drift class. Because the allowlist *is* the registry after derivation, "the command accepts a flag help doesn't show" becomes structurally impossible. Don't build a sync test that compares two hand-written copies; derivation deletes the copy.

Group dispatch should derive a group's valid verbs from the registry's children and throw when its handler map disagrees with the registry — a verb wired into dispatch without an entry, or an entry with no handler, fails loudly.

For structured callers, `--help --json` returns the registry entry itself (summary, usage, flags, examples, related edges, skill refs) rather than a rendered text blob — machine callers should never parse prose, and there is no need to pay for the text twice in the JSON path.

## The add-a-command checklist

When adding or changing a command, subcommand, or flag:

1. Add or update the typed registry entry (summary, description, usage, flags, ≥ 1 example for leaves).
2. Wire flags through the registry — never a literal allowlist at a validation call site.
3. Add related edges both ways: the new node points at siblings, and siblings point back where apt.
4. Add skill-doc refs where a deeper doc materially helps (path contract-tested to exist).
5. Run the registry contract test.
6. Regenerate the derived command reference in the agent-facing skill doc; a check fails if it drifts.

## Documentation drift is a contract-test failure

Make a contract test the definition of "help is correct", not a review duty:

1. Every dispatchable command path has a registry entry.
2. Every leaf entry has ≥ 1 example; every entry has a non-empty summary, description, and usage.
3. Every related-command edge resolves to a registry entry — no dangling graph edges.
4. Every referenced skill-doc path exists on disk.
5. No flag name is declared boolean in one entry and value-taking in another (parser-level constraint).
6. Every top-level entry appears in the generated usage; group nodes list all their children.
7. Dispatch and registry agree — disagreement throws, and the contract test drives every group node through dispatch.

Failure of any assertion is the "help is wrong" signal. Agent-facing documentation rot becomes a red suite instead of a slow trust leak.

## Help never fails

Help is the recovery path — the thing an agent reaches for when something else went wrong. It must:

- Work offline and unauthenticated.
- Return instantly.
- Exit 0, always.

Compile durable content into the binary. Help must describe *this build's* parser — its flags must come from the same build as the flag parser, or help can lie about what the binary accepts. Fully server-rendered help breaks offline recovery and can skew against the binary; fully static help gives up context-awareness. Split it.

## Dynamic context is server-rendered garnish

The server may append a few blocks of current runtime state to help output (running dev servers, current task and iteration counts, existing artifacts). Constrain this hard:

- Fetched best-effort with a short timeout (~500 ms).
- Appended as clearly-marked context blocks after the static content.
- **Any failure — no server, no auth, timeout, non-2xx, schema mismatch — silently omits the blocks.** Static help renders byte-identically, nothing is written to stderr, and the exit code is unchanged. Never train agents to fear `--help`.
- Server-side provider failures are logged server-side; observability never lands in the agent's face.

## High admission bar for dynamic context

Unpredictable help is worse for agents than static help. Every provider adds a dependency to a surface that must stay boring:

- Cap the block count and per-block length (e.g. ≤ 3 blocks of ~10 lines).
- Providers return empty when they have nothing worth saying — absence of context must not render an empty section.
- Providers are strictly read-only.
- Defer new providers until a concrete need is observed in real usage; do not add them speculatively.

## Anti-patterns

- **One giant README as the tool's documentation.** Front-loads tokens the agent doesn't need yet and goes stale as a unit.
- **Hand-synced copies of command facts.** Help, allowlists, parser sets, and skill docs maintained separately will drift; drift trains agents to distrust the docs.
- **Examples that restate usage.** They spend the example slot without teaching anything.
- **Hints naming commands that don't exist.** Author hints next to command definitions so the vocabulary can't skew.
- **Help that depends on the server.** A failed fetch that changes help's exit code or writes to stderr breaks the recovery path.
- **Speculative context providers.** Each one makes help less predictable; add only against observed need.
- **Global flags repeated on every node.** Bloats every leaf; use one pointer line.

## Related skills

- `cli-tools-for-agents` — design a project CLI as the agent tool surface: exit codes, file payloads, jobs, doctor
- `agent-feedback-tiers` — hint/reminder/instruction output tiers and the reminder admission rule
- `mechanical-guardrails` — enforce conventions structurally with ratchets, tripwires, contract tests, and derived artifacts
- `earned-guidance-docs` — write agent guidance only when earned by real failures; root contract plus read-on-demand docs
