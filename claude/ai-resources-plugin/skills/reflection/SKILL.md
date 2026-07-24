---
name: reflection
description: "Reflect on the conversation and propose improvements to durable AI-agent instruction files such as CLAUDE.md and AGENTS.md."
disable-model-invocation: true
---

# Agent Instructions Optimizer

Analyze and improve the durable instructions for the active AI coding client. Follow these steps carefully:

1. Analysis Phase:
   Review the chat history in your context window.

Then locate and read the instruction files that exist for the active client:

- User-level instructions such as `~/.claude/CLAUDE.md` or `~/.codex/AGENTS.override.md`
- Project-level `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, or `AGENTS.override.md`
- Any closer nested instruction files relevant to the files discussed in the conversation

Analyze the chat history and instructions to identify areas that could be improved. Look for:

- Inconsistencies in the agent's responses
- Misunderstandings of user requests
- Areas where Claude could provide more detailed or accurate information
- Opportunities to enhance the agent's ability to handle specific types of queries or tasks

2. Interaction Phase:
   Present your findings and improvement ideas to the human. For each suggestion:
   a) Explain the current issue you've identified
   b) Propose a specific change or addition to the instructions
   c) Describe how this change would improve Claude's performance

Wait for feedback from the human on each suggestion before proceeding. If the human approves a change, move it to the implementation phase. If not, refine your suggestion or move on to the next idea.

3. Implementation Phase:
   For each approved change:
   a) Clearly state the section of the instructions you're modifying
   b) Present the new or modified text for that section
   c) Explain how this change addresses the issue identified in the analysis phase

4. Output Format:
   Present your final output in the following structure:

<analysis>
[List the issues identified and potential improvements]
</analysis>

<improvements>
[For each approved improvement:
1. Section being modified
2. New or modified instruction text
3. Explanation of how this addresses the identified issue]
</improvements>

<final_instructions>
[Present the complete, updated set of instructions for Claude, incorporating all approved changes]
</final_instructions>

Remember, your goal is to enhance the agent's performance and consistency while maintaining the core functionality and purpose of the AI assistant. Be thorough in your analysis, clear in your explanations, and precise in your implementations.
