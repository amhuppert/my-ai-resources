# Memory Bank Plugin Implementation Plan

## Overview

Extend `claude/ai-resources-plugin/` with skills, agents, and hooks that integrate with the memory-bank-mcp server for structured context management.

You have skills for command development, skill development, hook development, and agent development from the plugin-dev plugin. Use these skills to create the commands, skills, hooks, and agents described in this plan.

## File Structure

```
claude/ai-resources-plugin/
├── skills/
│   ├── start-objective/
│   │   └── SKILL.md
│   ├── memory-context/
│   │   └── SKILL.md
│   ├── complete-objective/
│   │   └── SKILL.md
│   ├── sync-memory-bank/
│   │   └── SKILL.md
│   ├── mb-status/
│   │   └── SKILL.md
│   └── mb-quick-add/
│       └── SKILL.md
├── agents/
│   ├── memory-bank-curator.md
│   └── feature-explorer.md
├── hooks/
│   └── hooks.json
└── scripts/
    ├── read-focus-frontmatter.ts
    ├── write-focus-frontmatter.ts
    └── parse-quick-add-args.ts
```

---

## Helper Scripts

Scripts handle deterministic operations that don't require LLM reasoning. Skills invoke these via `!`command`` syntax to inject output.

### 1. read-focus-frontmatter.ts

**File:** `scripts/read-focus-frontmatter.ts`

**Purpose:** Read focus.md and extract YAML frontmatter fields.

**Usage:** `bun run ${CLAUDE_PLUGIN_ROOT}/scripts/read-focus-frontmatter.ts [focus-file-path]`

**Input:** Optional path to focus.md (defaults to `./memory-bank/focus.md`)

**Output:** JSON to stdout

```json
{
  "found": true,
  "objective_slug": "my-objective",
  "feature_slugs": ["auth", "auth/oauth"]
}
```

Or if no frontmatter/file:

```json
{
  "found": false,
  "objective_slug": null,
  "feature_slugs": []
}
```

**Implementation:**

```typescript
#!/usr/bin/env bun

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const focusPath = process.argv[2] || "./memory-bank/focus.md";
const absolutePath = resolve(focusPath);

interface FocusFrontmatter {
  found: boolean;
  objective_slug: string | null;
  feature_slugs: string[];
}

function parseFrontmatter(content: string): FocusFrontmatter {
  const result: FocusFrontmatter = {
    found: false,
    objective_slug: null,
    feature_slugs: [],
  };

  // Check for frontmatter delimiters
  if (!content.startsWith("---\n")) {
    return result;
  }

  const endIndex = content.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return result;
  }

  const frontmatter = content.slice(4, endIndex);
  result.found = true;

  // Parse objective-slug
  const slugMatch = frontmatter.match(/^objective-slug:\s*(.+)$/m);
  if (slugMatch) {
    result.objective_slug = slugMatch[1].trim().replace(/^["']|["']$/g, "");
  }

  // Parse feature-slugs (YAML array)
  const featuresMatch = frontmatter.match(
    /^feature-slugs:\s*\n((?:\s+-\s+.+\n?)+)/m,
  );
  if (featuresMatch) {
    const lines = featuresMatch[1].split("\n");
    for (const line of lines) {
      const itemMatch = line.match(/^\s+-\s+(.+)$/);
      if (itemMatch) {
        result.feature_slugs.push(
          itemMatch[1].trim().replace(/^["']|["']$/g, ""),
        );
      }
    }
  }

  return result;
}

// Main
if (!existsSync(absolutePath)) {
  console.log(
    JSON.stringify({ found: false, objective_slug: null, feature_slugs: [] }),
  );
  process.exit(0);
}

const content = readFileSync(absolutePath, "utf-8");
const result = parseFrontmatter(content);
console.log(JSON.stringify(result));
```

---

### 2. write-focus-frontmatter.ts

**File:** `scripts/write-focus-frontmatter.ts`

**Purpose:** Update focus.md frontmatter while preserving body content.

