#!/usr/bin/env bun

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  RecommendShortcutsInputSchema,
  UpdateShortcutInputSchema,
} from "./utils/validation.js";
import { getOperatingSystemName } from "./lib/keybindings.js";
import { readKeybindings, updateKeybindingsSafely } from "./lib/file-ops.js";
import { getShortcutRecommendations } from "./lib/openai.js";
import {
  KeybindingsError,
  FileOperationError,
  OpenAIError,
} from "./lib/types.js";

const server = new McpServer({
  name: "cursor-keyboard-shortcuts",
  version: "1.0.0",
});

server.registerTool(
  "recommend-shortcuts",
  {
    title: "Recommend Keyboard Shortcuts",
    description:
      "Get AI-powered keyboard shortcut recommendations for VS Code/Cursor commands",
    inputSchema: RecommendShortcutsInputSchema.shape,
  },
  async ({ frequency, task_description }) => {
    try {
      const input = RecommendShortcutsInputSchema.parse({
        frequency,
        task_description,
      });

      const operating_system = getOperatingSystemName();
      const existing_shortcuts = JSON.stringify(await readKeybindings());

      const recommendations = await getShortcutRecommendations({
        frequency: input.frequency,
        task_description: input.task_description,
        operating_system,
        existing_shortcuts,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(recommendations, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (error instanceof OpenAIError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "OpenAI API Error",
                  message: errorMessage,
                  type: "openai_error",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      if (error instanceof FileOperationError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "File Operation Error",
                  message: errorMessage,
                  type: "file_error",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      if (error instanceof KeybindingsError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Keybindings Error",
                  message: errorMessage,
                  type: "keybindings_error",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "Unexpected Error",
                message: errorMessage,
                type: "unknown_error",
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "update-shortcut",
  {
    title: "Update Keyboard Shortcut",
    description: "Add or update a keyboard shortcut in Cursor settings",
    inputSchema: UpdateShortcutInputSchema.shape,
  },
  async ({ keystroke, command, when }) => {
    try {
      const input = UpdateShortcutInputSchema.parse({
        keystroke,
        command,
        when,
      });

      const newEntry = {
        key: input.keystroke,
        command: input.command,
        ...(input.when && { when: input.when }),
      };

      const conflicts = await updateKeybindingsSafely([newEntry]);

      const result = {
        success: true,
        message: `Added shortcut: ${input.keystroke} -> ${input.command}`,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (error instanceof FileOperationError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "File Operation Error",
                  message: errorMessage,
                  type: "file_error",
                  success: false,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      if (error instanceof KeybindingsError) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Keybindings Error",
                  message: errorMessage,
                  type: "keybindings_error",
                  success: false,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "Unexpected Error",
                message: errorMessage,
                type: "unknown_error",
                success: false,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Cursor Keyboard Shortcuts MCP Server running on stdio");
}

// Check if this is the main module
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error("Server startup error:", error);
    process.exit(1);
  });
}
