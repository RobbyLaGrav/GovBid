import { sanitizeString } from "../../utils/helpers.js";

export interface Certification {
  id: string;
  name: string;
  issuedBy: string;
  expiresAt?: string | null;
}

const defaultCertifications: Certification[] = [
  { id: "8a", name: "8(a) Business Development", issuedBy: "SBA" },
  { id: "hubzone", name: "HUBZone Certified", issuedBy: "SBA" },
  { id: "wosb", name: "Women-Owned Small Business", issuedBy: "SBA" }
];

export class CertificationService {
  private certifications: Certification[];

  constructor(seed?: Certification[]) {
    this.certifications = seed ? [...seed] : [...defaultCertifications];
  }

  list(): Certification[] {
    return this.certifications.map((item) => ({ ...item }));
  }

  add(name: string, issuedBy: string, expiresAt?: string | null): Certification {
    const cert: Certification = {
      id: `cert_${this.certifications.length + 1}`,
      name: sanitizeString(name) ?? name,
      issuedBy: sanitizeString(issuedBy) ?? issuedBy,
      expiresAt
    };
    this.certifications.push(cert);
    return cert;
  }
}
