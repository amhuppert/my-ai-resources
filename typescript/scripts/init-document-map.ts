#!/usr/bin/env bun
import { Command } from "commander";
import { Eta } from "eta";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eta = new Eta({ autoEscape: false });
const program = new Command();

program
  .name("init-document-map")
  .description("Generate document map command instructions based on arguments")
  .option(
    "-d, --directory <path>",
    "target directory to map (default: current directory)",
    "."
  )
  .option(
    "-i, --instructions <text>",
    "custom instructions for identifying notable files"
  )
  .action(async (options) => {
    const templatePath = path.join(
      __dirname,
      "../templates/init-document-map.eta"
    );

    // Determine target path and output location
    const targetPath = options.directory;
    const isCurrentDir = targetPath === ".";
    const outputPath = isCurrentDir
      ? "./document-map.md"
      : `${targetPath}/document-map.md`;

    // Create description for the target
    const targetDesc = isCurrentDir
      ? "the current directory"
      : `the \`${targetPath}\` directory`;

    // Create document title
    const documentTitle = isCurrentDir
      ? "Document Map"
      : `${targetPath} — Document Map`;

    // Read and render the template
    const templateContent = await Bun.file(templatePath).text();
    const rendered = eta.renderString(templateContent, {
      targetPath,
      targetDesc,
      outputPath,
      documentTitle,
      customInstructions: options.instructions || null,
      depth: 1, // default depth for code-tree
    });

    // Output the rendered command instructions
    console.log(rendered);
  });

program.parse();
