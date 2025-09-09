# Current Focus

Implement a new MCP server (Model Context Protocol) that can be used by AI agents.

## Tools

Initial tools: for configuring keyboard shortcuts in Cursor IDE.

### Evaluate Best Options

- Input:
  - frequency that the shortcut will be used (more frequent commands will get more convenient shortcuts)
  - task: the VS Code / Cursor command

The command will gather information about the user's operating system and the currently configured keyboard shortcuts. Research best way to do this.

Then it will call the OpenAI Responses API to get the recommendations. (Prompt ID: pmpt_68c0898bb23081978687ee5fdf5f690d06a197956797278f)

Call the Responses API with these variables:

- frequency - how often the task will be used
- task_description - the VS Code / Cursor command
- operating_system - the user's operating system
- existing_shortcuts - the user's currently configured keyboard shortcuts

Example API call:

```js
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.responses.create({
  prompt: {
    id: "pmpt_68c0898bb23081978687ee5fdf5f690d06a197956797278f",
    version: "7",
    variables: {
      task_description: "example task_description",
      frequency: "example frequency",
      operating_system: "example operating_system",
      existing_shortcuts: "example existing_shortcuts",
    },
  },
});
```

#### Response Format (JSON Schema)

```json
{
  "name": "shortcut_recommendations",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "when": {
        "type": "string",
        "description": "VS Code / Cursor 'when' clause expression that determines when a keyboard shortcut is active."
      },
      "recommendations": {
        "type": "array",
        "description": "List of optimal shortcut suggestions with their details and conflicts.",
        "items": {
          "type": "object",
          "properties": {
            "keystroke": {
              "type": "string",
              "description": "The keystroke sequence for the shortcut (e.g., Ctrl+S)."
            },
            "mnemonic": {
              "type": "string",
              "description": "A brief mnemonic for remembering or describing the shortcut."
            },
            "justification": {
              "type": "string",
              "description": "Explanation of why this shortcut is optimal."
            },
            "conflicts": {
              "type": "array",
              "description": "List of conflicting shortcut options.",
              "items": {
                "type": "object",
                "properties": {
                  "keystroke": {
                    "type": "string",
                    "description": "The conflicting keystroke sequence."
                  },
                  "mnemonic": {
                    "type": "string",
                    "description": "Mnemonic or description for the conflicting shortcut."
                  }
                },
                "required": ["keystroke", "mnemonic"],
                "additionalProperties": false
              }
            }
          },
          "required": ["keystroke", "mnemonic", "justification", "conflicts"],
          "additionalProperties": false
        }
      },
      "errors": {
        "type": "array",
        "description": "Messages indicating ambiguous or missing input (empty if none).",
        "items": {
          "type": "string"
        }
      }
    },
    "required": ["when", "recommendations", "errors"],
    "additionalProperties": false
  }
}
```

### Update Cursor Settings with Selected Shortcut

Once user selects a shortcut from the recommendations, this command will update the Cursor settings with the selected shortcut.

Need to update ~/.config/Cursor/User/keybindings.json

## Tech Stack

- Write the server in TypeScript. It should be executable by `bun`.
- Use existing libraries (must research) to avoid reinventing the wheel.
