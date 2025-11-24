# Add Relevant Links

Add a bulleted list of links to relevant documentation, rules, and example implementations.

## Process

1. **Determine focus**: Identify the task/feature from file content or user input
2. **Search for relevant files**:
   - Search codebase with targeted queries about the focus area
   - List all Markdown files in the project (`**/*.md`) and identify the ones that are relevant to the focus area
   - Search for documentation in `docs/` directory and throughout the project
   - Search for cursor rules in `.cursor/rules/` directory
3. **Organize links by category**:
   - Cursor Rules: Rules in `.cursor/rules/`
   - Documentation: Markdown files anywhere in project (docs/, src/, etc.)
   - Example Implementations: Relevant source files
4. **Add descriptions**: After each link, add a colon (`:`) followed by "Read when [trigger] to [outcome]" format
5. **Use relative paths**: All links relative to project root

## Format

```markdown
## Relevant Documentation & Rules

### Cursor Rules

- [Rule Name](.cursor/rules/path/to/rule.mdc): Read when [trigger] to [outcome].

### Documentation

- [Doc Title](docs/path/to/doc.md): Read when [trigger] to [outcome].

### Example Implementations

- [File Name](src/path/to/file.ts): Read when [trigger] to [outcome].
```

## Search Strategy

Think critically about the focus area to develop targeted search queries:

- Identify key concepts, patterns, and technologies involved
- Search for both general patterns (e.g., "pattern implementation") and specific implementations
- Consider related topics and dependencies
- Search for both guidelines (rules, docs) and concrete examples (source files)
- Use multiple search approaches to ensure comprehensive coverage

## Requirements

- All paths MUST be relative to project root
- Format: `- [Title](path): Read when [trigger] to [outcome]` (colon after link)
- Use consistent "Read when [trigger] to [outcome]" format for all descriptions
- Group links logically by category
- Search comprehensively before adding links
- Include both rules and examples when available
