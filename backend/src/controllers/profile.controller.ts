import type { Request, Response } from "express";
import { ProfileService } from "../services/profile/profile.service.js";
import { CapabilitiesService } from "../services/profile/capabilities.service.js";
import { CertificationService } from "../services/profile/certification.service.js";
import { validationError } from "../utils/errors.js";

const profileService = new ProfileService();
const capabilitiesService = new CapabilitiesService();
const certificationService = new CertificationService();

export const listProfiles = (_req: Request, res: Response) => {
  res.status(200).json({ data: profileService.list() });
};

export const createProfile = (req: Request, res: Response) => {
  const profile = profileService.create(req.body ?? {});
  res.status(201).json({ data: profile });
};

export const updateProfile = (req: Request, res: Response) => {
  const profileId = req.params.id;
  const profile = profileService.update(profileId, req.body ?? {});
  if (!profile) {
    throw validationError("Profile not found");
  }
  res.status(200).json({ data: profile });
};

export const listCapabilities = (_req: Request, res: Response) => {
  res.status(200).json({ data: capabilitiesService.list() });
};

export const addCapability = (req: Request, res: Response) => {
  const { label, category, description } = req.body as { label?: string; category?: string; description?: string };
  if (!label || !category) {
    throw validationError("label and category are required");
  }
  const capability = capabilitiesService.add(label, category, description);
  res.status(201).json({ data: capability });
};

export const listCertifications = (_req: Request, res: Response) => {
  res.status(200).json({ data: certificationService.list() });
};

export const addCertification = (req: Request, res: Response) => {
  const { name, issuedBy, expiresAt } = req.body as { name?: string; issuedBy?: string; expiresAt?: string };
  if (!name || !issuedBy) {
    throw validationError("name and issuedBy are required");
  }
  const cert = certificationService.add(name, issuedBy, expiresAt ?? null);
  res.status(201).json({ data: cert });
};
