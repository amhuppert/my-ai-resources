---
name: sync-memory-bank
description: This skill should be used to audit the memory bank against the actual codebase. It identifies missing files, stale paths, and untracked files that should be added.
allowed-tools: mcp__memory-bank__*, Glob, Read, AskUserQuestion
---

# Sync Memory Bank with Codebase

Audit the memory bank against the actual codebase to identify stale paths and potential additions.

## Instructions

### 1. Get All Tracked Paths

- Call `mcp__memory-bank__list_paths` to get all tracked paths

### 2. Check Each Path

- For each path, use Glob to check if the file/directory exists
- Categorize paths as:
  - **existing**: File/directory still exists
  - **missing**: File/directory no longer exists (moved or deleted)

### 3. Find Potential Additions

- Call `mcp__memory-bank__list_features` to get all features
- For each feature, scan related directories using Glob
- Identify files that match feature patterns but aren't tracked
- Consider common patterns:
  - Test files for tracked source files
  - Type definition files
  - Related configuration files

### 4. Report Findings

Present findings in a clear format:

```
## Sync Report

### Missing Paths (files deleted/moved)
- `src/old-file.ts` - linked to feature: auth

### Potential Additions (untracked files)
- `src/auth/new-handler.ts` - matches feature: auth
- `src/auth/__tests__/oauth.test.ts` - test for tracked file
```

### 5. User Decisions

Use AskUserQuestion for each category:

**For missing paths:**

- Question: "Remove these paths from the memory bank?"
- Options: "Remove all", "Review individually", "Skip"

**For potential additions:**

- Question: "Add these paths to the memory bank?"
- Options: "Add all", "Review individually", "Skip"

### 6. Apply Changes

- For removals: Call `mcp__memory-bank__delete_path` for each
- For additions:
  - Call `mcp__memory-bank__create_paths`
  - Call `mcp__memory-bank__link_paths_to_feature` for each feature

### 7. Summary

Display summary of changes made:

- Paths removed
- Paths added
- Current totals

## Example Usage

```
/sync-memory-bank
```
