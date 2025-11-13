import { readFile, writeFile } from "fs/promises";
import path from "path";
import * as ts from "typescript";

export interface ReplaceImportCodemodOptions {
  /**
   * Module specifier to replace.
   */
  from: string;
  /**
   * Replacement module specifier.
   */
  to: string;
  /**
   * Override current working directory (defaults to process.cwd()).
   */
  cwd?: string;
  /**
   * Path to tsconfig file (relative to cwd). Defaults to "./tsconfig.json".
   */
  tsconfigPath?: string;
  /**
   * Include JavaScript/JSX files when true. Defaults to false.
   */
  includeJs?: boolean;
  /**
   * When true, do not write changes – only report them.
   */
  dryRun?: boolean;
}

export interface ReplaceImportChangeDetail {
  filePath: string;
  occurrences: number;
  previews: Array<{
    original: string;
    updated: string;
    line: number;
  }>;
}

export interface ReplaceImportCodemodResult {
  filesVisited: number;
  filesChanged: number;
  specifiersUpdated: number;
  dryRun: boolean;
  changes: ReplaceImportChangeDetail[];
}

const TS_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".d.ts",
  ".d.mts",
  ".d.cts",
]);

const JS_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs"]);

const KNOWN_EXTENSION_ENTRIES = [
  ".d.ts",
  ".d.mts",
  ".d.cts",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
]
  .map((ext) => ({ ext, lower: ext.toLowerCase() }))
  .sort((a, b) => b.ext.length - a.ext.length);

type AliasSpecifierDescriptor = {
  type: "alias";
  text: string;
};

type BareSpecifierDescriptor = {
  type: "bare";
  text: string;
};

type PathSpecifierDescriptor = {
  type: "path";
  text: string;
  resolvedPath: string;
  resolvedFilePath: string;
  hasExplicitExtension: boolean;
  preserveIndex: boolean;
};

type SpecifierDescriptor =
  | AliasSpecifierDescriptor
  | BareSpecifierDescriptor
  | PathSpecifierDescriptor;

function createDiagnosticsFormatter(cwd: string) {
  const formatHost: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: () => cwd,
    getCanonicalFileName: (fileName) =>
      ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
    getNewLine: () => ts.sys.newLine,
  };

  return (diagnostics: readonly ts.Diagnostic[]) =>
    ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost);
}

