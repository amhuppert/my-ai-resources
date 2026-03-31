export type ErrorType =
  | "no_session"
  | "provider_not_found"
  | "snapshot_timeout"
  | "snapshot_error"
  | "internal_error";

export class WebDebuggerError extends Error {
  constructor(
    public readonly type: ErrorType,
    message: string,
  ) {
    super(message);
    this.name = "WebDebuggerError";
  }
}

export interface ErrorResponse {
  error: { type: ErrorType; message: string };
}

export function handleError(error: unknown): ErrorResponse {
  if (error instanceof WebDebuggerError) {
    return { error: { type: error.type, message: error.message } };
  }
  if (error instanceof Error) {
    return { error: { type: "internal_error", message: error.message } };
  }
  return { error: { type: "internal_error", message: "Unknown error" } };
}