**Usage:** `bun run ${CLAUDE_PLUGIN_ROOT}/scripts/write-focus-frontmatter.ts <action> [args...]`

**Actions:**

- `set-objective <slug>` - Set objective-slug
- `clear-objective` - Remove objective-slug
- `set-features <slug1> <slug2> ...` - Set feature-slugs array
- `clear-features` - Remove feature-slugs

**Output:** JSON with status

```json
{
  "success": true,
  "message": "Updated objective-slug to 'my-objective'"
}
```

**Implementation:**

```typescript
#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { mkdirSync } from "fs";

const FOCUS_PATH = "./memory-bank/focus.md";

interface Frontmatter {
  "objective-slug"?: string;
  "feature-slugs"?: string[];
}

function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  if (!content.startsWith("---\n")) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = content.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const fmContent = content.slice(4, endIndex);
  const body = content.slice(endIndex + 5);
  const frontmatter: Frontmatter = {};

  // Parse objective-slug
  const slugMatch = fmContent.match(/^objective-slug:\s*(.+)$/m);
  if (slugMatch) {
    frontmatter["objective-slug"] = slugMatch[1]
      .trim()
      .replace(/^["']|["']$/g, "");
  }

  // Parse feature-slugs
  const featuresMatch = fmContent.match(
    /^feature-slugs:\s*\n((?:\s+-\s+.+\n?)+)/m,
  );
  if (featuresMatch) {
    frontmatter["feature-slugs"] = [];
    const lines = featuresMatch[1].split("\n");
    for (const line of lines) {
      const itemMatch = line.match(/^\s+-\s+(.+)$/);
      if (itemMatch) {
        frontmatter["feature-slugs"].push(
          itemMatch[1].trim().replace(/^["']|["']$/g, ""),
        );
      }
    }
  }

  return { frontmatter, body };
}

function serializeFrontmatter(fm: Frontmatter): string {
  const lines: string[] = [];

  if (fm["objective-slug"]) {
    lines.push(`objective-slug: ${fm["objective-slug"]}`);
  }

  if (fm["feature-slugs"] && fm["feature-slugs"].length > 0) {
    lines.push("feature-slugs:");
    for (const slug of fm["feature-slugs"]) {
      lines.push(`  - ${slug}`);
    }
  }

  if (lines.length === 0) {
    return "";
  }

  return `---\n${lines.join("\n")}\n---\n`;
}

// Main
const action = process.argv[2];
const args = process.argv.slice(3);

if (!action) {
  console.log(
    JSON.stringify({
      success: false,
      message: "Usage: write-focus-frontmatter.ts <action> [args...]",
    }),
  );
  process.exit(1);
}

const absolutePath = resolve(FOCUS_PATH);

// Ensure directory exists
mkdirSync(dirname(absolutePath), { recursive: true });

// Read existing content or create default
let content = "";
if (existsSync(absolutePath)) {
  content = readFileSync(absolutePath, "utf-8");
}

const { frontmatter, body } = parseFrontmatter(content);

switch (action) {
  case "set-objective":
    if (!args[0]) {
      console.log(
        JSON.stringify({ success: false, message: "Missing slug argument" }),
      );
      process.exit(1);
    }
    frontmatter["objective-slug"] = args[0];
    break;

  case "clear-objective":
    delete frontmatter["objective-slug"];
    break;

  case "set-features":
    frontmatter["feature-slugs"] = args;
    break;

  case "clear-features":
    delete frontmatter["feature-slugs"];
    break;

  default:
    console.log(
      JSON.stringify({ success: false, message: `Unknown action: ${action}` }),
    );
    process.exit(1);
}

const newFrontmatter = serializeFrontmatter(frontmatter);
const newContent = newFrontmatter + body;

writeFileSync(absolutePath, newContent);
console.log(
  JSON.stringify({ success: true, message: `Updated focus.md frontmatter` }),
);
```

---

### 3. parse-quick-add-args.ts

**File:** `scripts/parse-quick-add-args.ts`

**Purpose:** Parse mb-quick-add argument string into structured data.

