import { ContractStatus } from "../utils/constants.js";

export interface ContractRecord {
  id: string;
  externalId?: string;
  title: string;
  agency?: string;
  status: ContractStatus;
  value?: number;
  postedAt?: string | null;
  dueAt?: string | null;
  naicsCodes?: string[];
  setAside?: string;
  summary?: string;
  location?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractSearchFilters {
  agency?: string;
  status?: ContractStatus;
  naics?: string[];
  setAside?: string;
  dueBefore?: string;
  dueAfter?: string;
  minValue?: number;
  maxValue?: number;
}
