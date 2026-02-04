import { ContractStatus } from "./constants.js";
import { sanitizeString } from "./helpers.js";

export interface ContractInput {
  title?: string;
  agency?: string;
  status?: ContractStatus;
  value?: number;
  postedAt?: string;
  dueAt?: string;
  naicsCodes?: string[];
  setAside?: string;
  summary?: string;
}

export interface ContractScore {
  score: number;
  signals: string[];
}

export const normalizeContract = (input: ContractInput): ContractInput => {
  return {
    title: sanitizeString(input.title),
    agency: sanitizeString(input.agency),
    status: input.status ?? "active",
    value: input.value ?? 0,
    postedAt: input.postedAt,
    dueAt: input.dueAt,
    naicsCodes: input.naicsCodes ?? [],
    setAside: sanitizeString(input.setAside),
    summary: sanitizeString(input.summary)
  };
};

export const scoreContract = (contract: ContractInput, keywordSignals: string[]): ContractScore => {
  const signals: string[] = [];
  const haystack = [
    contract.title,
    contract.agency,
    contract.summary,
    contract.setAside
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  keywordSignals.forEach((signal) => {
    if (haystack.includes(signal.toLowerCase())) {
      signals.push(signal);
    }
  });

  const score = Math.min(1, signals.length / Math.max(1, keywordSignals.length));

  return {
    score,
    signals
  };
};

export const isDueSoon = (dueAt?: string, thresholdDays = 7): boolean => {
  if (!dueAt) return false;
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) return false;
  const msRemaining = dueDate.getTime() - Date.now();
  const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);
  return daysRemaining <= thresholdDays;
};
