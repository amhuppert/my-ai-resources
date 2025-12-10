# CodeQue CLI Guide

## Installation

```bash
npm install -g @codeque/cli
```

## Basic Usage

### Interactive Mode

```bash
codeque
```

- Opens terminal editor for query input
- Press `ctrl+s` to execute search
- Results display with clickable file links (CMD/Ctrl + click)

### Inline Query Mode

```bash
codeque --query "console.log($$$)"
```

- Executes search immediately
- Multiple queries: `--query "pattern1" "pattern2"`

### Query from File

```bash
codeque --queryPath ./queries/my-query.ts
```

- Load query from file
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

### include (default)

```bash
codeque --query "useState($$)"
```

- Matches code containing query pattern
- Ignores order, allows extra statements

### exact

```bash
codeque --mode exact --query "const x = 5"
```

- Matches only identical structures

### include-with-order

```bash
codeque --mode include-with-order --query "a(); b();"
```

- Like include but enforces order

### text

```bash
codeque --mode text --query "TODO:$$"
```

- Regex-based, works on any file type
- Faster than AST modes
- Use `--allExtensions` for non-JS/TS files

## Common Use Cases

### Find Duplicated Code

```bash
codeque --query "const $$ = useCallback(() => { $$$ }, [])"
```

### Find API Usage

```bash
codeque --query "const $$$ = useMyHook()"
```

### Search Changed Files Only

```bash
codeque --git --query "console.log($$$)"
```

### Search by Import Dependency

```bash
codeque --entry ./src/pages/HomePage.tsx --query "fetchData()"
```

- Searches files imported by entry point (direct and indirect)

## Assertions

### Block Bad Patterns

```bash
codeque --query "$$.skip()" "$$.only()" --invertExitCode
```

- Returns exit code 1 if matches found
- Exit code 0 if no matches

### Pre-commit Hook Example

```bash
#!/bin/sh
# .git/hooks/pre-commit

codeque --git \
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
codeque --query "it.skip(" "describe.skip(" --invertExitCode

# Fail if console.log exists in production code
codeque --root ./src --query "console.log($$$)" --invertExitCode
```

## Output

- Results show file path, line number, matched code
- File links are clickable in supported terminals (CMD/Ctrl + click)
- Use `--limit` to control result count
- Use `--printFilesList` to see which files were searched

## Performance Tips

- Use `--git` for faster searches during development
- Use `--entry` to limit search scope by imports
- Use `text` mode for faster (but less accurate) searches
- More specific queries run faster than generic wildcard-heavy queries

## Exit Codes

| Code | Default Behavior | With `--invertExitCode` |
| ---- | ---------------- | ----------------------- |
| 0    | Matches found    | No matches found        |
| 1    | No matches found | Matches found           |
