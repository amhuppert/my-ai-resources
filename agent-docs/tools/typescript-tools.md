# TypeScript Tools

## Replace Import Codemod

```bash
ai codemods replace-import --from <specifier> --to <specifier> [--dry-run] [--tsconfig <path>] [--include-js]
```

Rewrites module specifiers across TypeScript/JavaScript codebase using TypeScript module resolution.

### Examples

**Package → Local**

```bash
ai codemods replace-import --from zod --to ./src/utils/custom-zod
# src/features/auth.ts:    "zod" → "../utils/custom-zod"
# src/api/validate.ts:     "zod" → "../utils/custom-zod"
# src/features/deep/page.ts: "zod" → "../../utils/custom-zod"
```

**Local → Package**

```bash
ai codemods replace-import --from ./src/utils/custom-zod --to zod
# All relative/alias imports of custom-zod → "zod"
```

**Alias (selective)**

```bash
ai codemods replace-import --from @/old/module --to @/new/module
# "@/old/module" → "@/new/module"    ✓
# "./old/module" → "./old/module"    (unchanged - only exact alias matches)
```

**Path (exhaustive)**

```bash
ai codemods replace-import --from ./src/shared/module --to @/new/module
# "@/shared/module" → "@/new/module"   ✓
# "./shared/module" → "@/new/module"   ✓
# (any path resolving to src/shared/module)
```

**Absolute path**

```bash
ai codemods replace-import --from /abs/path/to/old.ts --to ./src/new.ts
# All imports of old.ts → relative to new.ts per importer
```

**Dry run**

```bash
ai codemods replace-import --from lodash --to lodash-es --dry-run
# Previews changes without writing
```
