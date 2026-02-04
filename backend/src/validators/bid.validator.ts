import { ValidationResult, validateRequired, combineResults } from "./common.validator.js";

export interface BidInput {
  contractId?: string;
  proposalText?: string;
  pricingTier?: string;
}

export const validateBid = (input: BidInput): ValidationResult => {
  return combineResults(
    validateRequired(input.contractId, "contractId"),
    validateRequired(input.proposalText, "proposalText"),
    validateRequired(input.pricingTier, "pricingTier")
  );
};
