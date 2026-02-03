// =============================================================================
// GovBid Pro - Validation Middleware
// =============================================================================
// Express middleware for request validation using express-validator
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError as ExpressValidationError } from 'express-validator';
import { ValidationError, ValidationErrorItem } from './errorHandler.middleware';

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Validate request and throw ValidationError if validation fails
 * Use this after validation chains
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    next();
    return;
  }

  const validationErrors: ValidationErrorItem[] = errors.array().map((error: ExpressValidationError) => {
    // Handle different error types from express-validator
    if (error.type === 'field') {
      return {
        field: error.path,
        message: error.msg,
        value: error.value,
      };
    }

    // Alternative error format
    return {
      field: 'path' in error ? String(error.path) : 'unknown',
      message: error.msg,
      value: 'value' in error ? error.value : undefined,
    };
  });

  throw new ValidationError(validationErrors);
}

/**
 * Validate request and return boolean
 * Does not throw, returns validation result
 */
export function isValid(req: Request): boolean {
  const errors = validationResult(req);
  return errors.isEmpty();
}

/**
 * Get validation errors as array
 * Returns empty array if valid
 */
export function getValidationErrors(req: Request): ValidationErrorItem[] {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return [];
  }

  return errors.array().map((error: ExpressValidationError) => {
    if (error.type === 'field') {
      return {
        field: error.path,
        message: error.msg,
        value: error.value,
      };
    }

    return {
      field: 'path' in error ? String(error.path) : 'unknown',
      message: error.msg,
      value: 'value' in error ? error.value : undefined,
    };
  });
}

/**
 * Validate and return standardized response
 * Use when you want to handle validation errors manually
 */
export function validateWithResponse(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    next();
    return;
  }

  const validationErrors = errors.array().map((error: ExpressValidationError) => {
    if (error.type === 'field') {
      return {
        field: error.path,
        message: error.msg,
        value: error.value,
      };
    }

    return {
      field: 'path' in error ? String(error.path) : 'unknown',
      message: error.msg,
    };
  });

  res.status(422).json({
    success: false,
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      errors: validationErrors,
    },
    timestamp: new Date().toISOString(),
  });
}

// =============================================================================
// CUSTOM VALIDATORS
// =============================================================================

/**
 * Validate that value is a valid CUID
 */
export function isCUID(value: string): boolean {
  // CUID format: starts with 'c', followed by lowercase letters and numbers
  return /^c[a-z0-9]{24,}$/.test(value);
}

/**
 * Validate that value is a valid UUID
 */
export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Validate that value is a valid ID (CUID or UUID)
 */
export function isValidId(value: string): boolean {
  return isCUID(value) || isUUID(value);
}

/**
 * Custom validator for comma-separated list
 */
export function isCommaSeparatedList(
  value: string,
  validator: (item: string) => boolean
): boolean {
  if (!value) return true;
  const items = value.split(',').map((item) => item.trim());
  return items.every(validator);
}

/**
 * Sanitize string input
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000); // Limit length
}

/**
 * Validate JSON string
 */
export function isValidJSON(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate NAICS code format
 */
export function isValidNAICSCode(value: string): boolean {
  return /^\d{2,6}$/.test(value);
}

/**
 * Validate US state abbreviation
 */
export function isValidStateAbbreviation(value: string): boolean {
  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP', // Territories
  ];
  return states.includes(value.toUpperCase());
}

/**
 * Validate ZIP code format
 */
export function isValidZipCode(value: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(value);
}

/**
 * Validate phone number format (flexible)
 */
export function isValidPhoneNumber(value: string): boolean {
  // Remove all non-numeric characters except +
  const cleaned = value.replace(/[^\d+]/g, '');
  // Should have 10-15 digits
  return /^\+?\d{10,15}$/.test(cleaned);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  validate,
  isValid,
  getValidationErrors,
  validateWithResponse,

  // Custom validators
  isCUID,
  isUUID,
  isValidId,
  isCommaSeparatedList,
  sanitizeString,
  isValidJSON,
  isValidNAICSCode,
  isValidStateAbbreviation,
  isValidZipCode,
  isValidPhoneNumber,
};
