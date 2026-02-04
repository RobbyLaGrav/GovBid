import type { Request, Response } from "express";
import { validateBid } from "../validators/bid.validator.js";
import { validationError } from "../utils/errors.js";
import { PricingEngineService } from "../services/bidding/pricingEngine.service.js";
import { ProposalWriterService } from "../services/bidding/proposalWriter.service.js";
import { ComplianceService } from "../services/bidding/compliance.service.js";
import { DocumentGeneratorService } from "../services/bidding/documentGenerator.service.js";
import { FormFillerService } from "../services/bidding/formFiller.service.js";
import { BidRecord, BidSubmissionPayload } from "../types/bid.types.js";

const pricingEngine = new PricingEngineService();
const proposalWriter = new ProposalWriterService();
const complianceService = new ComplianceService();
const documentGenerator = new DocumentGeneratorService();
const formFiller = new FormFillerService();

const bids: BidRecord[] = [];

export const listBids = (_req: Request, res: Response) => {
  res.status(200).json({ data: bids });
};

export const createBid = (req: Request, res: Response) => {
  const payload = req.body as { contractId?: string; value?: number };
  if (!payload.contractId) {
    throw validationError("contractId is required");
  }
  const now = new Date().toISOString();
  const bid: BidRecord = {
    id: `bid_${bids.length + 1}`,
    contractId: payload.contractId,
    ownerId: req.user?.id ?? "system",
    status: "draft",
    value: payload.value ?? 0,
    submittedAt: null,
    decisionAt: null,
    createdAt: now,
    updatedAt: now
  };
  bids.push(bid);
  res.status(201).json({ data: bid });
};

export const submitBid = (req: Request, res: Response) => {
  const payload = req.body as BidSubmissionPayload;
  const result = validateBid(payload);
  if (!result.valid) {
    throw validationError("Bid payload invalid", { errors: result.errors });
  }
  const bid = bids.find((record) => record.contractId === payload.contractId);
  if (!bid) {
    throw validationError("Bid not found");
  }
  bid.status = "submitted";
  bid.submittedAt = new Date().toISOString();
  bid.updatedAt = bid.submittedAt;
  res.status(200).json({ data: bid });
};

export const getPricingTiers = (req: Request, res: Response) => {
  const baseCost = Number(req.query.baseCost ?? 50000);
  const tiers = pricingEngine.buildPricing({
    baseCost,
    laborHours: Number(req.query.laborHours ?? 120),
    overheadRate: Number(req.query.overheadRate ?? 0.2),
    riskBuffer: Number(req.query.riskBuffer ?? 5000)
  });
  res.status(200).json({ data: tiers });
};

export const getProposalDraft = (req: Request, res: Response) => {
  const companyName = String(req.query.companyName ?? "GovBid Contractor");
  const contractTitle = String(req.query.contractTitle ?? "Untitled Opportunity");
  const draft = proposalWriter.buildDraft(companyName, contractTitle);
  const sections = proposalWriter.toSections(draft);
  res.status(200).json({ data: sections });
};

export const getComplianceChecklist = (_req: Request, res: Response) => {
  res.status(200).json({ data: complianceService.list(), compliant: complianceService.isCompliant() });
};

export const updateComplianceItem = (req: Request, res: Response) => {
  const { id, completed } = req.body as { id: string; completed: boolean };
  const item = complianceService.update(id, completed);
  if (!item) {
    throw validationError("Compliance item not found");
  }
  res.status(200).json({ data: item, compliant: complianceService.isCompliant() });
};

export const generateDocument = (req: Request, res: Response) => {
  const { sections, format } = req.body as { sections: { title: string; content: string }[]; format?: "markdown" | "pdf" };
  if (!sections || sections.length === 0) {
    throw validationError("Sections are required");
  }
  const bundle = format === "pdf" ? documentGenerator.generatePdf(sections) : documentGenerator.generateMarkdown(sections);
  res.status(200).json({ data: bundle });
};

export const listFormTemplates = (_req: Request, res: Response) => {
  res.status(200).json({ data: formFiller.listTemplates() });
};

export const fillFormTemplate = (req: Request, res: Response) => {
  const { id, values } = req.body as { id: string; values: Record<string, string> };
  const filled = formFiller.fillTemplate(id, values ?? {});
  if (!filled) {
    throw validationError("Template not found");
  }
  res.status(200).json({ data: filled });
};
