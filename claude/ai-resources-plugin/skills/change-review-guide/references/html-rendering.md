# Rendering the HTML review guide

Turn a markdown review guide (`<slug>-review-guide.md`) into a YAML content file (`<slug>-review-guide.yaml`) and a standalone interactive HTML page (`<slug>-review-guide.html`) with sticky section navigation, a persistent review checklist with progress bar, click-to-copy file chips, and a filterable file index.

Git supplies the file list, statuses, line counts, commit count, and merge base; `scripts/render-review-guide.mjs` (Node 18+, zero dependencies) refuses to build while any changed file in the git range remains unassigned. Open [`example-scheduled-exports.yaml`](example-scheduled-exports.yaml) (23 files, 6 stops, 3 skim clusters) if any section shape is unclear.

## Procedure

1. **Scaffold or locate the YAML** from the repository root. Skip `init` when updating an existing `.yaml` file. If `base` and `head` were not passed explicitly, read them from the guide's Scope line, defaulting to the main branch and `HEAD`.
   ```bash
   node <skill>/scripts/render-review-guide.mjs init --base <base> --head <head> --out <slug>-review-guide.yaml
   ```
   Pass `--merge-base false` when the lead specified a direct commit range instead of a merge base, and `--repo <dir>` if running outside the repository root. This writes every changed file in the range under `unassigned`.

2. **Port the markdown guide one-to-one** into `<slug>-review-guide.yaml` using the schema below:
   - `title`, `lede`, `scope` (`base`, `head`, optional `label`, and `merge_base: false` when comparing a direct range), plus optional `ticket`, `kicker`, and `intent`
   - `purpose` paragraphs and optional `{callout, tone: warn}` items
   - Ranked `fundamentals` with `forces` pointing to stop or skim ids
   - `stops` in the markdown guide's exact order (`id`, `nav`, `title`, `files`, `lead`, `scrutinize`, optional `parts`)
   - `skim` clusters with `spot_check`, and `questions` with `tag` (delete the empty scaffolded `skim` or `questions` stubs if the guide omits those sections)
   - Move every path out of `unassigned` into its stop or skim cluster, then clear `unassigned`. Use globs for mechanical clusters and explicit paths to pull a file out of a glob.

3. **Validate before rendering:**
   ```bash
   node <skill>/scripts/render-review-guide.mjs render <slug>-review-guide.yaml --check
   ```
   Fix every reported `error:` line until `unassigned` is empty and `--check` prints `ok`. If an error stems from a git range mismatch that cannot be resolved without re-reviewing the diff, stop and report the exact error to the lead agent.

4. **Render:**
   ```bash
   node <skill>/scripts/render-review-guide.mjs render <slug>-review-guide.yaml
   ```
   To regenerate `<slug>-review-guide.md` alongside the HTML, pass both `--html` and `--md` (passing `--md` alone skips HTML output). Verify the command exits 0 and writes the standalone HTML file. Keep `<slug>-review-guide.yaml` beside the guide for future regenerations after the branch updates.

5. **Return to the lead agent** the written file path(s), the counts printed by `render`, and any changed file that was absent from the markdown guide along with the skim cluster where you placed it.

## Rules

- **Port, do not re-review.** The markdown guide owns the judgment. Do not re-read the diff to change rankings or stop order. If git includes a changed file never mentioned in the markdown guide, place it in the closest skim cluster (or a small catch-all skim cluster if none fits) and report it.
- **Keep ids stable** (`s1`, `k-specs`): `forces` references and anchor links target them, so keep existing ids when editing a YAML file.

## Content schema

### Inline markup

Any prose value may use `` `code` ``, `**bold**`, `[text](https://…)` or `[text](#stop-id)`, and `[[Key]]` for a keycap. Everything else is escaped, so raw HTML never renders.

### YAML dialect

