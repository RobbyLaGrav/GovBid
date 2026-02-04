import { sanitizeString } from "../../utils/helpers.js";

export interface Capability {
  id: string;
  label: string;
  category: string;
  description?: string;
}

const defaultCapabilities: Capability[] = [
  { id: "cloud-migration", label: "Cloud Migration", category: "IT Services", description: "Lift-and-shift and modernization." },
  { id: "cyber-assess", label: "Cybersecurity Assessment", category: "Security", description: "Risk assessments and remediation." },
  { id: "pm", label: "Program Management", category: "Operations", description: "Schedule and stakeholder management." }
];

export class CapabilitiesService {
  private capabilities: Capability[];

  constructor(seed?: Capability[]) {
    this.capabilities = seed ? [...seed] : [...defaultCapabilities];
  }

  list(): Capability[] {
    return this.capabilities.map((item) => ({ ...item }));
  }

  add(label: string, category: string, description?: string): Capability {
    const capability: Capability = {
      id: `cap_${this.capabilities.length + 1}`,
      label: sanitizeString(label) ?? label,
      category: sanitizeString(category) ?? category,
      description: sanitizeString(description)
    };
    this.capabilities.push(capability);
    return capability;
  }
}
