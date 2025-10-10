# Current Focus

Create a TypeScript helper for implementing Claude Code custom slash commands.

Custom Slash command documentation: https://docs.claude.com/en/docs/claude-code/slash-commands

## Usage:

To implement a custom slash command, the command file will invoke a script written in TypeScript with the command logic:

!`some-typescript-script $ARGUMENTS`

- Need to verify that the above syntax is correct and will correctly make the arguments passed to the slash command accessible to the typescript script.

The typescript script be implemented using a utility we will create that parses the arguments in the same way a bash script would.
