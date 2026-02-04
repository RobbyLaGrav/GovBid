export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  status: number;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, status: number, code: ErrorCode, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const buildError = (error: unknown): ErrorDetails => {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      status: error.status
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unexpected error",
    status: 500
  };
};

export const errorResponse = (error: unknown): { error: ErrorDetails } => ({
  error: buildError(error)
});

export const validationError = (message: string, details?: Record<string, unknown>): AppError =>
  new AppError(message, 400, "VALIDATION_ERROR", details);

export const unauthorizedError = (message = "Unauthorized"): AppError =>
  new AppError(message, 401, "UNAUTHORIZED");

export const forbiddenError = (message = "Forbidden"): AppError =>
  new AppError(message, 403, "FORBIDDEN");

export const notFoundError = (message = "Not found"): AppError => new AppError(message, 404, "NOT_FOUND");

export const conflictError = (message = "Conflict"): AppError => new AppError(message, 409, "CONFLICT");

export const rateLimitedError = (message = "Rate limit exceeded"): AppError =>
  new AppError(message, 429, "RATE_LIMITED");
