---
name: audit-agent-instructions
description: Audit all agent instructions against the latest context-engineering best practices
---

Review the instructions or context files for agents specified by the user. If the user doesn't specify any specifics, ask if they want to audit all agent instructions in the project, as well as instructions and skills installed at the user level.

In scope for review:
- CLAUDE.md files
- AGENTS.md files
- AGENTS.override.md files
- Agent skills in the `.claude` or `.agents` directory, at the project or user level
- Any other instructions, context, documentation, or steering files intended for AI agent consumption

Research the prompting and context engineering best practices for the latest generation of models using the resources provided. We are targeting Anthropic's Opus 5 and Fable 5 models, and OpenAI's GPT-5.6 Sol model. Instructions should be written to work reasonably well for each of those models.

In any relevant agent files, identify opportunities for improvement. This includes:

- Gaps
- Ambiguities
- Contradictions
- Useless content
- Redundant content
- Anything written in a way that deviates from best practices for the targeted models

Keep the instructions as lean as possible and make good use of progressive disclosure. Avoid excessive instructions in a way that would be detrimental to the performance of the latest generation of models. Rely on your research to determine precisely what kind of instructions are likely to be detrimental and what kind of instructions are likely to be helpful.

Output:
- Well-organized, scannable report
- List your findings and recommended changes with justifications for each

# Resources

- [The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) – July 24, 2026
  - "How to apply the lessons we (Anthropic) learned to your own context engineering in Claude Code and with your own agents."
- [A field guide tot Claude Fable 5: Finding your unknowns](https://claude.com/blog/a-field-guide-to-claude-fable-finding-your-unknowns) – July 6, 2026
- [OpenAI Model guidance](https://developers.openai.com/api/docs/guides/latest-model) – See guidance for GPT-5.6 Sol, particularly the "Prompting best practices" section
