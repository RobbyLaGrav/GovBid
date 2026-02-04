export type SamOpportunityStatus = "active" | "archived" | "forecasted" | "unknown";

export interface SamOpportunityRaw {
  noticeId?: string;
  title?: string;
  solicitationNumber?: string;
  noticeType?: string;
  responseDate?: string;
  publishDate?: string;
  archiveDate?: string;
  agency?: string;
  office?: string;
  classificationCode?: string;
  naics?: string | string[];
  setAside?: string;
  placeOfPerformance?: {
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  description?: string;
  uiLink?: string;
  type?: string;
  baseType?: string;
  [key: string]: unknown;
}

export interface SamOpportunity {
  source: "sam.gov";
  externalId: string;
  title: string;
  solicitationNumber?: string;
  status: SamOpportunityStatus;
  noticeType?: string;
  responseDeadline?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
  agency?: string;
  office?: string;
  classificationCode?: string;
  naicsCodes: string[];
  setAside?: string;
  placeOfPerformance?: string;
  summary?: string;
  url?: string;
  raw: SamOpportunityRaw;
}

const cleanText = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toIsoDate = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const normalizeNaics = (value?: string | string[]): string[] => {
  if (!value) return [];
  const list = Array.isArray(value) ? value : value.split(/[,\s]+/g);
  return list
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .filter((item, index, self) => self.indexOf(item) === index);
};

const normalizeStatus = (raw: SamOpportunityRaw): SamOpportunityStatus => {
  const type = cleanText(raw.type)?.toLowerCase();
  const baseType = cleanText(raw.baseType)?.toLowerCase();
  const noticeType = cleanText(raw.noticeType)?.toLowerCase();

  if (type?.includes("forecast") || baseType?.includes("forecast")) {
    return "forecasted";
  }
  if (noticeType?.includes("archive") || cleanText(raw.archiveDate)) {
    return "archived";
  }
  if (type || noticeType) {
    return "active";
  }
  return "unknown";
};

const normalizePlaceOfPerformance = (raw?: SamOpportunityRaw["placeOfPerformance"]): string | undefined => {
  if (!raw) return undefined;
  const parts = [
    cleanText(raw.city),
    cleanText(raw.state),
    cleanText(raw.zip),
    cleanText(raw.country)
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(", ") : undefined;
};

const normalizeSummary = (value?: string): string | undefined => {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const parseSamOpportunity = (raw: SamOpportunityRaw): SamOpportunity | null => {
  const externalId = cleanText(raw.noticeId) ?? cleanText(raw.solicitationNumber);
  const title = cleanText(raw.title);

  if (!externalId || !title) {
    return null;
  }

  return {
    source: "sam.gov",
    externalId,
    title,
    solicitationNumber: cleanText(raw.solicitationNumber),
    status: normalizeStatus(raw),
    noticeType: cleanText(raw.noticeType),
    responseDeadline: toIsoDate(raw.responseDate),
    publishedAt: toIsoDate(raw.publishDate),
    archivedAt: toIsoDate(raw.archiveDate),
    agency: cleanText(raw.agency),
    office: cleanText(raw.office),
    classificationCode: cleanText(raw.classificationCode),
    naicsCodes: normalizeNaics(raw.naics),
    setAside: cleanText(raw.setAside),
    placeOfPerformance: normalizePlaceOfPerformance(raw.placeOfPerformance),
    summary: normalizeSummary(raw.description),
    url: cleanText(raw.uiLink),
    raw
  };
};

export interface SamSearchResponse {
  opportunities: SamOpportunity[];
  page: number;
  pageSize: number;
  total: number;
  fetchedAt: string;
}

export const parseSamSearchResponse = (payload: unknown): SamSearchResponse => {
  const data = payload as {
    page?: number;
    size?: number;
    total?: number;
    opportunities?: SamOpportunityRaw[];
  };

  const opportunities = Array.isArray(data?.opportunities)
    ? data.opportunities.map(parseSamOpportunity).filter(Boolean) as SamOpportunity[]
    : [];

  return {
    opportunities,
    page: typeof data.page === "number" ? data.page : 1,
    pageSize: typeof data.size === "number" ? data.size : opportunities.length,
    total: typeof data.total === "number" ? data.total : opportunities.length,
    fetchedAt: new Date().toISOString()
  };
};
