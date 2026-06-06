import { describe, expect, test } from "bun:test";
import {
  EngineError,
  NoSymbolError,
  RefactorError,
  StaleApplyError,
  UsageError,
  isRefactorError,
} from "./errors";

describe("RefactorError subclasses", () => {
  test("UsageError carries code usage and exit code 2", () => {
    const err = new UsageError("bad position");

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RefactorError);
    expect(err).toBeInstanceOf(UsageError);
    expect(err.code).toBe("usage");
    expect(err.exitCode).toBe(2);
    expect(err.name).toBe("UsageError");
    expect(err.message).toBe("bad position");
  });

  test("NoSymbolError carries code no_symbol and exit code 3", () => {
    const err = new NoSymbolError("no renameable symbol", "userId");

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RefactorError);
    expect(err.code).toBe("no_symbol");
    expect(err.exitCode).toBe(3);
    expect(err.name).toBe("NoSymbolError");
    expect(err.token).toBe("userId");
  });

  test("NoSymbolError token is undefined when not provided", () => {
    const err = new NoSymbolError("no renameable symbol");

    expect(err.token).toBeUndefined();
  });

  test("StaleApplyError carries code stale, exit code 4, and offending paths", () => {
    const paths = ["/abs/a.ts", "/abs/b.ts"];
    const err = new StaleApplyError("plan is stale", paths);

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RefactorError);
    expect(err.code).toBe("stale");
    expect(err.exitCode).toBe(4);
    expect(err.name).toBe("StaleApplyError");
    expect(err.paths).toEqual(paths);
  });

  test("EngineError carries code engine and exit code 5", () => {
    const err = new EngineError("ts-morph threw");

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RefactorError);
    expect(err.code).toBe("engine");
    expect(err.exitCode).toBe(5);
    expect(err.name).toBe("EngineError");
  });
});

describe("isRefactorError discriminator", () => {
  test("returns true for every RefactorError subclass", () => {
    expect(isRefactorError(new UsageError("x"))).toBe(true);
    expect(isRefactorError(new NoSymbolError("x"))).toBe(true);
    expect(isRefactorError(new StaleApplyError("x", []))).toBe(true);
    expect(isRefactorError(new EngineError("x"))).toBe(true);
  });

  test("returns false for a plain Error and non-errors", () => {
    expect(isRefactorError(new Error("plain"))).toBe(false);
    expect(isRefactorError("usage")).toBe(false);
    expect(isRefactorError(null)).toBe(false);
    expect(isRefactorError({ code: "usage", exitCode: 2 })).toBe(false);
  });

  test("narrows to RefactorError so code/exitCode are accessible", () => {
    const candidate: unknown = new StaleApplyError("stale", ["/abs/a.ts"]);

    if (!isRefactorError(candidate)) {
      throw new Error("expected a RefactorError");
    }

    expect(candidate.code).toBe("stale");
    expect(candidate.exitCode).toBe(4);
  });
});
