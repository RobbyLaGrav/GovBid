import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./constants.js";

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const toNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return fallback;
};

export const sanitizeString = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const buildPagination = (params: PaginationParams, total: number): PaginationMeta => {
  const page = clamp(toNumber(params.page, 1), 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clamp(toNumber(params.pageSize, DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages
  };
};

export const pick = <T extends Record<string, unknown>, K extends keyof T>(source: T, keys: K[]): Pick<T, K> => {
  return keys.reduce((acc, key) => {
    if (key in source) {
      acc[key] = source[key];
    }
    return acc;
  }, {} as Pick<T, K>);
};

export const uniqueBy = <T>(items: T[], getKey: (item: T) => string): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  items.forEach((item) => {
    const key = getKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  });
  return result;
};

export const groupBy = <T>(items: T[], getKey: (item: T) => string): Record<string, T[]> => {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
};

export const delay = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