**Usage:** `bun run ${CLAUDE_PLUGIN_ROOT}/scripts/parse-quick-add-args.ts '<args>'`

**Input:** Argument string like `src/auth.ts "Auth module" auth`

**Output:** JSON with parsed fields

```json
{
  "success": true,
  "path": "src/auth.ts",
  "type": "file",
  "description": "Auth module",
  "feature_slug": "auth"
}
```

Or for directories (path ends with `/`):

```json
{
  "success": true,
  "path": "src/auth/",
  "type": "directory",
  "description": "Auth directory",
  "feature_slug": "auth"
}
```

**Implementation:**

```typescript
#!/usr/bin/env bun

const input = process.argv[2];

if (!input) {
  console.log(
    JSON.stringify({
      success: false,
      error:
        "Usage: parse-quick-add-args.ts '<path> \"<description>\" <feature-slug>'",
    }),
  );
  process.exit(1);
}

// Parse: path "description" feature-slug
// Description is quoted, path and feature-slug are not
const regex = /^(\S+)\s+"([^"]+)"\s+(\S+)$/;
const match = input.match(regex);

if (!match) {
  console.log(
    JSON.stringify({
      success: false,
      error: 'Invalid format. Expected: <path> "<description>" <feature-slug>',
    }),
  );
  process.exit(1);
}

const [, path, description, feature_slug] = match;

// Normalize path (remove leading ./)
const normalizedPath = path.replace(/^\.\//, "");

// Determine type
const type = normalizedPath.endsWith("/") ? "directory" : "file";

console.log(
  JSON.stringify({
    success: true,
    path: normalizedPath,
    type,
    description,
    feature_slug,
  }),
);
```

## focus.md Frontmatter Convention

Skills that set an active objective will add YAML frontmatter to `memory-bank/focus.md`:

```yaml
---
objective-slug: my-objective
feature-slugs:
  - auth
  - auth/oauth
---
# Current Focus
...existing content...
```

- `objective-slug`: Current active objective (optional)
- `feature-slugs`: Additional features to load context for (optional)

When no objective is active, frontmatter should be empty (`---\n---\n`) or absent.

---

## Skills

### 1. start-objective

**File:** `skills/start-objective/SKILL.md`

**Frontmatter:**

```yaml
---
name: start-objective
description: This skill should be used when starting work on a new or existing objective. It creates/resumes objectives, links features, creates tasks, builds context, and updates focus.md.
argument-hint: "<objective-description-or-existing-slug>"
allowed-tools: mcp__memory-bank__*, Task, AskUserQuestion, Read, Glob, Grep, Bash(bun run:*)
---
```

**Context Injection:**

```markdown
## Current Focus Frontmatter

!`bun run ${CLAUDE_PLUGIN_ROOT}/scripts/read-focus-frontmatter.ts`
```

**Workflow:**

1. **Check if argument is existing slug:**
   - Call `mcp__memory-bank__get_objective` with argument as slug
   - If success: Resume mode
   - If not_found error: Create mode

2. **Resume Mode:**
   - Call `mcp__memory-bank__build_context` with objective_slug
   - Run: `bun run ${CLAUDE_PLUGIN_ROOT}/scripts/write-focus-frontmatter.ts set-objective <slug>`
   - Present context to user
   - List pending tasks

3. **Create Mode:**
   - Derive slug from description (lowercase, hyphens, e.g., "implement-oauth")
   - Derive readable name from description
   - Use AskUserQuestion to confirm name and slug
   - Search codebase with Glob/Grep for related files
   - Call `mcp__memory-bank__list_features` to show available features
   - Ask user which features to link (or create new)
   - Call `mcp__memory-bank__create_objective`
   - Call `mcp__memory-bank__link_objective_to_features` if features selected
   - Ask user for initial tasks
   - Call `mcp__memory-bank__create_tasks` if tasks provided
   - Run: `bun run ${CLAUDE_PLUGIN_ROOT}/scripts/write-focus-frontmatter.ts set-objective <slug>`
   - Call `mcp__memory-bank__build_context`
   - Present context summary

