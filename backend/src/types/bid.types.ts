import { BidStatus } from "../utils/constants.js";

export interface BidRecord {
  id: string;
  contractId: string;
  ownerId: string;
  status: BidStatus;
  value?: number;
  submittedAt?: string | null;
  decisionAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BidSubmissionPayload {
  contractId: string;
  proposalText: string;
  pricingTier: "aggressive" | "competitive" | "premium";
  attachments?: string[];
}
