import { Router } from "express";
import {
  addCapability,
  addCertification,
  createProfile,
  listCapabilities,
  listCertifications,
  listProfiles,
  updateProfile
} from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/permission.middleware.js";

export const profileRouter = Router();

profileRouter.get("/", requireAuth, listProfiles);
profileRouter.post("/", requireAuth, createProfile);
profileRouter.put("/:id", requireAuth, updateProfile);

profileRouter.get("/capabilities", requireAuth, listCapabilities);
profileRouter.post("/capabilities", requireAuth, addCapability);

profileRouter.get("/certifications", requireAuth, listCertifications);
profileRouter.post("/certifications", requireAuth, addCertification);