---

### 2. memory-context

**File:** `skills/memory-context/SKILL.md`

**Frontmatter:**

```yaml
---
name: memory-context
description: This skill should be used when the user needs context for their current work. It builds comprehensive context from the memory bank for the active objective or specified features.
argument-hint: "[objective-slug] [feature-slug...]"
allowed-tools: mcp__memory-bank__*, Read
---
```

**Context Injection:**

```markdown
## Current Focus Frontmatter

!`bun run ${CLAUDE_PLUGIN_ROOT}/scripts/read-focus-frontmatter.ts`

## Arguments

$ARGUMENTS
```

**Workflow:**

1. **Determine Slugs:**
   - If `$ARGUMENTS` provided: use first as objective_slug, rest as feature_slugs
   - If no arguments: use values from injected frontmatter JSON (objective_slug, feature_slugs)

2. **Build Context:**
   - Call `mcp__memory-bank__build_context` with determined slugs
   - Extract context markdown from response

3. **Present Context:**
   - Display formatted context
   - List key files with descriptions
   - Offer: "Would you like me to read any of these files into context?"

4. **Optional File Reading:**
   - If user selects files, read them with Read tool

---

### 3. complete-objective

**File:** `skills/complete-objective/SKILL.md`

**Frontmatter:**

```yaml
---
name: complete-objective
description: This skill should be used when completing an objective. It verifies task completion, captures learnings, updates the objective status, and clears focus.md.
argument-hint: "[objective-slug]"
allowed-tools: mcp__memory-bank__*, AskUserQuestion, Read, Bash(bun run:*)
---
```

**Context Injection:**

```markdown
## Current Focus Frontmatter

!`bun run ${CLAUDE_PLUGIN_ROOT}/scripts/read-focus-frontmatter.ts`

## Arguments

$ARGUMENTS
```

**Workflow:**

1. **Get Objective:**
   - Use `$ARGUMENTS` as slug if provided, otherwise use objective_slug from injected frontmatter
   - Call `mcp__memory-bank__get_objective_context`

2. **Review Tasks:**
   - Display all tasks with status
   - Count: completed, in_progress, pending
   - If incomplete tasks exist, use AskUserQuestion:
     - "Some tasks are not completed. How would you like to proceed?"
     - Options: "Mark all complete", "Update individual tasks", "Cancel completion"

3. **Capture Learnings:**
   - Use AskUserQuestion: "What did you learn that should be recorded?"
   - Options: "Add requirements", "Update existing requirements", "No learnings to record", "Other"
   - If learnings provided, call appropriate MCP tools

4. **Complete Objective:**
   - Call `mcp__memory-bank__update_objective` with status="completed"

5. **Clear focus.md:**
   - Run: `bun run ${CLAUDE_PLUGIN_ROOT}/scripts/write-focus-frontmatter.ts clear-objective`

6. **Confirmation:**
   - Display completion summary

---

### 4. sync-memory-bank

**File:** `skills/sync-memory-bank/SKILL.md`

**Frontmatter:**

```yaml
---
name: sync-memory-bank
description: This skill should be used to audit the memory bank against the actual codebase. It identifies missing files, stale paths, and untracked files that should be added.
allowed-tools: mcp__memory-bank__*, Glob, Read, AskUserQuestion
---
```

**Workflow:**

1. **Get All Tracked Paths:**
   - Call `mcp__memory-bank__list_paths`

2. **Check Each Path:**
   - For each path, use Glob to check if file/directory exists
   - Categorize: existing, missing

3. **Find Potential Additions:**
   - Call `mcp__memory-bank__list_features`
   - For each feature, scan related directories with Glob
   - Identify files that match feature patterns but aren't tracked

4. **Report Findings:**
   - Display: "Missing paths (files deleted/moved)"
   - Display: "Potential additions (untracked files)"

5. **User Decisions:**
   - Use AskUserQuestion for each category:
     - Missing: "Remove these paths from memory bank?"
     - Additions: "Add these paths to memory bank?"

