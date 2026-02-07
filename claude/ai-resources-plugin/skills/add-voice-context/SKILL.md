---
name: add-voice-context
description: This skill should be used when the user wants to add context to the voice-to-text context file for the current project. Handles adding misheard words, terminology corrections, and project-specific information to improve transcription cleanup quality.
allowed-tools: Read, Glob, Edit, Write
---

# Add Voice-to-Text Context

Add new context entries to the project's voice-to-text context file to improve transcription cleanup accuracy. This addresses cases where the cleanup step produces incorrect output — either misheard terms, wrong spelling, or missing domain knowledge.

## How the context file works

The voice-to-text tool sends transcribed audio to Claude for cleanup. The context file is injected into the cleanup prompt:

```
Project Context:
<context>
{contents of the context file}
</context>
```

Claude uses this to correctly spell project-specific terms, recognize domain vocabulary, and apply naming conventions. Adding targeted entries prevents repeated transcription errors.

## Step 1: Locate and read the context file

1. Read `voice.json` in the current directory to find the `contextFile` path
2. If `voice.json` does not exist, check for a `voice-context.md` in the current directory
3. If neither exists, inform the user that voice-to-text is not configured for this project and suggest running `/init-voice-config` first. Stop here.
4. Read the context file contents

## Step 2: Understand what to add

Determine what the user wants to add. Common cases:

- **Misheard word or phrase** — The transcriber or cleanup step consistently gets a word wrong. Example: "Zod" transcribed as "god", "CLAUDE.md" transcribed as "cloud.md"
- **New terminology** — A project term, library, or acronym that the cleanup step doesn't recognize
- **Naming convention** — A specific identifier pattern or casing rule that should be preserved
- **Project context** — Background information that helps the cleanup step make better decisions

If the user's request is vague, ask for:

- The word or phrase as it was **incorrectly** transcribed
- The **correct** form it should be cleaned up to
- Optionally, a brief definition or context note

## Step 3: Determine the correct section

The context file has four sections. Place new entries in the appropriate one:

| Section                | Add when...                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Technologies**       | Adding a library, framework, tool, or runtime                                                                |
| **Terminology**        | Adding a domain term, acronym, or frequently misheard word. This is the most common section for corrections. |
| **Naming Conventions** | Adding a casing rule or specific identifier pattern                                                          |
| **Project**            | Updating the project description (rare)                                                                      |

If a term doesn't clearly fit any section, default to **Terminology**.

## Step 4: Add the entry

Edit the context file to add the new entry in the appropriate section, following the existing format:

- **Technologies**: `- {Name} ({brief description})`
- **Terminology**: `- **{Term}** - {brief definition or correction note}`
- **Naming Conventions**: `- {convention description}`

When adding a misheard word correction, include the common misheard form in the definition to help Claude recognize and correct it:

```markdown
- **Zod** - Runtime validation library (not "god", "sod", or "zawed")
- **lgit** - Git wrapper for .local directory (not "legit" or "l-git")
```

### Guidelines

- Keep the total context file under 80 lines — it is injected into every cleanup prompt
- If the file is approaching 80 lines, suggest removing less relevant entries before adding new ones
- Match the formatting style of existing entries in the file
- Include exact capitalization for each term
- For acronyms, include the expansion
- Omit widely known terms (JavaScript, React, Git) unless they are specifically being misheard

## Step 5: Confirm

After editing, display:

- The specific entry or entries that were added
- Which section they were added to
- A brief reminder: changes take effect on the next voice-to-text recording
