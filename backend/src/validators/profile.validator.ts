import { ValidationResult, validateRequired, combineResults } from "./common.validator.js";

export interface ProfileInput {
  companyName?: string;
  naicsCodes?: string[];
}

export const validateProfile = (input: ProfileInput): ValidationResult => {
  return combineResults(
    validateRequired(input.companyName, "companyName"),
    validateRequired(input.naicsCodes?.length, "naicsCodes")
  );
};
