export type ErrorType =
  | "validation_error"
  | "not_found"
  | "constraint_violation"
  | "db_error";

export class MemoryBankError extends Error {
  constructor(
    public readonly type: ErrorType,
    message: string,
  ) {
    super(message);
    this.name = "MemoryBankError";
  }
}

export class ValidationError extends MemoryBankError {
  constructor(message: string) {
    super("validation_error", message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends MemoryBankError {
  constructor(message: string) {
    super("not_found", message);
    this.name = "NotFoundError";
  }
}

export class ConstraintViolationError extends MemoryBankError {
  constructor(message: string) {
    super("constraint_violation", message);
    this.name = "ConstraintViolationError";
  }
}

export class DatabaseError extends MemoryBankError {
  constructor(message: string) {
    super("db_error", message);
    this.name = "DatabaseError";
  }
}

export interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
  };
}

export function createErrorResponse(error: MemoryBankError): ErrorResponse {
  return {
    success: false,
    error: {
      type: error.type,
      message: error.message,
    },
  };
}

export function handleError(error: unknown): ErrorResponse {
  if (error instanceof MemoryBankError) {
    return createErrorResponse(error);
  }
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        type: "db_error",
        message: error.message,
      },
    };
  }
  return {
    success: false,
    error: {
      type: "db_error",
      message: "Unknown error occurred",
    },
  };
}
