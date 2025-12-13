# CodeQue Concepts

## Overview

- Semantic code search engine that understands code syntax
- Matches code structurally using AST (Abstract Syntax Tree)
- Query language supports wildcards, partial matching, ignores formatting

## Supported Languages

### Structural Search (AST-based)

- JavaScript, TypeScript (including JSX/TSX)

## Search Modes

### `include` (Default)

- Matches code containing query pattern
- Ignores order of enumerable properties (object keys, statements)
- Allows additional properties/statements not in query
- Matches code with missing optional properties from query

### `include-with-order`

- Like `include` but enforces statement order
- Additional statements can exist between matched statements
- Useful when sequence matters

### `exact`

- Matches only identical code structure
- No extra properties or statements allowed
- Formatting differences still ignored

### `text`

- Regex-based string matching
- Treats code as text, not AST
- Handles whitespace flexibly (ignores formatting)
- Useful for initial discovery or non-structural patterns

## Wildcards

### Syntax-Aware Modes (include, include-with-order, exact)

| Wildcard | Matches                  | Example                                        |
| -------- | ------------------------ | ---------------------------------------------- |
| `$$`     | Any identifier           | `const $$ = 5` matches any const declaration   |
| `$$$`    | Any statement/expression | `func($$$)` matches any function call argument |
| `"$$"`   | 0+ characters in string  | `"$$test"` matches strings ending in "test"    |
| `"$$$"`  | 1+ characters in string  | `"$$$"` matches non-empty strings              |
| `0x0`    | Any number               | `const x = 0x0` matches any numeric assignment |

### Text Mode

| Wildcard | Matches                   |
| -------- | ------------------------- |
| `$$`     | 0+ characters (same line) |
| `$$$`    | 1+ characters (same line) |
| `$$m`    | 0+ characters (multiline) |
| `$$$m`   | 1+ characters (multiline) |

### Wildcard Combinations

- Wildcards combine with literal text: `some$$` matches `someVar`, `someFunction`
- Multiple wildcards in one query allowed
- String wildcards only work inside quotes

## Writing Queries

### Basic Approach

- Copy existing code as starting point
- Replace specific identifiers with `$$`
- Replace expressions/statements with `$$$`
- Remove unneeded parts (in `include` mode)

### Query Syntax Requirements

- Query must be valid source code
- Parser interprets query literally

### Common Pitfalls

#### Searching for Objects

```javascript
// ❌ Wrong - parsed as code block
{
  key: "value";
}

// ✅ Correct - expression brackets
({
  key: "value",
});
```

#### Searching for Strings

```
// ❌ Wrong - parsed as directive
"use-strict"
```

```
// ✅ Correct - expression brackets
"my string"
```

## Case Sensitivity

- Toggle affects identifiers and string contents
- Default varies by tool (CLI: case-sensitive, ESLint: case-insensitive)

## File Filtering

- Respects `.gitignore` by default
- Glob patterns for include/exclude
- Optional: search ignored files, node_modules, large files (>100kb)

## Available Tools

### VSCode Extension

- Primary interface for developers
- Interactive search with results panel
- Select-to-search functionality
- Todo-like results management
- File dependency search

### CLI

- Terminal and headless environments
- Script integration for assertions
- Git hook support
- Interactive query editor

### ESLint Plugin

- Custom linting rules via CodeQue queries
- Two severity levels: `@codeque/error`, `@codeque/warning`
- File filtering per rule

## Query Examples

### Find Function Calls

```
// Any console method
console.$$();

// Specific hook usage
const $$$ = useMyHook();
```

### Find React Patterns

```tsx
// Component with specific prop
<Button variant="primary" />

// Object literal as prop (bad pattern)
<$$ $$={{}} />

// Inline map in JSX
<$$ $$={$$$.map(() => $$$)} />
```

### Find Imports

```javascript
// Named import from package
import { $$ } from "lodash";

// Default import
import $$ from "$$$";
```

### Find Type Definitions

```typescript
// Specific type pattern
type $$ = "sm" | "md" | "lg"

// Interface with specific key
interface $$ {
  id: string
}
```

### Link Multiple Statements

```javascript
const { confirm } = useAsyncDialog();
const $$ = useCallback($$$, [confirm]);
```
