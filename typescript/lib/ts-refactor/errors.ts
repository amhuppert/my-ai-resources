export abstract class RefactorError extends Error {
  abstract readonly code: string;
  abstract readonly exitCode: number;
}

export class UsageError extends RefactorError {
  readonly code = "usage";
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

export class NoSymbolError extends RefactorError {
  readonly code = "no_symbol";
  readonly exitCode = 3;
  readonly token: string | undefined;

  constructor(message: string, token?: string) {
    super(message);
    this.name = "NoSymbolError";
    this.token = token;
  }
}

export class StaleApplyError extends RefactorError {
  readonly code = "stale";
  readonly exitCode = 4;
  readonly paths: string[];

  constructor(message: string, paths: string[]) {
    super(message);
    this.name = "StaleApplyError";
    this.paths = paths;
  }
}

export class EngineError extends RefactorError {
  readonly code = "engine";
  readonly exitCode = 5;

  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

export function isRefactorError(value: unknown): value is RefactorError {
  return value instanceof RefactorError;
}
