---
name: mb-quick-add
description: This skill should be used to quickly add a file path to the memory bank and link it to a feature.
argument-hint: '<file-path> "<description>" <feature-slug>'
allowed-tools: mcp__memory-bank__*
---

# Quick Add Path to Memory Bank

Quickly add a file or directory path to the memory bank and link it to a feature.

## Parsed Arguments

!`bun run ${CLAUDE_PLUGIN_ROOT}/scripts/parse-quick-add-args.ts '$ARGUMENTS'`

## Instructions

1. **Check Parse Result:**
   - If the parsed JSON has `success: false`, display the error message and stop
   - Extract: `path`, `type`, `description`, `feature_slug` from the JSON

2. **Verify Feature Exists:**
   - Call `mcp__memory-bank__get_feature` with the `feature_slug`
   - If the feature doesn't exist, display error and stop:

     ```
     Error: Feature '<feature_slug>' does not exist.

     Available options:
     - Create the feature first with: mcp__memory-bank__create_features
     - Use /add-feature to create a feature with full context
     - List existing features with: mcp__memory-bank__list_features
     ```

3. **Create Path:**
   - Call `mcp__memory-bank__create_paths` with:
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
   - Extract the path ID from the response

4. **Link to Feature:**
   - Call `mcp__memory-bank__link_paths_to_feature` with:
     ```json
     {
       "feature_slug": "<feature_slug>",
       "path_ids": ["<path_id>"]
     }
     ```

5. **Confirm:**
   - Display: "Added `<path>` to feature `<feature_slug>`"

## Example Usage

```
/mb-quick-add src/auth/oauth.ts "OAuth token validation" auth
```
