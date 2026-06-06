import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Project, ts } from "ts-morph";
import { EngineError, NoSymbolError } from "../errors";
import { fingerprintDirectory, sha256, sha256OfFile } from "../fingerprint";
import { offsetToPosition } from "../position";
import type { FileEdits, FileRename, PlanDraft, ProjectScope, TextEdit } from "../types";
import type {
  LoadProjectOptions,
  MoveRequest,
  RefactorEngine,
  RenameRequest,
} from "./refactor-engine";

const PUBLIC_ENTRY_WARNING =
  "renamed symbol is exported via a public entry point; external references may exist and are NOT covered by this rename. Absence of this warning is not a completeness guarantee.";
const SCOPE_NARROWED_WARNING =
  "project scope was narrowed to the provided files; references in unloaded files are not covered.";
const EXPORTS_BOUNDARY_WARNING =
  "moved file is a package exports/imports subpath target; rewriting that boundary is out of scope, so the package map was NOT updated. Update package.json manually.";

interface RawTextChange {
  start: number;
  length: number;
  newText: string;
}

export class TsMorphEngine implements RefactorEngine {
  #project: Project | undefined;
  #scope: ProjectScope | undefined;
  #buildCount = 0;
  #publicEntryFiles = new Set<string>();
  #packageExportTargets = new Set<string>();

  loadProject(opts: LoadProjectOptions): ProjectScope {
    const warnings: string[] = [];
    const narrowed = opts.scopeFiles !== undefined && opts.scopeFiles.length > 0;

    const project = new Project({
      tsConfigFilePath: opts.tsconfigPath,
      skipAddingFilesFromTsConfig: narrowed,
    });
    this.#buildCount += 1;

    if (narrowed && opts.scopeFiles) {
      for (const file of opts.scopeFiles) {
        project.addSourceFileAtPath(file);
      }
      project.resolveSourceFileDependencies();
      warnings.push(SCOPE_NARROWED_WARNING);
    }

    this.#project = project;
    this.#publicEntryFiles = this.#computePublicEntryFiles(opts.tsconfigPath, project);
    this.#packageExportTargets = this.#computePackageExportTargets(opts.tsconfigPath);

    const scope: ProjectScope = {
      tsconfigPath: opts.tsconfigPath,
      filesLoaded: project.getSourceFiles().length,
      warnings,
    };
    this.#scope = scope;
    return scope;
  }

  planRename(req: RenameRequest): PlanDraft {
    const project = this.#requireProject();
    const ls = project.getLanguageService().compilerObject;

    return project.forgetNodesCreatedInBlock(() => {
      const locations = ls.findRenameLocations(
        req.filePath,
        req.offset,
        false,
        false,
        true,
      );

      if (locations === undefined || locations.length === 0) {
        throw new NoSymbolError(
          `No renameable symbol at ${req.filePath}:${req.offset}`,
        );
      }

      const changesByFile = new Map<string, RawTextChange[]>();
      for (const loc of locations) {
        const newText =
          (loc.prefixText ?? "") + req.newName + (loc.suffixText ?? "");
        const existing = changesByFile.get(loc.fileName) ?? [];
        existing.push({
          start: loc.textSpan.start,
          length: loc.textSpan.length,
          newText,
        });
        changesByFile.set(loc.fileName, existing);
      }

      const fileEdits = this.#buildFileEdits(changesByFile);
      const warnings = this.#renameScopeWarnings(req.filePath, locations);

      return {
        operation: "rename",
        fileEdits,
        fileRenames: [],
        scope: this.#scopeWith(warnings),
      };
    });
  }

  planMove(req: MoveRequest): PlanDraft {
    return this.#planFileRename("move", req);
  }

  planMoveDir(req: MoveRequest): PlanDraft {
    return this.#planFileRename("moveDir", req);
  }

