import { ContractRecord } from "../../types/contract.types.js";
import { ContractStatus } from "../../utils/constants.js";
import { sanitizeString } from "../../utils/helpers.js";

export interface UsaSpendingFilter {
  agency?: string;
  naics?: string[];
  minValue?: number;
  maxValue?: number;
  keyword?: string;
}

const sampleContracts: ContractRecord[] = [
  {
    id: "usaspending-1",
    externalId: "AS-2024-001",
    title: "Energy Efficiency Modernization",
    agency: "Department of Energy",
    status: "active",
    value: 4200000,
    postedAt: "2024-05-01T00:00:00.000Z",
    dueAt: "2024-06-15T00:00:00.000Z",
    naicsCodes: ["541330"],
    setAside: "Small Business",
    summary: "Modernize facility energy systems across three regions.",
    location: "Washington, DC",
    source: "usaspending",
    createdAt: "2024-05-01T00:00:00.000Z",
    updatedAt: "2024-05-10T00:00:00.000Z"
  },
  {
    id: "usaspending-2",
    externalId: "AS-2024-002",
    title: "Cybersecurity Risk Assessment",
    agency: "Department of Health",
    status: "forecasted",
    value: 950000,
    postedAt: "2024-04-20T00:00:00.000Z",
    dueAt: "2024-07-01T00:00:00.000Z",
    naicsCodes: ["541512"],
    setAside: "8(a)",
    summary: "Assess enterprise cyber posture and recommend remediation.",
    location: "Atlanta, GA",
    source: "usaspending",
    createdAt: "2024-04-20T00:00:00.000Z",
    updatedAt: "2024-04-22T00:00:00.000Z"
  }
];

const matchesFilter = (contract: ContractRecord, filter?: UsaSpendingFilter): boolean => {
  if (!filter) return true;
  if (filter.agency && contract.agency?.toLowerCase() !== filter.agency.toLowerCase()) {
    return false;
  }
  if (filter.naics && filter.naics.length > 0) {
    const hasNaics = contract.naicsCodes?.some((code) => filter.naics?.includes(code));
    if (!hasNaics) return false;
  }
  if (filter.minValue && (contract.value ?? 0) < filter.minValue) return false;
  if (filter.maxValue && (contract.value ?? 0) > filter.maxValue) return false;
  if (filter.keyword) {
    const text = `${contract.title} ${contract.summary ?? ""}`.toLowerCase();
    if (!text.includes(filter.keyword.toLowerCase())) return false;
  }
  return true;
};

export class UsaSpendingService {
  private contracts: ContractRecord[];

  constructor(seed?: ContractRecord[]) {
    this.contracts = seed ? [...seed] : [...sampleContracts];
  }

  list(filter?: UsaSpendingFilter): ContractRecord[] {
    return this.contracts.filter((contract) => matchesFilter(contract, filter));
  }

  findById(id: string): ContractRecord | undefined {
    return this.contracts.find((contract) => contract.id === id);
  }

  add(contract: ContractRecord): ContractRecord {
    const sanitized: ContractRecord = {
      ...contract,
      title: sanitizeString(contract.title) ?? contract.title,
      agency: sanitizeString(contract.agency),
      status: (contract.status ?? "active") as ContractStatus,
      summary: sanitizeString(contract.summary),
      updatedAt: new Date().toISOString()
    };
    this.contracts.push(sanitized);
    return sanitized;
  }
}