6. **Apply Changes:**
   - For removals: call `mcp__memory-bank__delete_path`
   - For additions: call `mcp__memory-bank__create_paths` and `mcp__memory-bank__link_paths_to_feature`

7. **Summary:**
   - Display changes made

---

### 5. mb-status

**File:** `skills/mb-status/SKILL.md`

**Frontmatter:**

```yaml
---
name: mb-status
description: This skill should be used to display a quick dashboard of memory bank status including active objectives and task progress.
allowed-tools: mcp__memory-bank__*
---
```

**Workflow:**

1. **Get Objectives:**
   - Call `mcp__memory-bank__list_objectives` with status="in_progress"
   - Call `mcp__memory-bank__list_objectives` with status="pending"

2. **Get Tasks for Each:**
   - For each objective, call `mcp__memory-bank__list_tasks`

3. **Format Dashboard:**

```
## Memory Bank Status

### In Progress Objectives
- **objective-name** (slug)
  - Tasks: 3/5 completed
  - Linked features: auth, api

### Pending Objectives
- **other-objective** (other-slug)
  - Tasks: 0/2 completed

### Summary
- 2 objectives (1 in progress, 1 pending)
- 5 pending tasks total
```

---

### 6. mb-quick-add

**File:** `skills/mb-quick-add/SKILL.md`

**Frontmatter:**

```yaml
---
name: mb-quick-add
description: This skill should be used to quickly add a file path to the memory bank and link it to a feature.
argument-hint: '<file-path> "<description>" <feature-slug>'
allowed-tools: mcp__memory-bank__*
---
```

**Context Injection:**

```markdown
## Parsed Arguments

!`bun run ${CLAUDE_PLUGIN_ROOT}/scripts/parse-quick-add-args.ts '$ARGUMENTS'`
```

**Workflow:**

1. **Check Parse Result:**
   - If `success: false`, display error message and stop
   - Extract: path, type, description, feature_slug from JSON

2. **Create Path:**
   - Call `mcp__memory-bank__create_paths` with parsed values:
     ```json
     {
       "paths": [
         {
           "path": "<path>",
           "type": "<type>",
           "description": "<description>"
         }
       ]
     }
     ```
   - Extract path ID from response

3. **Link to Feature:**
   - Call `mcp__memory-bank__link_paths_to_feature`:
     ```json
     {
       "feature_slug": "<feature_slug>",
       "path_ids": ["<path_id>"]
     }
     ```

4. **Confirm:**
   - Display: "Added `<path>` to feature `<feature_slug>`"

---

## Agents

### 1. memory-bank-curator

**File:** `agents/memory-bank-curator.md`

**Frontmatter:**

```yaml
---
name: memory-bank-curator
description: Use this agent to audit and improve memory bank data quality. It identifies orphaned paths, features without requirements, stale data, and suggests improvements to use_when conditions and descriptions.
model: sonnet
color: green
---
```

**System Prompt Content:**

```markdown
You are a memory bank curator responsible for maintaining data quality in the memory bank. Your role is to audit, clean, and improve the structured knowledge stored in the memory bank.

## Capabilities

- Identify orphaned paths (not linked to any feature)
- Find features without requirements
- Detect stale paths (files no longer exist)
- Suggest improvements to use_when conditions
- Flag duplicate or overlapping features
- Recommend description improvements

## Audit Process

1. **Path Audit:**
   - Call list_paths to get all paths
   - For each path, check if file exists using Glob
   - Identify paths not linked to features (orphans)
   - Review use_when conditions for clarity and usefulness

2. **Feature Audit:**
   - Call list_features to get all features
   - For each feature, call list_requirements
   - Flag features with zero requirements
   - Check for overlapping feature scopes

3. **Requirement Audit:**
   - Review requirement text for specificity
   - Check if requirements are testable/verifiable

## Output Format

Present findings as:

- **Critical Issues:** Data that should be fixed immediately
- **Improvements:** Suggestions for better data quality
- **Statistics:** Summary counts and health metrics

## Constraints

- Do NOT make changes automatically
- Present findings and wait for user approval
- Be conservative in suggestions - avoid false positives
```