The renderer ships its own parser accepting a documented subset: block mappings and sequences, `- key: value` items, plain, `'single'`, and `"double"` scalars (a plain scalar may continue on more-indented lines), block scalars `|` and `>`, flow lists `[a, b]` and maps `{a: b}` of scalars, and comments. `true`, `false`, `null`, and integers are typed; every other scalar is a string.

Quote a value when it contains `: ` or ` #`, or starts with `[`, `{`, `*`, `&`, `!`, `%`, `@`, a lone `` ` ``, or a quote. Inside a flow list, quote any path containing `[` or `{`.

### Top level

| Key | Required | Meaning |
| --- | --- | --- |
| `title` | yes | Guide title, rendered as the page heading. |
| `ticket` | no | Ticket key; shown in the top bar and used to scope saved progress. |
| `kicker` | no | Small line above the title. Default `Merge request review`. |
| `lede` | yes | One paragraph: what the change is and what the guide does for the reader. |
| `scope.base` | yes | Base ref. The diff runs from `merge-base(base, head)` unless `scope.merge_base: false`. |
| `scope.head` | no | Head ref. Default `HEAD`. |
| `scope.label` | no | Display name for the branch chip. Default is `head`. |
| `scope.merge_base` | no | Set `false` to diff `base..head` directly without `merge-base`. |
| `intent` | no | Where intent was taken from; rendered under the header and in the markdown scope line. |
| `tips` | no | `false` hides the usage tips line; a string replaces it. |
| `purpose` | yes | List. A string is a paragraph. `{callout: "...", tone: warn}` is a callout box (`tone` optional). |
| `purpose_subtitle` | no | Right-hand caption on the Purpose heading. |
| `fundamentals` | yes | Ranked list of `{title, body, forces}`; `forces` is a list of stop or skim ids this decision drives. |
| `stops` | yes | The review path, in reading order. See below. |
| `skim` | no | Mechanical clusters. See below. |
| `questions` | no | List of `{title, body, tag}`. `tag` colors by keyword: privacy, security, and compliance red; docs, provenance, and process blue; anything else amber. |
| `unassigned` | scaffold only | Paths the scaffold could not place. Must be empty to render. |

### A stop

```yaml
- id: s3                   # ^[a-z][a-z0-9-]*$, unique across stops and skim
  nav: Scheduler & queue   # short sidebar label; default is the title without markup
  title: Scheduler and queue registration
  files:                   # exact paths or globs (* ? **); explicit paths beat globs
    - src/lib/exports/scheduler.ts
    - "src/lib/queue/*.ts"
  lead: One or more paragraphs setting the scene.   # string or list of strings
  scrutinize:              # bullets: assumptions, changed behavior, untested edges
    - "The handler calls `renderReport` without a timeout."
  parts:                   # optional sub-stops, each a titled paragraph
    - title: Retry semantics
      body: "..."
```

### A skim cluster

```yaml
- id: k-specs
  nav: specs               # optional; used in "Skim · specs" labels
  title: New and updated specs
  files:
    - "**/*.spec.ts"
    - "**/*.spec.tsx"
  body: Optional paragraph(s) before the spot-check.
  spot_check: One line on how to confirm the cluster really is mechanical.
```

### File assignment rules

- Every changed file must land in exactly one stop or cluster.
- An explicit path wins over any glob, so list a file explicitly to pull it out of a broad glob.
- Two globs from different entries matching the same file is an error; a glob matching nothing is an error; an explicit path not in the diff is an error.
- Deleted files may be assigned like any other and render struck through.

### Output flags

`render <yaml>` writes `<stem>.html` beside the YAML. `--html <file>` and `--md <file>` choose paths; pass either flag without a value to use `<stem>.html` / `<stem>.md`. Passing `--md` alone writes only markdown, so pass `--html --md` to write both. `--check` validates without writing. `--repo <dir>` targets another git repository. The `--md` output follows the change-review-guide shape (Purpose, Fundamental changes, Review path, Skim, Open questions) and lists each stop's files from git so both formats stay in sync.
