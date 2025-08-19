# Interacting with Obsidian Vaults

Vault = folder of Markdown notes + attachments (opaque binaries).

## Core Rules

<required>
- UTF-8 encoding
- Never rename/move files (breaks wiki-links)
- Never edit `.obsidian/` folder
- Preserve existing `^block-id` markers
- Maintain YAML style when editing
</required>

## Wiki-Links

| Syntax              | Purpose         |
| ------------------- | --------------- |
| `[[Note]]`          | Basic link      |
| `[[Note\|Text]]`    | Display text    |
| `[[Note#Heading]]`  | Link to section |
| `[[Note^block-id]]` | Link to block   |
| `![[Note]]`         | Embed content   |
| `![[image.png]]`    | Embed media     |

✅ Prefer wiki-links over paths

## YAML Front Matter

```yaml
---
tags: [tag1, tag2] # or tags: tag1
aliases: [alt1]
created: 2025-08-19
custom: value
---
```

<critical>
- Must start line 1
- No blank before `---`
- Match existing format
</critical>

## Markdown + Obsidian

- **Highlight:** `==text==`
- **Callout:** `> [!type] Title`
- **Tasks:** `- [ ]` / `- [x]`
- **Tags:** `#tag/subtag` (inline)
- **Math:** `$inline$` / `$$block$$`
- **Footnotes:** `[^1]` + `[^1]: def`

### Callout Types

| Type       | Aliases             | Type       | Aliases                |
| ---------- | ------------------- | ---------- | ---------------------- |
| `note`     | -                   | `abstract` | `summary`, `tldr`      |
| `info`     | -                   | `todo`     | -                      |
| `tip`      | `hint`, `important` | `success`  | `check`, `done`        |
| `question` | `help`, `faq`       | `warning`  | `caution`, `attention` |
| `failure`  | `fail`, `missing`   | `danger`   | `error`                |
| `bug`      | -                   | `example`  | -                      |
| `quote`    | `cite`              |            |                        |

<critical>
Case-insensitive. Unknown types default to `note`
</critical>

## DataView

<danger>
Don't modify query logic unless asked
</danger>

### Query Blocks

```dataview
TABLE file.name, tags
FROM "Folder"
WHERE contains(tags, "x")
```

### Inline

`= this.file.name`

### DataViewJS

```dataviewjs
dv.pages("#tag").map(p => p.file.link)
```

## Safe Operations

✅ **Create:** Add `.md` with optional YAML  
✅ **Update:** Edit content, adjust metadata  
✅ **Link:** Use wiki-links

🚫 **Rename/Move:** Breaks links  
🚫 **Delete anchors:** Breaks references  
🚫 **Edit binaries:** Unless replacing

<example type="valid">
Creating note with metadata:
```markdown
---
tags: [project/alpha]
---
# Title
Content with [[Link]] and #inline-tag
```
</example>

<example type="invalid">
Breaking link by renaming:
`mv "Old Note.md" "New Note.md"`  # 🚫 Breaks all [[Old Note]] links
</example>
