#!/usr/bin/env bun
import { Command } from "commander";

const program = new Command();

program
  .name("test-slash-args")
  .description("Test script to verify argument passing from slash commands")
  .argument("[args...]", "test arguments")
  .action((args: string[]) => {
    console.log("=== Slash Command Argument Test ===");
    console.log(`Number of arguments: ${args.length}`);
    console.log(`All arguments: ${JSON.stringify(args)}`);

    args.forEach((arg, index) => {
      console.log(`  Arg ${index + 1}: "${arg}"`);
    });

    console.log("\nRaw process.argv:");
    console.log(`  ${JSON.stringify(process.argv)}`);
  });

program.parse();
