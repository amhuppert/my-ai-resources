#!/usr/bin/env bun

import { Command } from "commander";
import { main as installUser } from "@/scripts/install-user.js";
import { main as installProject } from "@/scripts/install-project.js";

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

    if (scope === "user") {
      try {
        await installUser();
      } catch (error) {
        console.error("Error during user-level installation:", error);
        process.exit(1);
      }
    } else if (scope === "project") {
      try {
        await installProject();
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

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const eta = new Eta({ autoEscape: false });

    const templatePath = path.join(
      __dirname,
      "../templates/init-document-map.eta",
    );

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
    });

    console.log(rendered);
  });

program.parse();