  refreshFiles(absPaths: string[]): void {
    const project = this.#requireProject();
    for (const absPath of absPaths) {
      if (!existsSync(absPath)) {
        // The path is gone (a moved-away file or directory). Drop the matching
        // source file and any source files that lived under it.
        const exact = project.getSourceFile(absPath);
        if (exact) {
          project.removeSourceFile(exact);
        }
        const prefix = absPath.endsWith("/") ? absPath : `${absPath}/`;
        for (const sf of project.getSourceFiles()) {
          if (sf.getFilePath().startsWith(prefix)) {
            project.removeSourceFile(sf);
          }
        }
        continue;
      }
      if (statSync(absPath).isDirectory()) {
        // A moved directory: pick up the source files now under the new location.
        project.addSourceFilesAtPaths([`${absPath}/**/*.ts`, `${absPath}/**/*.tsx`]);
        continue;
      }
      const sf = project.getSourceFile(absPath);
      if (sf) {
        sf.refreshFromFileSystemSync();
        continue;
      }
      project.addSourceFileAtPath(absPath);
    }
  }

  dispose(): void {
    this.#project = undefined;
    this.#scope = undefined;
    this.#publicEntryFiles = new Set<string>();
    this.#packageExportTargets = new Set<string>();
  }

  programBuildCount(): number {
    return this.#buildCount;
  }

  debugSnapshot(): Array<[string, string]> {
    const project = this.#requireProject();
    return project
      .getSourceFiles()
      .map((sf): [string, string] => [sf.getFilePath(), sf.getFullText()]);
  }