---

### 2. feature-explorer

**File:** `agents/feature-explorer.md`

**Frontmatter:**

```yaml
---
name: feature-explorer
description: Use this agent to deeply research a specific area of the codebase when adding features to the memory bank. It traces execution paths, identifies patterns, and discovers related files.
model: sonnet
color: cyan
---
```

**System Prompt Content:**

````markdown
You are a feature explorer agent specialized in deeply researching codebase areas. Your role is to discover and document files, patterns, and relationships for memory bank features.

## Research Approach

1. **Initial Discovery:**
   - Search for files by name patterns related to the feature
   - Search for keywords in file contents
   - Identify entry points and key files

2. **Dependency Tracing:**
   - Follow imports/requires from key files
   - Map which files depend on which
   - Identify shared utilities and helpers

3. **Pattern Recognition:**
   - Note naming conventions used
   - Identify architectural patterns (MVC, services, etc.)
   - Document file organization conventions

4. **Test Discovery:**
   - Find test files for the feature
   - Note test patterns and fixtures

## Output Format

Return structured findings:

```json
{
  "files": [
    {
      "path": "src/auth/oauth.ts",
      "description": "OAuth token validation and refresh logic",
      "use_when": ["implementing OAuth flow", "debugging token issues"]
    }
  ],
  "requirements": [
    {
      "text": "OAuth tokens must be refreshed 5 minutes before expiry",
      "notes": ["See REFRESH_BUFFER constant in oauth.ts"]
    }
  ],
  "patterns": [
    "Services follow src/services/{name}.ts convention",
    "All auth code uses dependency injection"
  ]
}
```
````

## Constraints

- Focus on the assigned research area only
- Be thorough but avoid tangential files
- Prioritize files that would be useful for AI agents working on this feature

````

---

## Hooks

### hooks.json

**File:** `hooks/hooks.json`

```json
{
  "description": "Memory bank integration hooks for context loading and tracking",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "A file was just edited/written: $TOOL_INPUT\n\nCheck if this file should be tracked in the memory bank:\n1. Read memory-bank/focus.md to get the active objective-slug from frontmatter\n2. If there's an active objective, use mcp__memory-bank__get_path to check if this file is already tracked\n3. If NOT tracked and the file appears relevant to the current work, suggest adding it with: 'Consider adding this file to the memory bank with /mb-quick-add'\n4. If already tracked or not relevant, say nothing\n\nBe conservative - only suggest for files that clearly relate to the active objective's features.",
            "timeout": 30
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Before ending this session, check memory bank status:\n1. Read memory-bank/focus.md frontmatter for objective-slug\n2. If there's an active objective, use mcp__memory-bank__get_objective_context to get current task status\n3. If any tasks were worked on during this session, remind the user to update task status with mcp__memory-bank__update_task\n4. If the objective appears complete, suggest using /complete-objective\n5. If no active objective, approve stopping without comment\n\nOnly provide reminders if relevant - don't be noisy.",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
````

---

### session-start.sh

**File:** `hooks/session-start.sh`

```bash
#!/bin/bash
# Memory Bank SessionStart Hook
# Uses TypeScript script to parse focus.md and outputs system message

set -euo pipefail

# Use the TypeScript script to read frontmatter
result=$(bun run "${CLAUDE_PLUGIN_ROOT}/scripts/read-focus-frontmatter.ts" "${CLAUDE_PROJECT_DIR}/memory-bank/focus.md" 2>/dev/null || echo '{"found":false}')

# Parse JSON result
found=$(echo "$result" | jq -r '.found')
objective_slug=$(echo "$result" | jq -r '.objective_slug // empty')

# Exit silently if no frontmatter or no objective
if [ "$found" != "true" ] || [ -z "$objective_slug" ]; then
  exit 0
fi

