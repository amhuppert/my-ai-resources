#!/usr/bin/env bun

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Feature schemas and tools
import {
  CreateFeaturesInputSchema,
  DeleteFeatureInputSchema,
  GetFeatureInputSchema,
  ListFeaturesInputSchema,
  UpdateFeatureInputSchema,
} from "./schemas/features.js";
import {
  createFeatures,
  deleteFeature,
  getFeature,
  listFeatures,
  updateFeature,
} from "./tools/features.js";

// Path schemas and tools
import {
  CreatePathsInputSchema,
  DeletePathInputSchema,
  GetPathInputSchema,
  LinkPathsToFeatureInputSchema,
  ListPathsInputSchema,
  UnlinkPathFromFeatureInputSchema,
  UpdatePathInputSchema,
} from "./schemas/paths.js";
import {
  createPaths,
  deletePath,
  getPath,
  linkPathsToFeature,
  listPaths,
  unlinkPathFromFeature,
  updatePath,
} from "./tools/paths.js";

// Requirement schemas and tools
import {
  CreateRequirementsInputSchema,
  DeleteRequirementInputSchema,
  GetRequirementInputSchema,
  ListRequirementsInputSchema,
  UpdateRequirementInputSchema,
} from "./schemas/requirements.js";
import {
  createRequirements,
  deleteRequirement,
  getRequirement,
  listRequirements,
  updateRequirement,
} from "./tools/requirements.js";

// Objective schemas and tools
import {
  CreateObjectiveInputSchema,
  DeleteObjectiveInputSchema,
  GetObjectiveInputSchema,
  LinkObjectiveToFeaturesInputSchema,
  LinkObjectiveToTicketsInputSchema,
  ListObjectivesInputSchema,
  UnlinkObjectiveFromFeatureInputSchema,
  UnlinkObjectiveFromTicketInputSchema,
  UpdateObjectiveInputSchema,
} from "./schemas/objectives.js";
import {
  createObjective,
  deleteObjective,
  getObjective,
  linkObjectiveToFeatures,
  linkObjectiveToTickets,
  listObjectives,
  unlinkObjectiveFromFeature,
  unlinkObjectiveFromTicket,
  updateObjective,
} from "./tools/objectives.js";

// Task schemas and tools
import {
  CreateTasksInputSchema,
  DeleteTaskInputSchema,
  GetTaskInputSchema,
  ListTasksInputSchema,
  ReorderTasksInputSchema,
  UpdateTaskInputSchema,
} from "./schemas/tasks.js";
import {
  createTasks,
  deleteTask,
  getTask,
  listTasks,
  reorderTasks,
  updateTask,
} from "./tools/tasks.js";

// Ticket schemas and tools
import {
  CreateTicketsInputSchema,
  DeleteTicketInputSchema,
  GetTicketInputSchema,
  ListTicketsInputSchema,
  UpdateTicketInputSchema,
} from "./schemas/tickets.js";
import {
  createTickets,
  deleteTicket,
  getTicket,
  listTickets,
  updateTicket,
} from "./tools/tickets.js";

// Context schemas and tools
import {
  BuildContextInputSchema,
  FindRelevantPathsInputSchema,
  GetFeatureContextInputSchema,
  GetObjectiveContextInputSchema,
  buildContext,
  findRelevantPaths,
  getFeatureContext,
  getObjectiveContext,
} from "./tools/context.js";

const server = new McpServer({
  name: "memory-bank",
  version: "1.0.0",
});

// ============================================================================
// Feature Tools
// ============================================================================

