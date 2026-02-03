// =============================================================================
// GovBid Pro - Error Handler Middleware
// =============================================================================
// Centralized error handling for the Express application
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  public readonly errors: ValidationErrorItem[];

  constructor(errors: ValidationErrorItem[]) {
    super('Validation failed', 422, 'VALIDATION_ERROR', { errors });
    this.errors = errors;
  }
}

export interface ValidationErrorItem {
  field: string;
  message: string;
  value?: unknown;
}

export class TooManyRequestsError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'TOO_MANY_REQUESTS', { retryAfter });
    this.retryAfter = retryAfter;
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

// =============================================================================
// ERROR RESPONSE INTERFACE
// =============================================================================

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, unknown>;
    errors?: ValidationErrorItem[];
    stack?: string;
  };
  requestId?: string;
  timestamp: string;
}

// =============================================================================
// ERROR HANDLERS
// =============================================================================

/**
 * Handle Prisma database errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      return new ConflictError(`A record with this ${target} already exists`);
    }
    case 'P2003': {
      // Foreign key constraint violation
      return new BadRequestError('Invalid reference to related record');
    }
    case 'P2025': {
      // Record not found
      return new NotFoundError('Record not found');
    }
    case 'P2014': {
      // Required relation violation
      return new BadRequestError('Required relation missing');
    }
    case 'P2016': {
      // Query interpretation error
      return new BadRequestError('Invalid query');
    }
    default:
      console.error('Unhandled Prisma error:', error.code, error.message);
      return new InternalServerError('Database error');
  }
}

/**
 * Handle JWT errors
 */
function handleJWTError(error: Error): AppError {
  if (error.name === 'TokenExpiredError') {
    return new UnauthorizedError('Token has expired');
  }
  if (error.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid token');
  }
  if (error.name === 'NotBeforeError') {
    return new UnauthorizedError('Token not yet valid');
  }
  return new UnauthorizedError('Authentication failed');
}

/**
 * Handle validation errors from express-validator or Joi
 */
function handleValidationError(error: unknown): AppError {
  if (Array.isArray(error)) {
    const errors: ValidationErrorItem[] = error.map((e) => ({
      field: e.path || e.param || 'unknown',
      message: e.msg || e.message || 'Invalid value',
      value: e.value,
    }));
    return new ValidationError(errors);
  }
  return new BadRequestError('Validation failed');
}

// =============================================================================
// MAIN ERROR HANDLER
// =============================================================================

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  let appError: AppError;

  // Convert known error types to AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    appError = new BadRequestError('Invalid data provided');
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    appError = new ServiceUnavailableError('Database connection failed');
  } else if (
    error.name === 'TokenExpiredError' ||
    error.name === 'JsonWebTokenError' ||
    error.name === 'NotBeforeError'
  ) {
    appError = handleJWTError(error);
  } else if (error.name === 'MulterError') {
    // File upload errors
    appError = new BadRequestError(error.message);
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    // JSON parsing errors
    appError = new BadRequestError('Invalid JSON in request body');
  } else {
    // Unknown errors
    appError = new InternalServerError(
      process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    );
  }

  // Build response
  const response: ErrorResponse = {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
    },
    timestamp: new Date().toISOString(),
  };

  // Add details if present
  if (appError.details) {
    response.error.details = appError.details;
  }

  // Add validation errors if present
  if (appError instanceof ValidationError) {
    response.error.errors = appError.errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  // Add request ID if present
  if (req.headers['x-request-id']) {
    response.requestId = req.headers['x-request-id'] as string;
  }

  // Set retry-after header for rate limiting
  if (appError instanceof TooManyRequestsError && appError.retryAfter) {
    res.setHeader('Retry-After', appError.retryAfter);
  }

  // Send response
  res.status(appError.statusCode).json(response);
}

// =============================================================================
// 404 HANDLER
// =============================================================================

/**
 * Handle 404 - Route not found
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}

// =============================================================================
// ASYNC HANDLER WRAPPER
// =============================================================================

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// =============================================================================
// ERROR THROWERS (Convenience functions)
// =============================================================================

export function throwBadRequest(message: string, details?: Record<string, unknown>): never {
  throw new BadRequestError(message, details);
}

export function throwUnauthorized(message?: string): never {
  throw new UnauthorizedError(message);
}

export function throwForbidden(message?: string): never {
  throw new ForbiddenError(message);
}

export function throwNotFound(message?: string): never {
  throw new NotFoundError(message);
}

export function throwConflict(message?: string): never {
  throw new ConflictError(message);
}

export function throwValidation(errors: ValidationErrorItem[]): never {
  throw new ValidationError(errors);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,

  // Error classes
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,

  // Throwers
  throwBadRequest,
  throwUnauthorized,
  throwForbidden,
  throwNotFound,
  throwConflict,
  throwValidation,
};