  #planFileRename(
    operation: "move" | "moveDir",
    req: MoveRequest,
  ): PlanDraft {
    const project = this.#requireProject();
    const ls = project.getLanguageService().compilerObject;
    const formatSettings = ts.getDefaultFormatCodeSettings();

    return project.forgetNodesCreatedInBlock(() => {
      const changes = ls.getEditsForFileRename(req.from, req.to, formatSettings, {});

      const changesByFile = new Map<string, RawTextChange[]>();
      for (const fileChange of changes) {
        const raw = (changesByFile.get(fileChange.fileName) ?? []).concat(
          fileChange.textChanges.map((tc) => ({
            start: tc.span.start,
            length: tc.span.length,
            newText: tc.newText,
          })),
        );
        changesByFile.set(fileChange.fileName, raw);
      }

      const fileEdits = this.#buildFileEdits(changesByFile);
      const fileRenames: FileRename[] = [
        {
          from: req.from,
          to: req.to,
          fromSha256:
            operation === "move"
              ? sha256OfFile(req.from)
              : fingerprintDirectory(req.from),
          overwrite: false,
        },
      ];

      return {
        operation,
        fileEdits,
        fileRenames,
        scope: this.#scopeWith(this.#moveBoundaryWarnings(operation, req.from)),
      };
    });
  }

  // A move that relocates a package `exports`/`imports` subpath target would
  // require rewriting that boundary, which is out of MVP scope. Warn instead of
  // silently leaving the package map pointing at the old location.
  #moveBoundaryWarnings(
    operation: "move" | "moveDir",
    from: string,
  ): string[] {
    const fromAbs = resolve(from);
    if (operation === "move") {
      return this.#packageExportTargets.has(fromAbs)
        ? [EXPORTS_BOUNDARY_WARNING]
        : [];
    }
    const prefix = fromAbs.endsWith("/") ? fromAbs : `${fromAbs}/`;
    const crosses = [...this.#packageExportTargets].some((target) =>
      target.startsWith(prefix),
    );
    return crosses ? [EXPORTS_BOUNDARY_WARNING] : [];
  }

  #buildFileEdits(changesByFile: Map<string, RawTextChange[]>): FileEdits[] {
    const fileEdits: FileEdits[] = [];
    for (const [fileName, rawChanges] of changesByFile) {
      const text = readFileSync(fileName, "utf8");
      const sorted = [...rawChanges].sort((a, b) => a.start - b.start);

      const edits: TextEdit[] = [];
      let lastEnd = -1;
      for (const change of sorted) {
        if (change.start < lastEnd) {
          throw new EngineError(
            `Overlapping edits produced for ${fileName} at offset ${change.start}`,
          );
        }
        const endOffset = change.start + change.length;
        edits.push({
          start: offsetToPosition(text, change.start),
          end: offsetToPosition(text, endOffset),
          newText: change.newText,
        });
        lastEnd = endOffset;
      }

      fileEdits.push({
        filePath: fileName,
        baseSha256: sha256(text),
        edits,
      });
    }

    return fileEdits.sort((a, b) => a.filePath.localeCompare(b.filePath));
  }

  #renameScopeWarnings(
    requestFilePath: string,
    locations: readonly ts.RenameLocation[],
  ): string[] {
    if (this.#publicEntryFiles.size === 0) return [];

    const declarationFile = resolve(requestFilePath);
    if (this.#publicEntryFiles.has(declarationFile)) {
      return [PUBLIC_ENTRY_WARNING];
    }

    // A barrel/re-export reaches the declaration when a public entry point
    // re-exports the declaration's module; detect that via rename locations
    // landing inside a public entry file.
    const touchesPublicEntry = locations.some((loc) =>
      this.#publicEntryFiles.has(resolve(loc.fileName)),
    );
    if (touchesPublicEntry) {
      return [PUBLIC_ENTRY_WARNING];
    }

    return [];
  }

  #computePublicEntryFiles(tsconfigPath: string, project: Project): Set<string> {
    const result = new Set<string>();
    const projectDir = dirname(resolve(tsconfigPath));

    this.#collectPackageJsonEntries(projectDir, result);
    this.#collectRootBarrels(projectDir, project, result);

    return result;
  }

  // The subset of public entries reachable through the package `exports`/`imports`
  // subpath maps; moving one of these would cross a package boundary (Req 2.4).
  #computePackageExportTargets(tsconfigPath: string): Set<string> {
    const result = new Set<string>();
    const projectDir = dirname(resolve(tsconfigPath));
    const pkgPath = resolve(projectDir, "package.json");
    if (!existsSync(pkgPath)) return result;

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      return result;
    }
    if (typeof parsed !== "object" || parsed === null) return result;

    const record = parsed as Record<string, unknown>;
    this.#collectExportsEntries(projectDir, record["exports"], result);
    this.#collectExportsEntries(projectDir, record["imports"], result);
    return result;
  }

  #collectPackageJsonEntries(projectDir: string, result: Set<string>): void {
    const pkgPath = resolve(projectDir, "package.json");
    if (!existsSync(pkgPath)) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      return;
    }
    if (typeof parsed !== "object" || parsed === null) return;

    const record = parsed as Record<string, unknown>;
    for (const key of ["main", "module", "types", "typings"]) {
      const value = record[key];
      if (typeof value === "string") {
        this.#addEntryTarget(projectDir, value, result);
      }
    }
    this.#collectExportsEntries(projectDir, record["exports"], result);
  }

  #collectExportsEntries(
    projectDir: string,
    exportsField: unknown,
    result: Set<string>,
  ): void {
    if (typeof exportsField === "string") {
      this.#addEntryTarget(projectDir, exportsField, result);
      return;
    }
    if (typeof exportsField !== "object" || exportsField === null) return;
    for (const value of Object.values(exportsField as Record<string, unknown>)) {
      this.#collectExportsEntries(projectDir, value, result);
    }
  }

  // Map a published .js/.d.ts entry target back to its TypeScript source file
  // when the source exists; otherwise record the target as-is.
  #addEntryTarget(projectDir: string, target: string, result: Set<string>): void {
    const abs = resolve(projectDir, target);
    if (existsSync(abs)) {
      result.add(abs);
    }
    const tsCandidate = abs
      .replace(/\.d\.ts$/, ".ts")
      .replace(/\.js$/, ".ts");
    if (existsSync(tsCandidate)) {
      result.add(tsCandidate);
    }
  }

  #collectRootBarrels(
    projectDir: string,
    project: Project,
    result: Set<string>,
  ): void {
    for (const candidate of [
      resolve(projectDir, "index.ts"),
      resolve(projectDir, "src/index.ts"),
    ]) {
      if (project.getSourceFile(candidate)) {
        result.add(candidate);
      }
    }
  }

  #scopeWith(extraWarnings: string[]): ProjectScope {
    const base = this.#requireScope();
    return {
      tsconfigPath: base.tsconfigPath,
      filesLoaded: base.filesLoaded,
      warnings: [...base.warnings, ...extraWarnings],
    };
  }

  #requireProject(): Project {
    if (!this.#project) {
      throw new EngineError("loadProject must be called before planning operations");
    }
    return this.#project;
  }

  #requireScope(): ProjectScope {
    if (!this.#scope) {
      throw new EngineError("loadProject must be called before planning operations");
    }
    return this.#scope;
  }
}
