---
description: Study project directory structure and update docs (optional depth argument)
allowed-tools: Bash(code-tree:*), Agent, Write(memory-bank/project-brief.md), MultiEdit(memory-bank/project-brief.md), Edit(memory-bank/project-brief.md)
---

Your task is to update the project brief based on the current directory structure and existing project information.

First, review the following information:

1. Current directory tree:
   <directory_tree>
   !`code-tree $ARGUMENTS`
   </directory_tree>

2. Existing project brief:
   <existing_brief_location>
   @memory-bank/project-brief.md
   </existing_brief_location>

Instructions:

1. Analyze the directory tree and existing project brief.
2. **Use the Task tool to conduct parallel research on the project structure in ONE ROUND**. Create separate tasks analyzing each major directory/component based on the project context.
3. Wait for all tasks to complete, then collect and merge their findings.
4. Based on the merged findings, create or update the project brief to ensure it is fully up-to-date.
5. Include a directory tree in the updated brief, augmented with terse, one-line descriptions of each directory.

<critical>
  **ONE-ROUND RESEARCH ONLY**: Each sub-agent must gather ALL information needed for their area in their single response
</critical>

## Sub-Agent Research Instructions

### **Task Tool Usage**

Create parallel Task calls for major areas you identify from the directory structure and project context. Each sub-agent MUST provide comprehensive analysis in their single response.

### **Sub-Agent Output Format**

<critical>
  **MANDATORY FORMAT**: Each sub-agent MUST structure their response exactly as follows:
</critical>

```
## [AREA NAME] Analysis

### Description
[Overall purpose and architecture of this area - 2-3 sentences]

### Key Files
- **`path/to/file.py`** - [Specific role/purpose]
- **`path/to/config.yml`** - [Configuration role]
- **`path/to/routes/`** - [Directory role]
- **`path/to/models/`** - [Models/data structures role]

### Integration Points
[How this area connects to other parts of the system]

### Notable Patterns
[Important architectural patterns, conventions, or observations]
```

### **Required Information from Each Sub-Agent**

Each sub-agent must identify and report:

- **Primary implementation files** with their specific roles
- **Configuration files** with what they configure
- **Key directories** with their purposes
- **Current vs. legacy** components (mark which to use)
- **Integration points** with other system parts

### **Sub-Agent Prompt Template**

When creating Task calls, use this structure:

```
Task: "Research [AREA NAME]"
Prompt: "Analyze the [AREA/DIRECTORY] in detail. Using the mandatory output format, provide:
1. DESCRIPTION: Overall purpose and architecture
2. KEY FILES: List important files with their specific roles
3. INTEGRATION POINTS: How this connects to other system parts
4. NOTABLE PATTERNS: Key architectural patterns or conventions

Focus on identifying primary files, configuration locations, and actionable file paths."
```

<critical>
  **ACTIONABLE FILE LINKING REQUIRED**: Transform abstract descriptions into specific file paths with roles
</critical>

## Making Project Briefs Actionable

### **Context Annotations**

Always include parenthetical context in final brief:

- `(main logic)` - Primary business logic
- `(current)` - Current/recommended version
- `(legacy)` - Deprecated but still present
- `(config)` - Configuration settings
- `(what to look for)` - Specific patterns/variables

### **Actionable Format Requirements**

<example type="valid">
**Feature Format**: "**Feature Name** - `path/to/main/file.py` (purpose), `path/to/config.yml` (settings)"
- JWT authentication - `src/public_api/auth_token_validation.py` (main validation)
- DataDog config - `appconfig/config.yml` (DD_* environment variables)
</example>

<example type="invalid">
**Avoid**: "JWT-based authentication" 
**Problem**: No guidance on where to find implementation
</example>

Before providing the updated project brief, in <project_analysis> tags inside your thinking block:

- List out the key directories and files from the directory tree.
- Quote relevant sections from the existing project brief.
- Compare the directory structure with the existing brief to identify any discrepancies.
- Summarize the findings from the Agent/Task tool research.
- **Identify primary files for each major feature** from sub-agent reports.
- **Map abstract features to specific file paths** with context annotations.

This will help ensure a thorough understanding of the project structure and create actionable documentation.
