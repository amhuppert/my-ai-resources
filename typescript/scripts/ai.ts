#!/usr/bin/env bun

import { Command } from "commander";
import { join } from "path";
import { main as installUser } from "@/scripts/install-user.js";
import { main as installProject } from "@/scripts/install-project.js";
import {
  createDefaultConfig,
  createDefaultExecutor,
} from "@/lib/install-types.js";
import { initSkill, validateSkill } from "@/lib/skill-operations.js";
import { runReplaceImportCodemod } from "@/lib/codemods/replace-import.js";
import {
  auditConfiguration,
  formatAuditReport,
} from "@/lib/config-audit-operations.js";
import { findCursorRules } from "@/lib/cursor-rules-sync.js";

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

const codemods = program.command("codemods").description("Codemod utilities");

codemods
  .command("replace-import")
  .description("Replace module specifiers across the project")
  .requiredOption("--from <specifier>", "Module specifier to replace")
  .requiredOption("--to <specifier>", "Replacement module specifier")
  .option(
    "--tsconfig <path>",
    "Path to tsconfig file (default: tsconfig.json)",
    "tsconfig.json",
  )
  .option("--dry-run", "Preview changes without writing files")
  .option("--include-js", "Include JavaScript/JSX source files")
  .action(async (options) => {
    try {
      const result = await runReplaceImportCodemod({
        from: options.from,
        to: options.to,
        tsconfigPath: options.tsconfig,
        dryRun: Boolean(options.dryRun),
        includeJs: Boolean(options.includeJs),
      });

      if (result.specifiersUpdated === 0) {
        console.log("No matching imports found.");
        process.exit(0);
      }

      for (const change of result.changes) {
        console.log(`${change.filePath} (${change.occurrences})`);
        for (const preview of change.previews.slice(0, 3)) {
          console.log(
            `  line ${preview.line}: ${preview.original} → ${preview.updated}`,
          );
        }
        if (change.previews.length > 3) {
          console.log(
            `  …and ${change.previews.length - 3} more occurrence(s)`,
          );
        }
      }

      console.log();
      if (result.dryRun) {
        console.log(
          `Dry run complete: ${result.specifiersUpdated} specifier(s) would be updated across ${result.filesChanged} file(s).`,
        );
      } else {
        console.log(
          `Updated ${result.specifiersUpdated} specifier(s) across ${result.filesChanged} file(s).`,
        );
      }

      process.exit(0);
    } catch (error) {
      console.error(
        `Error running replace-import codemod: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      process.exit(1);
    }
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
        `Error initializing skill: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
        `Error validating skill: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      process.exit(1);
    }
  });

const configAuditSkill = skill
  .command("config-audit")
  .description("Configuration audit helper commands");

configAuditSkill
  .command("run")
  .description("Audit Claude Code and Cursor configurations")
  .option(
    "-p, --project-root <path>",
    "project root directory (default: current directory)",
    ".",
  )
  .option("--json", "output as JSON instead of formatted text")
  .action(async (options) => {
    try {
      const report = auditConfiguration(options.projectRoot);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatAuditReport(report));
      }

      process.exit(0);
    } catch (error) {
      console.error(
        `Error running config audit: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      process.exit(1);
    }
  });

const cursorRulesSkill = skill
  .command("cursor-rules-synchronizer")
  .description("Cursor Rules synchronization helper commands");

cursorRulesSkill
  .command("list")
  .description("List all Cursor Rules in the project")
  .option(
    "-p, --project-root <path>",
    "project root directory (default: current directory)",
    ".",
  )
  .action(async (options) => {
    try {
      const projectRoot = options.projectRoot;
      const rulePaths = await findCursorRules(projectRoot);

      if (rulePaths.length === 0) {
        console.log("No Cursor Rules found");
        process.exit(0);
      }

      // Output paths one per line
      for (const path of rulePaths) {
        console.log(path);
      }

      process.exit(0);
    } catch (error) {
      console.error(
        `Error listing Cursor Rules: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      process.exit(1);
    }
  });

program.parse();
