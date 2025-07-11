#!/usr/bin/env bun
import { jsonToZod } from "json-to-zod";
import zodToJsonSchema from "zod-to-json-schema";
import * as prettier from "prettier";
import * as z from "zod";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    process.stdin.on("readable", () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        chunks.push(chunk);
      }
    });

    process.stdin.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    process.stdin.on("error", (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    // Read JSON data from stdin
    const input = await readStdin();

    if (!input.trim()) {
      console.error("Error: No input provided via stdin");
      process.exit(1);
    }

    // Parse JSON
    let jsonData;
    try {
      jsonData = JSON.parse(input);
    } catch (error) {
      console.error("Error: Invalid JSON input");
      console.error(
        error instanceof Error ? error.message : "Unknown JSON parsing error",
      );
      process.exit(1);
    }

    // Convert JSON to Zod schema string
    const zodSchemaString = jsonToZod(jsonData);

    // Create a function to safely evaluate the Zod schema string
    // The json-to-zod library generates a complete variable declaration
    // We need to extract the schema part and make zod available in the evaluation context
    const zodSchemaFunction = new Function(
      "z",
      `${zodSchemaString}; return schema;`,
    );
    const zodSchema = zodSchemaFunction(z);

    // Convert Zod schema to JSON Schema
    const jsonSchema = zodToJsonSchema(zodSchema);

    // Format the JSON schema with Prettier
    const formattedJsonSchema = await prettier.format(
      JSON.stringify(jsonSchema, null, 2),
      {
        parser: "json",
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: false,
        quoteProps: "as-needed",
        trailingComma: "none",
      },
    );

    // Output to stdout
    console.log(formattedJsonSchema);
  } catch (error) {
    console.error("Error processing JSON to Zod to JSON Schema conversion:");
    console.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
