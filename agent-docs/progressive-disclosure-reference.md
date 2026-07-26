# Progressive Disclosure Reference Guide for AI Agents

<Overview>
Progressive disclosure limits what enters the context window to the minimum necessary, revealing detail on-demand as the agent needs it. Lightweight metadata stays always visible; full documentation and resources load only when relevant.
</Overview>

## Core Concepts

### The Three-Layer Model

**Layer 1 - Metadata** (~100 tokens per item)

- Name and brief description of available information
- Just enough for the agent to decide if this resource is relevant
- Always pre-loaded into context

**Layer 2 - Instructions/Documentation** (loaded on-demand, <5k tokens)

- Full skill documentation, detailed API references, complete workflows
- Loaded only when metadata indicates relevance
- Contains all information needed to implement a feature

**Layer 3 - Resources** (loaded selectively)

- Reference files, detailed examples, edge case documentation
- Loaded only when referenced by Layer 2 content
- Can be dozens of files organized by topic

## Design Patterns

### Pattern 1: Filesystem Navigation

Structure skills as navigable filesystems where the agent discovers content:

```
skill-name/
├── SKILL.md                 # Layer 1: 100-200 lines, links to references
├── reference/
│   ├── api.md              # Detailed API reference
│   ├── patterns.md         # Common usage patterns
│   └── troubleshooting.md  # Known issues and solutions
└── scripts/
    └── helper.sh           # Output loaded, code never loaded
```

**Implementation**:

- SKILL.md lists available references as inline links or mentions
- Agent reads SKILL.md, discovers relevant references by name/description, and loads only the files it needs
- No file loads into context unless explicitly referenced

### Pattern 2: Tiered Documentation

Create explicit documentation tiers that match the layer model:

```markdown
# Skill Name

## Quick Start (50 lines)

One command to get started, basic usage example, when to use this skill

## Core Features (300 lines)

Main API reference, common patterns, configuration options

## See also

- [Advanced patterns](reference/advanced.md)
- [Edge cases](reference/edge-cases.md)
- [Troubleshooting](reference/troubleshooting.md)
```

**Rule of thumb**: SKILL.md ≤ 500 lines. If longer, split into references.

### Pattern 3: Metadata-Driven Discovery

Use metadata sections that help agents understand what exists without loading it:

```yaml
---
name: Data Processing
description: Transform and validate data with JSON schema
references:
  api: Contains full API signatures for all functions
  patterns: Common data transformation recipes
  troubleshooting: Debugging validation errors
---
```

**Agent behavior**: Reads metadata, decides which features are relevant, then loads corresponding reference files.

## Implementation Guidelines

### For Claude Code Skills

1. **Keep SKILL.md focused**
   - Frontmatter + setup (50 lines)
   - Core usage (200 lines max)
   - Links to references (~20 lines)
   - Total: ~300-500 lines

2. **Organize references by task**

   ```
   reference/
   ├── api-reference.md         # "How do I call this?"
   ├── common-patterns.md       # "How do I do X?"
   ├── troubleshooting.md       # "Why isn't this working?"
   └── advanced/
       ├── performance.md       # "How do I optimize?"
       └── edge-cases.md        # "What about edge case Y?"
   ```

3. **Use scripts for complex operations**
   - Script code never loads into context—only output enters the context window
   - Scripts can reference separate documentation without bloating context

4. **Link liberally but load sparingly**
   - Reference files are cheap—create them freely; they cost tokens only when loaded
   - Use clear naming that signals content ("api-reference", "troubleshooting") and add brief descriptions in metadata/frontmatter

### For Agent Instructions and System Prompts

- **Minimal baseline**: only what the agent needs to understand its role, brief descriptions of available tools/skills, and where to find detailed information
- **Discovery-oriented**: tell agents how to explore available resources (e.g., "See `reference/available-skills.md` for complete skill list")
- **Context-aware examples**: example snippets in main instructions, comprehensive examples in reference files

## Gotchas and Anti-Patterns

### ❌ Anti-Pattern: All-in-One Monster Files

```markdown
# Everything

[10,000 lines covering API, examples, troubleshooting, advanced patterns]
```

**Problem**: Agents pay full cost regardless of what they need
**Solution**: Split into focused reference files linked from main documentation

### ❌ Anti-Pattern: Hidden Information

```markdown
# Quick Start

[Basic usage]
[No links to detailed documentation]
```

**Problem**: Agents don't know detailed information exists
**Solution**: Explicitly link to reference files, add metadata about available resources

### ❌ Anti-Pattern: Code in Context Instead of Scripts

```markdown
# Implementation Details

[2,000 lines of source code, followed by usage instructions]
```

**Problem**: Code that agents never need loads every time
**Solution**: Keep code in separate files/scripts, load only output into context

### ❌ Anti-Pattern: Over-Nesting

```
reference/
├── advanced/
│   ├── performance/
│   │   ├── optimization/
│   │   │   └── caching/
```

**Problem**: Agents have trouble navigating deep hierarchies
**Solution**: Max 2-3 levels, use clear naming instead

### ⚠️ Risk: Information Discoverability

**Problem**: Hiding information too deeply makes it undiscoverable
**Solution**:

- Always link from main documentation
- Use clear, descriptive filenames and metadata/index files
- Test that agents can find needed information

## Implementation Checklist

- [ ] Main skill/instruction document ≤ 500 lines
- [ ] Complex topics moved to separate reference files
- [ ] All references linked from or mentioned in main document
- [ ] Metadata includes brief descriptions of available resources
- [ ] File organization follows task-oriented structure
- [ ] No full source code loaded into context (kept in scripts instead)
- [ ] Scripts have clear output format, code hidden from context
- [ ] Each reference file has a clear purpose stated in heading
- [ ] No redundancy between files—unique content in each file
- [ ] Agents can discover and navigate all available resources

## Decision Framework

| Scenario                                          | Decision                                                      |
| ------------------------------------------------- | ------------------------------------------------------------- |
| Agents ask for something → you point them to docs | ✅ Good—docs are discoverable                                 |
| Something might be needed but probably isn't      | ✅ Move to reference file                                     |
| Information needed for every interaction          | ✅ Keep in main documentation                                 |
| Detailed examples for advanced use                | ✅ Move to reference file                                     |
| Doc layers contradict each other                  | ❌ Fix at the source—the more specific layer is authoritative |
| Agents can't find something they need             | ❌ Add metadata or link                                       |
| Main document keeps growing                       | ❌ Extract to reference files                                 |
