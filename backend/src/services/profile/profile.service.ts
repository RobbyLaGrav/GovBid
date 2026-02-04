import { sanitizeString } from "../../utils/helpers.js";

export interface BusinessProfileInput {
  companyName?: string;
  tagline?: string;
  website?: string;
  location?: string;
  naicsCodes?: string[];
  capabilities?: string[];
  certifications?: string[];
  summary?: string;
}

export interface BusinessProfileRecord {
  id: string;
  companyName: string;
  tagline?: string;
  website?: string;
  location?: string;
  naicsCodes: string[];
  capabilities: string[];
  certifications: string[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export class ProfileService {
  private profiles: BusinessProfileRecord[] = [];

  list(): BusinessProfileRecord[] {
    return [...this.profiles];
  }

  get(id: string): BusinessProfileRecord | undefined {
    return this.profiles.find((profile) => profile.id === id);
  }

  create(input: BusinessProfileInput): BusinessProfileRecord {
    const now = new Date().toISOString();
    const profile: BusinessProfileRecord = {
      id: `profile_${this.profiles.length + 1}`,
      companyName: sanitizeString(input.companyName) ?? "Unnamed Business",
      tagline: sanitizeString(input.tagline),
      website: sanitizeString(input.website),
      location: sanitizeString(input.location),
      naicsCodes: input.naicsCodes ?? [],
      capabilities: input.capabilities ?? [],
      certifications: input.certifications ?? [],
      summary: sanitizeString(input.summary),
      createdAt: now,
      updatedAt: now
    };
    this.profiles.push(profile);
    return profile;
  }

  update(id: string, input: BusinessProfileInput): BusinessProfileRecord | undefined {
    const profile = this.get(id);
    if (!profile) return undefined;
    profile.companyName = sanitizeString(input.companyName) ?? profile.companyName;
    profile.tagline = sanitizeString(input.tagline) ?? profile.tagline;
    profile.website = sanitizeString(input.website) ?? profile.website;
    profile.location = sanitizeString(input.location) ?? profile.location;
    profile.naicsCodes = input.naicsCodes ?? profile.naicsCodes;
    profile.capabilities = input.capabilities ?? profile.capabilities;
    profile.certifications = input.certifications ?? profile.certifications;
    profile.summary = sanitizeString(input.summary) ?? profile.summary;
    profile.updatedAt = new Date().toISOString();
    return profile;
  }
}
