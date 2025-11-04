#!/usr/bin/env bun

import { Command } from "commander";
import { main as installUser } from "@/scripts/install-user.js";
import { main as installProject } from "@/scripts/install-project.js";
import {
  createDefaultConfig,
  createDefaultExecutor,
} from "@/lib/install-types.js";
import { initSkill, validateSkill } from "@/lib/skill-operations.js";

const program = new Command();

program
  .name("ai")
  .description("AI workflow resources CLI tool")
  .version("1.0.0");

program
  .command("install")
  .description("Install AI workflow resources")
  .option(
    "-s, --scope <type>",
    "installation scope: user (home directory) or project (current directory)",
    "project",
  )
  .action(async (options) => {
    const scope = options.scope.toLowerCase();
    const config = createDefaultConfig();
    const executor = createDefaultExecutor();

    if (scope === "user") {
      try {
        await installUser(config, executor);
      } catch (error) {
        console.error("Error during user-level installation:", error);
        process.exit(1);
      }
    } else if (scope === "project") {
      try {
        await installProject(config, executor);
      } catch (error) {
        console.error("Error during project-level installation:", error);
        process.exit(1);
      }
    } else {
      console.error(
        `Invalid scope: ${scope}. Must be either 'user' or 'project'.`,
      );
      process.exit(1);
    }
  });

program
  .command("init-document-map")
  .description("Generate document map command instructions")
  .option(
    "-d, --directory <path>",
    "target directory to map (default: current directory)",
    ".",
  )
  .option(
    "-i, --instructions <text>",
    "custom instructions for identifying notable files",
  )
  .action(async (options) => {
    // Import dynamically to avoid loading template engine unless needed
    const { Eta } = await import("eta");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const { readFile } = await import("../src/utils/read-file.js");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const eta = new Eta({ autoEscape: false });

    const templatePath = path.join(
      __dirname,
      "../templates/init-document-map.eta",
    );

    // Path to plugin resources (bundled with plugin distribution)
    const pluginResourcesPath = path.join(
      __dirname,
      "../../claude/plugin/resources",
    );
    const documentMapFormatPath = path.join(
      pluginResourcesPath,
      "document-map-format.md",
    );
    const documentMapTemplatePath = path.join(
      pluginResourcesPath,
      "document-map-template.md",
    );

    // Read plugin resource files using the readFile utility
    const documentMapFormat = readFile(documentMapFormatPath, {
      description: "Description of document map format",
    });
    const documentMapTemplate = readFile(documentMapTemplatePath, {
      description: "Document map template to follow",
    });

    const targetPath = options.directory;
    const isCurrentDir = targetPath === ".";
    const outputPath = isCurrentDir
      ? "./document-map.md"
      : `${targetPath}/document-map.md`;

    const targetDesc = isCurrentDir
      ? "the current directory"
      : `the \`${targetPath}\` directory`;

    const documentTitle = isCurrentDir
      ? "Document Map"
      : `${targetPath} — Document Map`;

    const templateContent = await Bun.file(templatePath).text();
    const rendered = eta.renderString(templateContent, {
      targetPath,
      targetDesc,
      outputPath,
      documentTitle,
      customInstructions: options.instructions || null,
      depth: 1,
      documentMapFormat,
      documentMapTemplate,
    });

    console.log(rendered);
  });

const skill = program.command("skill").description("Skill management commands");

const createSkill = skill
  .command("create-skill")
  .description("Skill creator helper commands");

createSkill
  .command("init <skill-name>")
  .description("Initialize a new skill")
  .option("-s, --scope <type>", "project or user (default: project)", "project")
  .action(async (skillName: string, options) => {
    const scope = options.scope.toLowerCase();

    if (scope !== "project" && scope !== "user") {
      console.error(
        `Invalid scope: ${scope}. Must be either 'project' or 'user'.`,
      );
      process.exit(1);
    }

    const config = createDefaultConfig();

    try {
      await initSkill(skillName, scope as "project" | "user", config);
      process.exit(0);
    } catch (error) {
      console.error(
        `Error initializing skill: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

createSkill
  .command("validate <skill-path>")
  .description("Validate a skill structure")
  .action(async (skillPath: string) => {
    try {
      const result = await validateSkill(skillPath);

      if (result.valid) {
        console.log(`✅ ${result.message}`);
        process.exit(0);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(
        `Error validating skill: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

program.parse();
