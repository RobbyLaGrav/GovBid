import { EMAIL_REGEX } from "../utils/constants.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateEmail = (email?: string): ValidationResult => {
  if (!email) {
    return { valid: false, errors: ["Email is required"] };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, errors: ["Email format is invalid"] };
  }
  return { valid: true, errors: [] };
};

export const validateRequired = (value: unknown, field: string): ValidationResult => {
  if (value === undefined || value === null || value === "") {
    return { valid: false, errors: [`${field} is required`] };
  }
  return { valid: true, errors: [] };
};

export const combineResults = (...results: ValidationResult[]): ValidationResult => {
  const errors = results.flatMap((result) => result.errors);
  return { valid: errors.length === 0, errors };
};