server.registerTool(
  "create_features",
  {
    title: "Create Features",
    description:
      "Create one or more hierarchical features for organizing project knowledge",
    inputSchema: CreateFeaturesInputSchema.shape,
  },
  async (input) => {
    const result = createFeatures(CreateFeaturesInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_feature",
  {
    title: "Get Feature",
    description: "Get a feature by its slug",
    inputSchema: GetFeatureInputSchema.shape,
  },
  async (input) => {
    const result = getFeature(GetFeatureInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "list_features",
  {
    title: "List Features",
    description: "List all features, optionally filtered by parent slug prefix",
    inputSchema: ListFeaturesInputSchema.shape,
  },
  async (input) => {
    const result = listFeatures(ListFeaturesInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "update_feature",
  {
    title: "Update Feature",
    description: "Update a feature's name or description",
    inputSchema: UpdateFeatureInputSchema.shape,
  },
  async (input) => {
    const result = updateFeature(UpdateFeatureInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "delete_feature",
  {
    title: "Delete Feature",
    description: "Delete a feature (cascades to linked paths and requirements)",
    inputSchema: DeleteFeatureInputSchema.shape,
  },
  async (input) => {
    const result = deleteFeature(DeleteFeatureInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ============================================================================
// Path Tools
// ============================================================================

server.registerTool(
  "create_paths",
  {
    title: "Create Paths",
    description:
      "Create one or more file or directory paths with descriptions and use_when conditions",
    inputSchema: CreatePathsInputSchema.shape,
  },
  async (input) => {
    const result = createPaths(CreatePathsInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_path",
  {
    title: "Get Path",
    description: "Get a path by its ID or path string",
    inputSchema: GetPathInputSchema.shape,
  },
  async (input) => {
    const result = getPath(GetPathInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "list_paths",
  {
    title: "List Paths",
    description: "List all paths, optionally filtered by feature slug or type",
    inputSchema: ListPathsInputSchema.shape,
  },
  async (input) => {
    const result = listPaths(ListPathsInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "update_path",
  {
    title: "Update Path",
    description: "Update a path's description or use_when conditions",
    inputSchema: UpdatePathInputSchema.shape,
  },
  async (input) => {
    const result = updatePath(UpdatePathInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "delete_path",
  {
    title: "Delete Path",
    description: "Delete a path (cascades to feature links)",
    inputSchema: DeletePathInputSchema.shape,
  },
  async (input) => {
    const result = deletePath(DeletePathInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "link_paths_to_feature",
  {
    title: "Link Paths to Feature",
    description: "Link one or more paths to a feature",
    inputSchema: LinkPathsToFeatureInputSchema.shape,
  },
  async (input) => {
    const result = linkPathsToFeature(
      LinkPathsToFeatureInputSchema.parse(input),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "unlink_path_from_feature",
  {
    title: "Unlink Path from Feature",
    description: "Remove the link between a path and a feature",
    inputSchema: UnlinkPathFromFeatureInputSchema.shape,
  },
  async (input) => {
    const result = unlinkPathFromFeature(
      UnlinkPathFromFeatureInputSchema.parse(input),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ============================================================================
// Requirement Tools
// ============================================================================

server.registerTool(
  "create_requirements",
  {
    title: "Create Requirements",
    description: "Create one or more requirements for a feature",
    inputSchema: CreateRequirementsInputSchema.shape,
  },
  async (input) => {
    const result = createRequirements(
      CreateRequirementsInputSchema.parse(input),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_requirement",
  {
    title: "Get Requirement",
    description: "Get a requirement by its ID",
    inputSchema: GetRequirementInputSchema.shape,
  },
  async (input) => {
    const result = getRequirement(GetRequirementInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "list_requirements",
  {
    title: "List Requirements",
    description: "List all requirements for a feature",
    inputSchema: ListRequirementsInputSchema.shape,
  },
  async (input) => {
    const result = listRequirements(ListRequirementsInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "update_requirement",
  {
    title: "Update Requirement",
    description: "Update a requirement's text or notes",
    inputSchema: UpdateRequirementInputSchema.shape,
  },
  async (input) => {
    const result = updateRequirement(UpdateRequirementInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "delete_requirement",
  {
    title: "Delete Requirement",
    description: "Delete a requirement",
    inputSchema: DeleteRequirementInputSchema.shape,
  },
  async (input) => {
    const result = deleteRequirement(DeleteRequirementInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ============================================================================
// Objective Tools
// ============================================================================

server.registerTool(
  "create_objective",
  {
    title: "Create Objective",
    description: "Create a new objective with status tracking",
    inputSchema: CreateObjectiveInputSchema.shape,
  },
  async (input) => {
    const result = createObjective(CreateObjectiveInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_objective",
  {
    title: "Get Objective",
    description: "Get an objective by its slug",
    inputSchema: GetObjectiveInputSchema.shape,
  },
  async (input) => {
    const result = getObjective(GetObjectiveInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "list_objectives",
  {
    title: "List Objectives",
    description: "List all objectives, optionally filtered by status",
    inputSchema: ListObjectivesInputSchema.shape,
  },
  async (input) => {
    const result = listObjectives(ListObjectivesInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "update_objective",
  {
    title: "Update Objective",
    description:
      "Update an objective's name, description, status, or plan file path",
    inputSchema: UpdateObjectiveInputSchema.shape,
  },
  async (input) => {
    const result = updateObjective(UpdateObjectiveInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "delete_objective",
  {
    title: "Delete Objective",
    description: "Delete an objective (cascades to tasks and links)",
    inputSchema: DeleteObjectiveInputSchema.shape,
  },
  async (input) => {
    const result = deleteObjective(DeleteObjectiveInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "link_objective_to_features",
  {
    title: "Link Objective to Features",
    description: "Link an objective to one or more features",
    inputSchema: LinkObjectiveToFeaturesInputSchema.shape,
  },
  async (input) => {
    const result = linkObjectiveToFeatures(
      LinkObjectiveToFeaturesInputSchema.parse(input),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "unlink_objective_from_feature",
  {
    title: "Unlink Objective from Feature",
    description: "Remove the link between an objective and a feature",
    inputSchema: UnlinkObjectiveFromFeatureInputSchema.shape,
  },
  async (input) => {
    const result = unlinkObjectiveFromFeature(
      UnlinkObjectiveFromFeatureInputSchema.parse(input),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "link_objective_to_tickets",
  {
    title: "Link Objective to Tickets",
    description: "Link an objective to one or more external tickets",
    inputSchema: LinkObjectiveToTicketsInputSchema.shape,
  },
  async (input) => {
    const result = linkObjectiveToTickets(
      LinkObjectiveToTicketsInputSchema.parse(input),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "unlink_objective_from_ticket",
  {
    title: "Unlink Objective from Ticket",
    description: "Remove the link between an objective and a ticket",
    inputSchema: UnlinkObjectiveFromTicketInputSchema.shape,
  },
  async (input) => {
    const result = unlinkObjectiveFromTicket(
      UnlinkObjectiveFromTicketInputSchema.parse(input),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ============================================================================
// Task Tools
// ============================================================================

server.registerTool(
  "create_tasks",
  {
    title: "Create Tasks",
    description: "Create one or more tasks for an objective (auto-ordered)",
    inputSchema: CreateTasksInputSchema.shape,
  },
  async (input) => {
    const result = createTasks(CreateTasksInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_task",
  {
    title: "Get Task",
    description: "Get a task by its ID",
    inputSchema: GetTaskInputSchema.shape,
  },
  async (input) => {
    const result = getTask(GetTaskInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "list_tasks",
  {
    title: "List Tasks",
    description:
      "List all tasks for an objective, optionally filtered by status",
    inputSchema: ListTasksInputSchema.shape,
  },
  async (input) => {
    const result = listTasks(ListTasksInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "update_task",
  {
    title: "Update Task",
    description: "Update a task's text or status",
    inputSchema: UpdateTaskInputSchema.shape,
  },
  async (input) => {
    const result = updateTask(UpdateTaskInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "delete_task",
  {
    title: "Delete Task",
    description: "Delete a task",
    inputSchema: DeleteTaskInputSchema.shape,
  },
  async (input) => {
    const result = deleteTask(DeleteTaskInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "reorder_tasks",
  {
    title: "Reorder Tasks",
    description: "Set the order of tasks within an objective",
    inputSchema: ReorderTasksInputSchema.shape,
  },
  async (input) => {
    const result = reorderTasks(ReorderTasksInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ============================================================================
// Ticket Tools
// ============================================================================

server.registerTool(
  "create_tickets",
  {
    title: "Create Tickets",
    description: "Create one or more external ticket references (JIRA, etc.)",
    inputSchema: CreateTicketsInputSchema.shape,
  },
  async (input) => {
    const result = createTickets(CreateTicketsInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_ticket",
  {
    title: "Get Ticket",
    description: "Get a ticket by its key",
    inputSchema: GetTicketInputSchema.shape,
  },
  async (input) => {
    const result = getTicket(GetTicketInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "list_tickets",
  {
    title: "List Tickets",
    description: "List all tickets",
    inputSchema: ListTicketsInputSchema.shape,
  },
  async (input) => {
    const result = listTickets(ListTicketsInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "update_ticket",
  {
    title: "Update Ticket",
    description: "Update a ticket's title or description",
    inputSchema: UpdateTicketInputSchema.shape,
  },
  async (input) => {
    const result = updateTicket(UpdateTicketInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "delete_ticket",
  {
    title: "Delete Ticket",
    description: "Delete a ticket (cascades to objective links)",
    inputSchema: DeleteTicketInputSchema.shape,
  },
  async (input) => {
    const result = deleteTicket(DeleteTicketInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ============================================================================
// Context Tools
// ============================================================================

server.registerTool(
  "get_feature_context",
  {
    title: "Get Feature Context",
    description: "Get a feature with all its linked paths and requirements",
    inputSchema: GetFeatureContextInputSchema.shape,
  },
  async (input) => {
    const result = getFeatureContext(GetFeatureContextInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "get_objective_context",
  {
    title: "Get Objective Context",
    description:
      "Get an objective with all its tasks, linked features, and tickets",
    inputSchema: GetObjectiveContextInputSchema.shape,
  },
  async (input) => {
    const result = getObjectiveContext(
      GetObjectiveContextInputSchema.parse(input),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "find_relevant_paths",
  {
    title: "Find Relevant Paths",
    description:
      "Search paths by matching query against description and use_when conditions",
    inputSchema: FindRelevantPathsInputSchema.shape,
  },
  async (input) => {
    const result = findRelevantPaths(FindRelevantPathsInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  "build_context",
  {
    title: "Build Context",
    description:
      "Build comprehensive markdown context for an objective and/or features",
    inputSchema: BuildContextInputSchema.shape,
  },
  async (input) => {
    const result = buildContext(BuildContextInputSchema.parse(input));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ============================================================================
// Server Startup
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Memory Bank MCP Server running on stdio");
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error("Server startup error:", error);
    process.exit(1);
  });
}
