---
name: ste
description: Rewrite supplied text or the preceding assistant message in
  ASD-STE100 Simplified Technical English (STE).
---

# Simplified Technical English

Rewrite the text in the invocation. If the invocation has no text, rewrite your most recent user-facing message before this invocation. If neither source exists, ask the user for text.

Use ASD-STE100 as the target style:

- Keep the original meaning, conditions, sequence, numbers, units, identifiers, and safety information. Keep code, commands, and URLs unchanged. Do not add facts.
- Use short, direct sentences in the active voice. Use an imperative verb for each instruction. Put one instruction in each sentence.
- Use one clear meaning for each word. Check the approved part of speech and meaning of each general word you use with the dictionary tool below. Keep necessary technical nouns and verbs.
- Limit procedural sentences to 20 words and descriptive sentences to 25 words when the meaning permits. Break up long paragraphs and complex noun groups.
- Replace ambiguous pronouns with the noun they refer to. Keep lists or headings when they help the reader follow the text.

## Dictionary tool

`scripts/ste.mjs` (Node 18+, relative to this skill) reads the [condensed ASD-STE100 dictionary](references/dictionary.md) and returns only the entries you ask for. Use it instead of reading the dictionary file, which is too large to load for a rewrite. `node <skill>/scripts/ste.mjs <command> --help` documents flags, output, and exit codes.

- `lookup <word>...` shows the entries for several words or quoted phrases in one call. `lookup --search <text>` finds approved words whose meaning contains the text; use it when you need an approved word for an idea.
- `scan --file -` reads a draft from stdin and reports long sentences and vocabulary findings, with line numbers. Add `--mode descriptive` when the text describes rather than instructs. Use a quoted heredoc so backticks and `$` in the draft reach the tool unchanged:

  ```bash
  node <skill>/scripts/ste.mjs scan --file - <<'EOF'
  <draft>
  EOF
  ```

Before you return the rewrite, scan the final draft and resolve every finding: change the word or sentence, or keep it because it is a technical name or technical verb, or because your usage matches the approved part of speech and meaning. The scan cannot tell which part of speech or meaning you intend, so its findings are advisory and the decision is yours.

Return only the rewritten text. If an ambiguity prevents an accurate rewrite, ask one focused question instead of guessing. Do not claim formal ASD-STE100 compliance unless the vocabulary and applicable rules were checked against the current standard.
