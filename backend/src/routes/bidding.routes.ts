import { Router } from "express";
import {
  createBid,
  fillFormTemplate,
  generateDocument,
  getComplianceChecklist,
  getPricingTiers,
  getProposalDraft,
  listBids,
  listFormTemplates,
  submitBid,
  updateComplianceItem
} from "../controllers/bidding.controller.js";
import { requireAuth } from "../middleware/permission.middleware.js";

export const biddingRouter = Router();

biddingRouter.get("/", requireAuth, listBids);
biddingRouter.post("/", requireAuth, createBid);
biddingRouter.post("/submit", requireAuth, submitBid);
biddingRouter.get("/pricing", requireAuth, getPricingTiers);
biddingRouter.get("/proposal", requireAuth, getProposalDraft);
biddingRouter.get("/compliance", requireAuth, getComplianceChecklist);
biddingRouter.post("/compliance", requireAuth, updateComplianceItem);
biddingRouter.post("/documents", requireAuth, generateDocument);
biddingRouter.get("/forms", requireAuth, listFormTemplates);
biddingRouter.post("/forms/fill", requireAuth, fillFormTemplate);
