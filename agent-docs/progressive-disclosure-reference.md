# Progressive Disclosure Reference Guide for AI Agents

<Overview>
Progressive disclosure is an information architecture pattern that reveals complexity gradually rather than all at once, minimizing context window bloat while keeping comprehensive information accessible on-demand. In AI/LLM contexts, it means limiting what enters the context to the minimum necessary amount and adding detail over time as needed. This pattern is essential for building token-efficient agents and skills that can access large knowledge bases without overwhelming the LLM.
</Overview>

## Core Concepts

### The Problem It Solves

- **Context bloat**: Loading entire knowledge bases upfront wastes tokens on irrelevant information
- **Cognitive overload**: Large amounts of information confuse models and increase hallucination risk
- **Cost inefficiency**: Every token in the context costs money; unnecessary context is expensive
- **Poor agent performance**: Models struggle to prioritize when everything is equally visible

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

### Key Mental Model

Think of progressive disclosure as a **filesystem-based information retrieval system**:

- The agent is a user navigating your knowledge base
- Metadata is the directory listing and README
- Skill documentation is the main guide file
- Reference files are detailed topic files the agent discovers and reads selectively
- Script output never loads into context—only results

## Design Patterns

### Pattern 1: Filesystem Navigation

Structure skills as navigable filesystems where the agent discovers content:

```
skill-name/
├── SKILL.md                 # Layer 1: 100-200 lines, links to references
├── reference/
│   ├── api.md              # Detailed API reference
│   ├── patterns.md         # Common usage patterns
│   ├── troubleshooting.md  # Known issues and solutions
│   └── examples/
│       ├── basic.md
│       ├── advanced.md
│       └── edge-cases.md
└── scripts/
    └── helper.sh           # Output loaded, code never loaded
```

**Implementation**:

- SKILL.md frontmatter lists available references as inline links or mentions
- Agent reads SKILL.md, discovers relevant references by name/description
- Agent uses `read-file` or `cat` to load only needed reference files
- No file loads into context unless explicitly referenced

### Pattern 2: Tiered Documentation

Create explicit documentation tiers that match layer model:

```markdown
# Skill Name

## Quick Start (50 lines)

- One command to get started
- Basic usage example
- When to use this skill

## Core Features (300 lines)

- Main API reference
- Common patterns
- Configuration options

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
features:
  - Basic validation
  - Schema generation
  - Transformation pipelines
  - Performance optimization (see reference/performance.md)
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
   - Script code never loads into context
   - Only output enters context window
   - Script can reference separate documentation without bloating context
   - Example: `read-file reference/generated-api.md` in script output

4. **Link liberally but load sparingly**
   - Reference files are cheap—create them freely
   - The agent pays for them only if they're loaded
   - Use clear naming that signals content ("api-reference", "troubleshooting")
   - Add brief descriptions in metadata/frontmatter

### For Agent Instructions and System Prompts

1. **Minimal baseline**
   - Include only what agent needs to understand its role
   - Brief descriptions of available tools/skills
   - Where to find detailed information

2. **Discovery-oriented**
   - Tell agents how to explore available resources
   - Example: "See `reference/available-skills.md` for complete skill list"
   - Agents can request detailed information as needed

3. **Context-aware examples**
   - Don't include all possible examples upfront
   - Example snippets in main instructions
   - Comprehensive examples in reference files

### For Large Knowledge Bases (RAG Systems)

1. **Metadata layer**: Indexable summaries with retrieval keys
2. **Retrieval mechanism**: Agent uses metadata to decide what to fetch
3. **Loading strategy**: Only matching documents enter context
4. **Query refinement**: Agent can adjust queries if results don't match

## Token Efficiency Metrics

| Approach                         | Baseline        | With Progressive Disclosure | Savings |
| -------------------------------- | --------------- | --------------------------- | ------- |
| Full skill content always loaded | 5,000+ tokens   | 100 tokens metadata         | 98%     |
| 10 skills in context             | 50,000+ tokens  | 1,000 tokens metadata       | 98%     |
| Monolithic documentation         | 150,000+ tokens | Progressive loading         | 90-98%  |

**Practical example**: A project with 10 Claude Code skills

- **Without PD**: 5k tokens per skill × 10 = 50,000 tokens always
- **With PD**: 100 tokens metadata × 10 = 1,000 tokens, load full skill (5k) only when relevant
- **Result**: 49,000 tokens saved per interaction if only 1-2 skills needed

## Common Patterns

### Pattern: Nested Reference Navigation

For deep topics, use nested references that agents discover progressively:

```markdown
# API Reference

Core functions (keep this section brief)

**For advanced usage patterns, see [reference/advanced-patterns.md](reference/advanced-patterns.md)**

Advanced Patterns file then contains:

- Complex configurations
- With links to [reference/advanced-patterns/performance.md](reference/advanced-patterns/performance.md)
- And [reference/advanced-patterns/edge-cases.md](reference/advanced-patterns/edge-cases.md)
```

Agent discovers each layer only when exploring that topic.

### Pattern: Task-Oriented Organization

Organize references by common tasks rather than technical categories:

```
reference/
├── "How do I validate data?"
├── "How do I transform data?"
├── "How do I debug validation errors?"
├── "How do I optimize performance?"
```

Instead of:

```
reference/
├── api/
├── types/
├── configuration/
├── examples/
```

### Pattern: Searchable Metadata Index

Create a lightweight index that helps agents discover what exists:

```markdown
# Available References

| Topic           | File                                               | Use When                            |
| --------------- | -------------------------------------------------- | ----------------------------------- |
| API Signatures  | [api.md](reference/api.md)                         | You need exact function signatures  |
| Common Patterns | [patterns.md](reference/patterns.md)               | You need to implement a common task |
| Performance     | [performance.md](reference/performance.md)         | Your code is running slowly         |
| Troubleshooting | [troubleshooting.md](reference/troubleshooting.md) | Something isn't working             |
```

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

Here's the source code for the internal function...
[2,000 lines of source code]

Here's how to use it...
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
│   │   │       └── redis/
```

**Problem**: Agents have trouble navigating deep hierarchies
**Solution**: Max 2-3 levels, use clear naming instead

### ⚠️ Risk: Information Discoverability

**Problem**: Hiding information too deeply makes it undiscoverable
**Solution**:

- Always link from main documentation
- Use clear, descriptive filenames
- Include metadata/index files
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

| Scenario                                          | Decision                           |
| ------------------------------------------------- | ---------------------------------- |
| Agents ask for something → you point them to docs | ✅ Good—docs are discoverable      |
| Something might be needed but probably isn't      | ✅ Move to reference file          |
| Information needed for every interaction          | ✅ Keep in main documentation      |
| Detailed examples for advanced use                | ✅ Move to reference file          |
| Information contradicts what's in reference       | ❌ Fix—local code takes precedence |
| Agents can't find something they need             | ❌ Add metadata or link            |
| Main document keeps growing                       | ❌ Extract to reference files      |

## Related Concepts

- **Retrieval-Augmented Generation (RAG)**: Progressive disclosure at scale using vector databases
- **Filesystem-based knowledge**: Using directory structure as information architecture
- **Metadata-driven systems**: Using summaries to guide retrieval
- **Lazy loading**: Loading resources only when needed
- **Information scent**: Making information discoverable through naming and linking
