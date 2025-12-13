# CodeQue CLI Guide

## Basic Usage

<required>
  - Always run using `bunx codeque`
  - Never use interactive mode
  - Always use `--query` or `--queryPath` argument
</required>

### Inline Query

```bash
bunx codeque --query "console.log($$$)"
```

- Multiple queries: `--query "pattern1" "pattern2"`

### Query from File

```bash
bunx codeque --queryPath ./queries/my-query.ts
```

- Useful for complex multiline queries
- Multiple files: `--queryPath file1.ts file2.ts`

## CLI Options

| Option              | Short  | Description                                                   | Default         |
| ------------------- | ------ | ------------------------------------------------------------- | --------------- |
| `--mode`            | `-m`   | Search mode: `exact`, `include`, `include-with-order`, `text` | `include`       |
| `--root`            | `-r`   | Root directory for search                                     | `process.cwd()` |
| `--entry`           | `-e`   | Entry point file for import-based file discovery              | -               |
| `--caseInsensitive` | `-i`   | Case insensitive matching                                     | `false`         |
| `--limit`           | `-l`   | Max results to display                                        | `20`            |
| `--query`           | `-q`   | Inline query string(s)                                        | -               |
| `--queryPath`       | `-qp`  | Path to query file(s)                                         | -               |
| `--git`             | `-g`   | Search only files changed since last commit                   | `false`         |
| `--invertExitCode`  | `-iec` | Return non-zero if matches found (for assertions)             | `false`         |
| `--printFilesList`  | `-pfl` | Print list of searched files                                  | `false`         |
| `--omitGitIgnore`   | `-ogi` | Include git-ignored files                                     | `false`         |
| `--allExtensions`   | `-ae`  | Search all file extensions (useful for text mode)             | `false`         |
| `--version`         | `-v`   | Print CLI version                                             | -               |

## Search Modes

<required>
  - Start with `include` (default), `exact`, or `include-with-order`
  - Switch to `text` mode only if you need more permissive search
</required>

### include (default)

```bash
bunx codeque --query "useState($$)"
```

- Matches code containing query pattern
- Ignores order, allows extra statements

### exact

```bash
bunx codeque --mode exact --query "const x = 5"
```

- Matches only identical structures

### include-with-order

```bash
bunx codeque --mode include-with-order --query "a(); b();"
```

- Like include but enforces order

### text (fallback)

```bash
bunx codeque --mode text --query "TODO:$$"
```

- Regex-based, works on any file type
- Faster but less accurate than AST modes
- Use `--allExtensions` for non-JS/TS files

## Common Use Cases

### Find API Usage

```bash
bunx codeque --query "const $$$ = useMyHook()"
```

### Search Changed Files Only

```bash
bunx codeque --git --query "console.log($$$)"
```

### Search by Import Dependency

```bash
bunx codeque --entry ./src/pages/HomePage.tsx --query "fetchData()"
```

- Searches files imported by entry point (direct and indirect)

## Assertions

### Block Bad Patterns

```bash
bunx codeque --query "$$.skip()" "$$.only()" --invertExitCode
```

- Returns exit code 1 if matches found
- Exit code 0 if no matches

### Pre-commit Hook Example

```bash
#!/bin/sh
# .git/hooks/pre-commit

bunx codeque --git \
  --query '$$.only(' '$$.skip(' 'console.log(' '// todo' \
  --mode text \
  --invertExitCode \
  --caseInsensitive

if [ $? -ge 1 ]; then
  echo '🛑 Found restricted code. Terminating.'
  exit 1
fi
```

### CI Pipeline Example

```bash
# Fail if any skipped tests exist
bunx codeque --query "it.skip(" "describe.skip(" --invertExitCode

# Fail if console.log exists in production code
bunx codeque --root ./src --query "console.log($$$)" --invertExitCode
```

## Output

- Results show file path, line number, matched code
- File links are clickable in supported terminals (CMD/Ctrl + click)
- Use `--limit` to control result count
- Use `--printFilesList` to see searched files

## Exit Codes

| Code | Default Behavior | With `--invertExitCode` |
| ---- | ---------------- | ----------------------- |
| 0    | Matches found    | No matches found        |
| 1    | No matches found | Matches found           |
