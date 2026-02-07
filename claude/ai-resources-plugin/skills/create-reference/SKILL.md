---
name: create-reference
description: This skill should be used when the user wants to create or update a reference document that teaches AI agents how to use a tool, technology, library, framework, or API. It conducts thorough research (web searches, documentation reading, codebase exploration) and produces a comprehensive, AI-optimized reference document.
argument-hint: "<subject> [--update <existing-file>] [--language <language>]"
allowed-tools: Read, Write, Glob, Grep, WebSearch, WebFetch, Task, AskUserQuestion, Bash(ls:*)
---

# Reference Document Creator

Create or update reference documents that provide AI agents with comprehensive knowledge of a tool, technology, library, framework, or API. The resulting document enables an AI agent to work effectively with the subject without prior knowledge.

<subject>
$ARGUMENTS
</subject>

## Step 1: Parse the Request

Determine the mode and subject from the arguments:

- **Create mode** (default): Generate a new reference document
- **Update mode**: If `--update <path>` is specified or the user asks to update an existing document, read the existing document first and extend/revise it

Determine the subject source:

- **Public tool/library/framework**: Subject is identified by name (e.g., "Zod", "React Router v7", "Playwright"). Perform web research.
- **Local codebase/tool**: Subject is a local directory or file path. Explore the codebase.
- **Both**: Some subjects benefit from combining web research with local codebase analysis.

If the subject or scope is ambiguous, use AskUserQuestion to clarify:

- What specific aspects to cover (full API, specific module, common patterns)
- Target language if the tool supports multiple (e.g., BAML supports TypeScript and Python)
- Intended audience context (what types of projects will use this reference)

## Step 2: Research the Subject

Conduct thorough research to build comprehensive understanding. Adapt approach based on subject source.

### For Public Tools/Libraries

1. **Search for official documentation**: Look for API references, getting started guides, and configuration docs
2. **Search for guides and tutorials**: Find practical usage patterns, common recipes, and best practices
3. **Search for changelogs and migration guides**: Identify recent breaking changes or important version-specific behavior
4. **Fetch key documentation pages**: Read official docs pages in full using WebFetch to extract precise API details, function signatures, configuration options, and examples
5. **Search for common pitfalls**: Look for known gotchas, common mistakes, and debugging tips

### For Local Codebases

1. **Explore the project structure**: Use Glob and directory listing to understand organization
2. **Read key files**: Entry points, configuration files, READMEs, type definitions, and public API surfaces
3. **Identify the public API**: Exported functions, classes, types, CLI commands, and configuration options
4. **Find usage examples**: Tests, examples directories, and README snippets
5. **Check for existing documentation**: Internal docs, JSDoc comments, docstrings

### For Both

Combine findings from web and local sources. Local code takes precedence when web documentation contradicts actual implementation.

## Step 3: Organize and Draft the Reference

Structure the reference document following these principles.

### Document Structure Template

```markdown
# [Subject Name] Reference Guide for AI Agents

<Overview>
[1-3 sentence description of what the tool does and its primary use case.]
[Key workflow or mental model in one sentence.]
</Overview>

## Installation / Setup

[Commands, dependencies, prerequisites]

## Core Concepts

[Key mental models and terminology the agent must understand]

## API Reference / Key APIs

[Function signatures, parameters, return types]
[Organized by logical groupings]

## Configuration

[Config files, environment variables, options]

## Common Patterns

[Practical recipes for frequent tasks]

## Commands / CLI

[If applicable: command syntax, flags, examples]

## Troubleshooting / Gotchas

[Common pitfalls and their solutions]
```

Adapt this structure to the subject. Not all sections apply to every tool. Add or remove sections as needed. The structure should follow the natural workflow of using the tool.

### Writing Standards

**Format rules:**

- Use bulleted lists over prose
- One concept per bullet
- Imperative form for instructions ("Run `npm install`", not "You should run `npm install`")
- Include code blocks for all commands, API calls, and configuration examples
- Use tables for reference data (options, flags, type mappings)
- Use Mermaid diagrams for architectural concepts or workflows when clearer than text
- Use XML tags (`<Overview>`, `<critical>`, `<example>`) for structural clarity where appropriate

**Content rules:**

- Optimize for AI agent consumption: high information density, minimal tokens
- Include precise API signatures with types (not just descriptions)
- Show concrete code examples, not abstract descriptions
- Specify versions when version-specific behavior exists
- Include the "why" only when it prevents common misuse
- Omit obvious information that any LLM would already know
- Focus on actionable knowledge: what to do, how to do it, what to avoid

**Code examples:**

- Keep examples minimal but complete (runnable when possible)
- Show the most common usage first, then variations
- Include expected output or return values when non-obvious
- Annotate with inline comments for non-obvious behavior

## Step 4: Validate the Document

Before saving, verify the document against this checklist:

- [ ] Covers installation/setup
- [ ] Core concepts are explained concisely
- [ ] All major API surfaces are documented with signatures
- [ ] Code examples are included for each major feature
- [ ] Common patterns section addresses real-world usage
- [ ] No redundancy between sections
- [ ] No prose explanations where a code example would suffice
- [ ] No information an LLM would already know (e.g., "JavaScript is a programming language")
- [ ] All code examples use correct syntax for the documented version
- [ ] Document enables an agent to start using the tool without any other resources

## Step 5: Save the Document

**For new documents:**

- Save to `agent-docs/` directory in the project root
- Filename: `<subject-name>-reference.md` (kebab-case)
- If language-specific variants exist, use: `<subject-name>-reference-<language>.md`
- If the subject warrants multiple files, create a subdirectory: `agent-docs/<subject-name>/`

**For updates:**

- Edit the existing file in place
- Preserve the overall structure unless the user requests restructuring
- Add new sections or expand existing ones as needed
- Remove outdated information

After saving, report the file path and a brief summary of what the document covers.

## Update Mode Details

When updating an existing reference document:

1. Read the existing document in full
2. Identify what new information the user wants to add
3. Research the new topic areas using Step 2
4. Integrate new content into the existing structure
5. Resolve any contradictions between old and new content (new takes precedence)
6. Verify the updated document passes the validation checklist
