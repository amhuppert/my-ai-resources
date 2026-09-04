# Review guide content schema

One YAML file holds the guide's judgement. The renderer supplies everything derivable from git (file list, added/modified/deleted status, line counts, commit count, merge base) and refuses to build while any changed file is unassigned.

## Inline markup

Any prose value may use: `` `code` ``, `**bold**`, `[text](https://…)` or `[text](#stop-id)`, and `[[Key]]` for a keycap. Everything else is escaped, so raw HTML never renders.

## YAML dialect

The renderer ships its own parser and accepts a documented subset: block mappings and sequences, `- key: value` items, plain, `'single'` and `"double"` scalars (a plain scalar may continue on more-indented lines), block scalars `|` and `>`, flow lists `[a, b]` and maps `{a: b}` of scalars, and comments. `true`, `false`, `null` and integers are typed; every other scalar is a string.

Quote a value when it contains `: ` or ` #`, or starts with `[`, `{`, `*`, `&`, `!`, `%`, `@`, `` ` `` followed by nothing, or a quote. Inside a flow list, quote any path containing `[` or `{`.

## Top level

| Key | Required | Meaning |
| --- | --- | --- |
| `title` | yes | Guide title, rendered as the page heading. |
| `ticket` | no | Ticket key; shown in the top bar and used to scope saved progress. |
| `kicker` | no | Small line above the title. Default `Merge request review`. |
| `lede` | yes | One paragraph: what the change is and what the guide does for the reader. |
| `scope.base` | yes | Base ref. The diff runs from `merge-base(base, head)` unless `scope.merge_base: false`. |
| `scope.head` | no | Head ref. Default `HEAD`. |
| `scope.label` | no | Display name for the branch chip. Default is `head`. |
| `intent` | no | Where intent was taken from; rendered under the header and in the markdown scope line. |
| `tips` | no | `false` hides the usage tips line; a string replaces it. |
| `purpose` | yes | List. A string is a paragraph. `{callout: "...", tone: warn}` is a callout box (`tone` optional). |
| `purpose_subtitle` | no | Right-hand caption on the Purpose heading. |
| `fundamentals` | yes | Ranked list of `{title, body, forces}`; `forces` is a list of stop or skim ids this decision drives. |
| `stops` | yes | The review path, in reading order. See below. |
| `skim` | no | Mechanical clusters. See below. |
| `questions` | no | List of `{title, body, tag}`. `tag` colours by keyword: privacy, security and compliance red; docs, provenance and process blue; anything else amber. |
| `unassigned` | scaffold only | Paths the scaffold could not place. Must be empty to render. |

## A stop

```yaml
- id: s3                   # ^[a-z][a-z0-9-]*$, unique across stops and skim
  nav: Scheduler & queue   # short sidebar label; default is the title without markup
  title: Scheduler and queue registration
  files:                   # exact paths or globs (* ? **); explicit paths beat globs
    - src/lib/exports/scheduler.ts
    - "src/lib/queue/*.ts"
  lead: One or more paragraphs setting the scene.   # string or list of strings
  scrutinize:              # bullets: assumptions, changed behaviour, untested edges
    - "The handler calls `renderReport` without a timeout."
  parts:                   # optional sub-stops, each a titled paragraph
    - title: Retry semantics
      body: "..."
```

## A skim cluster

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

## File assignment rules

- Every changed file must land in exactly one stop or cluster.
- An explicit path wins over any glob, so list a file explicitly to pull it out of a broad glob.
- Two globs from different entries matching the same file is an error; a glob matching nothing is an error; an explicit path that is not in the diff is an error.
- Deleted files may be assigned like any other and render struck through.

## Outputs

`render <yaml>` writes `<stem>.html` beside the YAML. `--html <file>` and `--md <file>` choose paths; pass either flag without a value to use `<stem>.html` / `<stem>.md`. `--check` validates without writing. The markdown output follows the change-review-guide shape (Purpose, Fundamental changes, Review path, Skim, Open questions) and lists each stop's files from git, so the two formats cannot drift.