function normalizeFileName(fileName: string): string {
  const absolute = path.resolve(fileName);
  let resolved = absolute;

  if (typeof ts.sys.realpath === "function") {
    try {
      resolved = ts.sys.realpath(absolute);
    } catch {
      resolved = absolute;
    }
  }

  return ts.sys.useCaseSensitiveFileNames ? resolved : resolved.toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

function hasKnownExtension(specifier: string): boolean {
  const lower = specifier.toLowerCase();
  return KNOWN_EXTENSION_ENTRIES.some((entry) => lower.endsWith(entry.lower));
}

function stripKnownExtension(specifier: string): string {
  const lower = specifier.toLowerCase();
  for (const entry of KNOWN_EXTENSION_ENTRIES) {
    if (lower.endsWith(entry.lower)) {
      return specifier.slice(0, specifier.length - entry.ext.length);
    }
  }
  return specifier;
}

function stripTrailingIndex(specifier: string): string {
  if (specifier.endsWith("/index")) {
    return specifier.slice(0, specifier.length - "/index".length);
  }
  return specifier;
}

function ensureRelativePrefix(specifier: string): string {
  if (specifier.startsWith(".")) {
    return specifier;
  }
  return `./${specifier}`;
}

function isRelativeSpecifier(spec: string): boolean {
  return spec.startsWith("./") || spec.startsWith("../");
}

function isTrivialRelativeSpecifier(spec: string): boolean {
  return (
    spec === "" ||
    spec === "." ||
    spec === "./" ||
    spec === ".." ||
    spec === "../"
  );
}

function createAliasMatcher(
  paths: Record<string, readonly string[]> | undefined
): (specifier: string) => boolean {
  if (!paths) {
    return () => false;
  }

  const patterns = Object.keys(paths);
  if (patterns.length === 0) {
    return () => false;
  }

  const matchers = patterns.map((pattern) => {
    const escaped = escapeRegExp(pattern);
    const regex = new RegExp(`^${escaped.replace(/\\\*/g, "(.+)")}$`);
    return (specifier: string) => regex.test(specifier);
  });

  return (specifier: string) => matchers.some((matcher) => matcher(specifier));
}

function resolvePathLikeSpecifier(
  spec: string,
  cwd: string,
  resolveModule: (specifier: string, containingFile: string) => string | null
): string | null {
  if (isRelativeSpecifier(spec)) {
    const dummyFile = path.join(cwd, "__codemod__.ts");
    return resolveModule(spec, dummyFile);
  }

  if (path.isAbsolute(spec)) {
    return resolveAbsolutePath(spec);
  }

  return null;
}

function resolveAbsolutePath(spec: string): string | null {
  const basePath = path.resolve(spec);
  const resolved = tryResolveWithExtensions(basePath);
  if (!resolved) {
    return null;
  }

  const real = ts.sys.realpath?.(resolved) ?? resolved;
  return normalizeFileName(real);
}

function tryResolveWithExtensions(basePath: string): string | null {
  if (ts.sys.fileExists(basePath)) {
    return basePath;
  }

  for (const entry of KNOWN_EXTENSION_ENTRIES) {
    const candidate = `${basePath}${entry.ext}`;
    if (ts.sys.fileExists(candidate)) {
      return candidate;
    }
  }

  if (ts.sys.directoryExists?.(basePath)) {
    for (const entry of KNOWN_EXTENSION_ENTRIES) {
      const candidate = path.join(basePath, `index${entry.ext}`);
      if (ts.sys.fileExists(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function createSpecifierDescriptor(
  spec: string,
  label: "from" | "to",
  context: {
    cwd: string;
    isAliasSpecifier: (specifier: string) => boolean;
    resolveModule: (specifier: string, containingFile: string) => string | null;
  }
): SpecifierDescriptor {
  if (context.isAliasSpecifier(spec)) {
    return { type: "alias", text: spec };
  }

  if (isRelativeSpecifier(spec) || path.isAbsolute(spec)) {
    const resolved = resolvePathLikeSpecifier(
      spec,
      context.cwd,
      context.resolveModule
    );
    if (!resolved) {
      throw new Error(
        `Unable to resolve ${label} specifier "${spec}" to a concrete file. Provide a path with an explicit file or ensure the target exists.`
      );
    }

    const posixSpec = toPosixPath(spec);
    const hasExtension = hasKnownExtension(posixSpec);
    const specWithoutExtension = hasExtension
      ? stripKnownExtension(posixSpec)
      : posixSpec;
    const preserveIndex =
      specWithoutExtension === "index" ||
      specWithoutExtension.endsWith("/index");

    let resolvedFilePath = path.resolve(resolved);
    if (typeof ts.sys.realpath === "function") {
      try {
        resolvedFilePath = ts.sys.realpath(resolvedFilePath);
      } catch {
        resolvedFilePath = path.resolve(resolvedFilePath);
      }
    }

    return {
      type: "path",
      text: spec,
      resolvedPath: resolved,
      resolvedFilePath,
      hasExplicitExtension: hasExtension,
      preserveIndex,
    };
  }

  return { type: "bare", text: spec };
}

function shouldReplaceSpecifier(
  specifier: string,
  containingFile: string,
  descriptor: SpecifierDescriptor,
  resolveModule: (specifier: string, containingFile: string) => string | null
): boolean {
  switch (descriptor.type) {
    case "alias":
    case "bare":
      return specifier === descriptor.text;
    case "path": {
      const resolved = resolveModule(specifier, containingFile);
      if (!resolved) {
        return false;
      }
      return resolved === descriptor.resolvedPath;
    }
    default:
      return false;
  }
}

function getReplacementSpecifier(
  containingFile: string,
  descriptor: SpecifierDescriptor
): string | null {
  switch (descriptor.type) {
    case "alias":
    case "bare":
      return descriptor.text;
    case "path": {
      const importerDir = path.dirname(containingFile);
      let relativePath = path.relative(
        importerDir,
        descriptor.resolvedFilePath
      );
      relativePath = ensureRelativePrefix(toPosixPath(relativePath));

      if (!descriptor.hasExplicitExtension) {
        const withoutExtension = stripKnownExtension(relativePath);
        if (!descriptor.preserveIndex) {
          const candidate = stripTrailingIndex(withoutExtension);
          if (!isTrivialRelativeSpecifier(candidate)) {
            relativePath = candidate;
          } else {
            relativePath = withoutExtension;
          }
        } else {
          relativePath = withoutExtension;
        }
      }

      return relativePath;
    }
    default:
      return null;
  }
}
function applyReplacements(
  source: string,
  replacements: Array<{ start: number; end: number; text: string }>
): string {
  let updated = source;
  // Apply from last to first to keep indexes stable
  const sorted = [...replacements].sort((a, b) => b.start - a.start);
  for (const replacement of sorted) {
    updated =
      updated.slice(0, replacement.start) +
      replacement.text +
      updated.slice(replacement.end);
  }
  return updated;
}

function getQuoteCharacter(
  literal: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral
): string {
  const text = literal.getText();
  if (text.startsWith('"') || text.startsWith("'") || text.startsWith("`")) {
    return text[0]!;
  }
  return '"';
}

function isSupportedStringLiteral(
  node: ts.Expression | ts.Node
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

export async function runReplaceImportCodemod(
  options: ReplaceImportCodemodOptions
): Promise<ReplaceImportCodemodResult> {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();

  const tsconfigPath = path.resolve(
    cwd,
    options.tsconfigPath ?? "./tsconfig.json"
  );

  if (!ts.sys.fileExists(tsconfigPath)) {
    throw new Error(`tsconfig not found at ${tsconfigPath}`);
  }

  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    const format = createDiagnosticsFormatter(cwd);
    throw new Error(format([configFile.error]));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsconfigPath)
  );

  if (parsedConfig.errors.length > 0) {
    const format = createDiagnosticsFormatter(cwd);
    throw new Error(format(parsedConfig.errors));
  }

  const compilerOptions = {
    ...parsedConfig.options,
    allowJs: options.includeJs ? true : parsedConfig.options.allowJs,
  };

  const files = parsedConfig.fileNames.filter((filePath) => {
    const ext = path.extname(filePath).toLowerCase();

    if (TS_EXTENSIONS.has(ext)) {
      return true;
    }

    if (options.includeJs && JS_EXTENSIONS.has(ext)) {
      return true;
    }

    return false;
  });

  const moduleResolutionHost: ts.ModuleResolutionHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    realpath: ts.sys.realpath?.bind(ts.sys),
    directoryExists: ts.sys.directoryExists?.bind(ts.sys),
    getDirectories: ts.sys.getDirectories?.bind(ts.sys),
  };

  const resolutionCache = new Map<string, string | null>();

  const resolveModule = (specifier: string, containingFile: string) => {
    const cacheKey = `${normalizeFileName(containingFile)}::${specifier}`;

    if (resolutionCache.has(cacheKey)) {
      return resolutionCache.get(cacheKey) ?? null;
    }

    const result = ts.resolveModuleName(
      specifier,
      containingFile,
      compilerOptions,
      moduleResolutionHost
    );

    if (result.resolvedModule) {
      const normalized = normalizeFileName(
        result.resolvedModule.resolvedFileName
      );
      resolutionCache.set(cacheKey, normalized);
      return normalized;
    }

    resolutionCache.set(cacheKey, null);
    return null;
  };

  const isAliasSpecifier = createAliasMatcher(compilerOptions.paths);

  const fromDescriptor = createSpecifierDescriptor(options.from, "from", {
    cwd,
    isAliasSpecifier,
    resolveModule,
  });

  const toDescriptor = createSpecifierDescriptor(options.to, "to", {
    cwd,
    isAliasSpecifier,
    resolveModule,
  });

  const changes: ReplaceImportChangeDetail[] = [];
  let filesVisited = 0;
  let filesChanged = 0;
  let totalOccurrences = 0;

  for (const filePath of files) {
    filesVisited += 1;
    const sourceText = await readFile(filePath, "utf-8");
    const extname = path.extname(filePath).toLowerCase();
    const scriptKind =
      extname === ".tsx"
        ? ts.ScriptKind.TSX
        : extname === ".jsx"
          ? ts.ScriptKind.JSX
          : extname === ".json"
            ? ts.ScriptKind.JSON
            : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const replacements: Array<{ start: number; end: number; text: string }> =
      [];
    let fileOccurrences = 0;
    const previews: ReplaceImportChangeDetail["previews"] = [];

    let containingFile = path.resolve(filePath);
    if (typeof ts.sys.realpath === "function") {
      try {
        containingFile = ts.sys.realpath(containingFile);
      } catch {
        // Ignore realpath errors and fall back to resolved path.
      }
    }

    const considerLiteral = (
      literal: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral
    ) => {
      const specifier = literal.text;
      if (
        !shouldReplaceSpecifier(
          specifier,
          containingFile,
          fromDescriptor,
          resolveModule
        )
      ) {
        return;
      }

      const quote = getQuoteCharacter(literal);
      const replacementSpecifier = getReplacementSpecifier(
        containingFile,
        toDescriptor
      );

      if (!replacementSpecifier || replacementSpecifier === specifier) {
        return;
      }

      const updatedText = `${quote}${replacementSpecifier}${quote}`;

      replacements.push({
        start: literal.getStart(sourceFile),
        end: literal.getEnd(),
        text: updatedText,
      });

      fileOccurrences += 1;

      const { line } = sourceFile.getLineAndCharacterOfPosition(
        literal.getStart(sourceFile)
      );

      previews.push({
        original: literal.getText(sourceFile),
        updated: updatedText,
        line: line + 1,
      });
    };

    const visit = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) &&
        isSupportedStringLiteral(node.moduleSpecifier)
      ) {
        considerLiteral(node.moduleSpecifier);
      } else if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        isSupportedStringLiteral(node.moduleSpecifier)
      ) {
        considerLiteral(node.moduleSpecifier);
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression &&
        isSupportedStringLiteral(node.moduleReference.expression)
      ) {
        considerLiteral(node.moduleReference.expression);
      } else if (
        ts.isCallExpression(node) &&
        node.arguments.length === 1 &&
        isSupportedStringLiteral(node.arguments[0]!) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require"
      ) {
        considerLiteral(node.arguments[0]!);
      } else if (ts.isImportTypeNode(node)) {
        if (
          ts.isLiteralTypeNode(node.argument) &&
          node.argument.literal &&
          isSupportedStringLiteral(node.argument.literal)
        ) {
          considerLiteral(node.argument.literal);
        }
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1
      ) {
        const importArg = node.arguments[0];
        if (importArg && isSupportedStringLiteral(importArg)) {
          considerLiteral(importArg);
        }
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);

    if (replacements.length === 0) {
      continue;
    }

    filesChanged += 1;
    totalOccurrences += fileOccurrences;
    changes.push({
      filePath,
      occurrences: fileOccurrences,
      previews,
    });

    if (!options.dryRun) {
      const updatedText = applyReplacements(sourceText, replacements);
      await writeFile(filePath, updatedText, "utf-8");
    }
  }

  return {
    filesVisited,
    filesChanged,
    specifiersUpdated: totalOccurrences,
    dryRun: Boolean(options.dryRun),
    changes,
  };
}
