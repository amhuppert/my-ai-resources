import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "path";
import { tmpdir } from "os";
import { runReplaceImportCodemod } from "./replace-import";

function writeJsonFile(filePath: string, data: unknown) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

describe("runReplaceImportCodemod", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(path.join(tmpdir(), "replace-import-codemod-"));
    mkdirSync(path.join(projectDir, "src"), { recursive: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function createZodStub(root: string) {
    const zodDir = path.join(root, "node_modules", "zod");
    mkdirSync(zodDir, { recursive: true });
    writeJsonFile(path.join(zodDir, "package.json"), {
      name: "zod",
      version: "1.0.0",
      types: "index.d.ts",
    });
    writeFileSync(
      path.join(zodDir, "index.d.ts"),
      "export const z: unique symbol;\n",
      "utf-8"
    );
  }

  test("replaces package specifier with relative paths per importer", async () => {
    writeJsonFile(path.join(projectDir, "tsconfig.json"), {
      compilerOptions: {
        baseUrl: ".",
        moduleResolution: "bundler",
        target: "ESNext",
      },
      include: ["src/**/*"],
    });

    createZodStub(projectDir);

    const utilsDir = path.join(projectDir, "src/utils");
    const featureDir = path.join(projectDir, "src/features");
    const deepDir = path.join(featureDir, "deep");
    mkdirSync(utilsDir, { recursive: true });
    mkdirSync(deepDir, { recursive: true });

    writeFileSync(
      path.join(utilsDir, "custom-zod.ts"),
      "export const custom = true;\n",
      "utf-8"
    );

    const featureFile = path.join(featureDir, "feature.ts");
    const deepFile = path.join(deepDir, "feature-deep.ts");

    writeFileSync(featureFile, 'import { z } from "zod";\n', "utf-8");
    writeFileSync(deepFile, 'import { z } from "zod";\n', "utf-8");

    const result = await runReplaceImportCodemod({
      cwd: projectDir,
      from: "zod",
      to: "./src/utils/custom-zod",
    });

    expect(result.specifiersUpdated).toBe(2);
    expect(readFileSync(featureFile, "utf-8")).toContain(
      'import { z } from "../utils/custom-zod";'
    );
    expect(readFileSync(deepFile, "utf-8")).toContain(
      'import { z } from "../../utils/custom-zod";'
    );
  });

  test("replaces path-identified module across alias and relative imports", async () => {
    writeJsonFile(path.join(projectDir, "tsconfig.json"), {
      compilerOptions: {
        baseUrl: ".",
        moduleResolution: "bundler",
        target: "ESNext",
        paths: {
          "@/*": ["src/*"],
        },
      },
      include: ["src/**/*"],
    });

    createZodStub(projectDir);

    const sharedDir = path.join(projectDir, "src/shared");
    mkdirSync(sharedDir, { recursive: true });

    writeFileSync(
      path.join(sharedDir, "module.ts"),
      "export const shared = 1;\n",
      "utf-8"
    );

    const featureFile = path.join(projectDir, "src/feature.ts");
    writeFileSync(
      featureFile,
      [
        'import aliasValue from "@/shared/module";',
        'import relativeValue from "./shared/module";',
      ].join("\n") + "\n",
      "utf-8"
    );

    const result = await runReplaceImportCodemod({
      cwd: projectDir,
      from: "./src/shared/module",
      to: "zod",
    });

    expect(result.specifiersUpdated).toBe(2);
    const content = readFileSync(featureFile, "utf-8");
    expect((content.match(/from "zod"/g) ?? []).length).toBe(2);
    expect(content).not.toContain('@/shared/module"');
    expect(content).not.toContain('./shared/module"');
  });

  test("alias input only updates matching alias imports", async () => {
    writeJsonFile(path.join(projectDir, "tsconfig.json"), {
      compilerOptions: {
        baseUrl: ".",
        moduleResolution: "bundler",
        target: "ESNext",
        paths: {
          "@/*": ["src/*"],
        },
      },
      include: ["src/**/*"],
    });

    const sharedDir = path.join(projectDir, "src/shared");
    mkdirSync(sharedDir, { recursive: true });

    writeFileSync(
      path.join(sharedDir, "module.ts"),
      "export const current = true;\n",
      "utf-8"
    );
    writeFileSync(
      path.join(sharedDir, "module-v2.ts"),
      "export const next = true;\n",
      "utf-8"
    );

    const featureFile = path.join(projectDir, "src/feature.ts");
    writeFileSync(
      featureFile,
      [
        'import aliasValue from "@/shared/module";',
        'import relativeValue from "./shared/module";',
      ].join("\n") + "\n",
      "utf-8"
    );

    const result = await runReplaceImportCodemod({
      cwd: projectDir,
      from: "@/shared/module",
      to: "@/shared/module-v2",
    });

    expect(result.specifiersUpdated).toBe(1);
    const content = readFileSync(featureFile, "utf-8");
    expect(content).toContain('from "@/shared/module-v2";');
    expect(content).toContain('from "./shared/module";');
  });

  test("absolute path specifier identifies exact module", async () => {
    writeJsonFile(path.join(projectDir, "tsconfig.json"), {
      compilerOptions: {
        baseUrl: ".",
        moduleResolution: "bundler",
        target: "ESNext",
      },
      include: ["src/**/*"],
    });

    createZodStub(projectDir);

    const sharedDir = path.join(projectDir, "src/shared");
    mkdirSync(sharedDir, { recursive: true });

    const absoluteTarget = path.join(sharedDir, "module.ts");

    writeFileSync(absoluteTarget, "export const share = 1;\n", "utf-8");

    const consumerFile = path.join(projectDir, "src/consumer.ts");
    writeFileSync(
      consumerFile,
      'import shared from "./shared/module";\n',
      "utf-8"
    );

    await runReplaceImportCodemod({
      cwd: projectDir,
      from: absoluteTarget,
      to: "zod",
    });

    expect(readFileSync(consumerFile, "utf-8")).toContain(
      'import shared from "zod";'
    );
  });

  test("dry run previews updated relative specifiers without applying", async () => {
    writeJsonFile(path.join(projectDir, "tsconfig.json"), {
      compilerOptions: {
        baseUrl: ".",
        moduleResolution: "bundler",
        target: "ESNext",
      },
      include: ["src/**/*"],
    });

    createZodStub(projectDir);

    const utilsDir = path.join(projectDir, "src/utils");
    mkdirSync(utilsDir, { recursive: true });

    const targetFile = path.join(utilsDir, "custom-zod.ts");
    writeFileSync(targetFile, "export const custom = true;\n", "utf-8");

    const importerFile = path.join(projectDir, "src/importer.ts");
    writeFileSync(importerFile, 'export * from "zod";\n', "utf-8");

    const originalContent = readFileSync(importerFile, "utf-8");

    const result = await runReplaceImportCodemod({
      cwd: projectDir,
      from: "zod",
      to: "./src/utils/custom-zod.ts",
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.specifiersUpdated).toBe(1);
    expect(readFileSync(importerFile, "utf-8")).toBe(originalContent);
    expect(result.changes[0]?.previews[0]?.updated).toBe(
      '"./utils/custom-zod.ts"'
    );
  });
});