# Get feature slugs as comma-separated list
feature_slugs=$(echo "$result" | jq -r '.feature_slugs | join(", ")' 2>/dev/null || echo "")

# Build system message
message="Memory Bank: Active objective '${objective_slug}' detected."

if [ -n "$feature_slugs" ]; then
  message="${message} Additional features: ${feature_slugs}."
fi

message="${message} Load context with: mcp__memory-bank__build_context({ \"objective_slug\": \"${objective_slug}\" })"

# Output JSON for Claude
cat << EOF
{
  "systemMessage": "$message"
}
EOF
```

**Make executable:** `chmod +x hooks/session-start.sh`

---

## Implementation Order

1. **Create directory structure:**

   ```bash
   mkdir -p claude/ai-resources-plugin/hooks
   mkdir -p claude/ai-resources-plugin/scripts
   mkdir -p claude/ai-resources-plugin/skills/start-objective
   mkdir -p claude/ai-resources-plugin/skills/memory-context
   mkdir -p claude/ai-resources-plugin/skills/complete-objective
   mkdir -p claude/ai-resources-plugin/skills/sync-memory-bank
   mkdir -p claude/ai-resources-plugin/skills/mb-status
   mkdir -p claude/ai-resources-plugin/skills/mb-quick-add
   ```

2. **Create helper scripts first:**
   - `scripts/read-focus-frontmatter.ts`
   - `scripts/write-focus-frontmatter.ts`
   - `scripts/parse-quick-add-args.ts`
   - Test each script independently with sample inputs

3. **Create hooks:**
   - `hooks/hooks.json`
   - `hooks/session-start.sh` (make executable)
   - Test SessionStart hook by adding frontmatter to focus.md

4. **Create simple skills** (mb-status, mb-quick-add) - quick to test

5. **Create core skills** (start-objective, memory-context, complete-objective)

6. **Create maintenance skill** (sync-memory-bank)

7. **Create agents** (memory-bank-curator, feature-explorer)

8. **Test full workflow:**
   - Start objective with `/start-objective implement-new-feature`
   - Check context with `/memory-context`
   - Add files with `/mb-quick-add`
   - Check status with `/mb-status`
   - Complete with `/complete-objective`

---

## Testing Checklist

### Helper Scripts

- [ ] `read-focus-frontmatter.ts` returns `found: false` when no file
- [ ] `read-focus-frontmatter.ts` returns `found: false` when no frontmatter
- [ ] `read-focus-frontmatter.ts` extracts objective-slug correctly
- [ ] `read-focus-frontmatter.ts` extracts feature-slugs array correctly
- [ ] `write-focus-frontmatter.ts set-objective` adds frontmatter to file without it
- [ ] `write-focus-frontmatter.ts set-objective` updates existing frontmatter
- [ ] `write-focus-frontmatter.ts clear-objective` removes objective-slug
- [ ] `write-focus-frontmatter.ts` preserves file body content
- [ ] `parse-quick-add-args.ts` parses valid input correctly
- [ ] `parse-quick-add-args.ts` detects directory type from trailing `/`
- [ ] `parse-quick-add-args.ts` returns error for invalid format

### Hooks

- [ ] SessionStart hook loads context when focus.md has objective-slug
- [ ] SessionStart hook silent when no focus.md or no objective-slug
- [ ] PostToolUse hook suggests adding untracked files
- [ ] PostToolUse hook silent for already-tracked files
- [ ] Stop hook reminds about task updates when relevant

### Skills

- [ ] /start-objective creates new objective correctly
- [ ] /start-objective resumes existing objective
- [ ] /start-objective updates focus.md frontmatter
- [ ] /memory-context builds context from focus.md
- [ ] /memory-context builds context from arguments
- [ ] /complete-objective updates status and clears focus.md
- [ ] /sync-memory-bank identifies missing files
- [ ] /mb-status displays dashboard
- [ ] /mb-quick-add adds and links path

### Agents

- [ ] memory-bank-curator agent audits data
- [ ] feature-explorer agent researches features
