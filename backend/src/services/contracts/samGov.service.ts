// =============================================================================
// GovBid Pro - SAM.gov Service
// =============================================================================
// Integration with SAM.gov API for federal contract opportunities
// =============================================================================

import { cacheGet, cacheSet } from '../../config';
import contractService from './contract.service';
import type { CreateContractInput } from './contract.service';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SAM_GOV_API_KEY = process.env.SAM_GOV_API_KEY || '';
const SAM_GOV_BASE_URL = process.env.SAM_GOV_BASE_URL || 'https://api.sam.gov/opportunities/v2';

const CACHE_PREFIX = 'samgov:';
const CACHE_TTL = 900; // 15 minutes
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RESULTS_PER_PAGE = 100;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

// =============================================================================
// TYPES
// =============================================================================

export interface SAMGovSearchParams {
  // Search criteria
  keyword?: string;
  postedFrom?: string; // YYYY-MM-DD
  postedTo?: string;
  responseDeadlineFrom?: string;
  responseDeadlineTo?: string;

  // Filters
  naicsCode?: string | string[];
  pscCode?: string | string[];
  setAside?: string | string[];
  typeOfContractCode?: string | string[];

  // Location
  state?: string | string[];
  zipCode?: string;

  // Agency
  organizationId?: string;
  departmentName?: string;

  // Pagination
  offset?: number;
  limit?: number;

  // Sorting
  sortBy?: string;
}

export interface SAMGovOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber?: string;
  fullParentPathName?: string;
  fullParentPathCode?: string;
  postedDate?: string;
  type?: string;
  baseType?: string;
  archiveType?: string;
  archiveDate?: string;
  typeOfSetAsideDescription?: string;
  typeOfSetAside?: string;
  responseDeadLine?: string;
  naicsCode?: string;
  naicsCodes?: string[];
  classificationCode?: string;
  active?: string;
  award?: {
    date?: string;
    number?: string;
    amount?: number;
    awardee?: {
      name?: string;
      location?: {
        streetAddress?: string;
        city?: {
          name?: string;
          code?: string;
        };
        state?: {
          name?: string;
          code?: string;
        };
        zip?: string;
        country?: {
          name?: string;
          code?: string;
        };
      };
    };
  };
  pointOfContact?: SAMGovContact[];
  description?: string;
  organizationType?: string;
  officeAddress?: {
    zipcode?: string;
    city?: string;
    countryCode?: string;
    state?: string;
  };
  placeOfPerformance?: {
    streetAddress?: string;
    city?: {
      name?: string;
      code?: string;
    };
    state?: {
      name?: string;
      code?: string;
    };
    zip?: string;
    country?: {
      name?: string;
      code?: string;
    };
  };
  additionalInfoLink?: string;
  uiLink?: string;
  links?: SAMGovLink[];
  resourceLinks?: string[];
}

export interface SAMGovContact {
  fax?: string;
  type?: string;
  email?: string;
  phone?: string;
  title?: string;
  fullName?: string;
}

export interface SAMGovLink {
  rel?: string;
  href?: string;
}

export interface SAMGovSearchResponse {
  totalRecords: number;
  limit: number;
  offset: number;
  opportunitiesData: SAMGovOpportunity[];
}

export interface SyncResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate SAM.gov API key is configured
 */
function validateApiKey(): void {
  if (!SAM_GOV_API_KEY) {
    throw new Error('SAM_GOV_API_KEY is not configured');
  }
}

/**
 * Build query string from search params
 */
function buildQueryString(params: SAMGovSearchParams): string {
  const queryParams = new URLSearchParams();

  if (params.keyword) {
    queryParams.append('q', params.keyword);
  }
  if (params.postedFrom) {
    queryParams.append('postedFrom', params.postedFrom);
  }
  if (params.postedTo) {
    queryParams.append('postedTo', params.postedTo);
  }
  if (params.responseDeadlineFrom) {
    queryParams.append('rdlfrom', params.responseDeadlineFrom);
  }
  if (params.responseDeadlineTo) {
    queryParams.append('rdlto', params.responseDeadlineTo);
  }

  // Handle array parameters
  if (params.naicsCode) {
    const codes = Array.isArray(params.naicsCode) ? params.naicsCode : [params.naicsCode];
    codes.forEach((code) => queryParams.append('naics', code));
  }
  if (params.pscCode) {
    const codes = Array.isArray(params.pscCode) ? params.pscCode : [params.pscCode];
    codes.forEach((code) => queryParams.append('psc', code));
  }
  if (params.setAside) {
    const types = Array.isArray(params.setAside) ? params.setAside : [params.setAside];
    types.forEach((type) => queryParams.append('typeOfSetAside', type));
  }
  if (params.state) {
    const states = Array.isArray(params.state) ? params.state : [params.state];
    states.forEach((state) => queryParams.append('state', state));
  }

  if (params.organizationId) {
    queryParams.append('organizationId', params.organizationId);
  }
  if (params.departmentName) {
    queryParams.append('deptname', params.departmentName);
  }

  // Pagination
  queryParams.append('offset', String(params.offset || 0));
  queryParams.append('limit', String(Math.min(params.limit || 25, MAX_RESULTS_PER_PAGE)));

  // API key
  queryParams.append('api_key', SAM_GOV_API_KEY);

  return queryParams.toString();
}

/**
 * Make API request with timeout and retry
 */
async function makeRequest<T>(
  endpoint: string,
  retries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SAM.gov API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;
      console.error(`SAM.gov API request attempt ${attempt} failed:`, error);

      if (attempt < retries) {
        // Exponential backoff
        await delay(RATE_LIMIT_DELAY * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError || new Error('SAM.gov API request failed');
}

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Map SAM.gov set-aside type to our enum
 */
function mapSetAsideType(samType?: string): string {
  const mapping: Record<string, string> = {
    'SBA': 'SMALL_BUSINESS',
    'SBP': 'SMALL_BUSINESS',
    'WOSB': 'WOSB',
    'EDWOSB': 'EDWOSB',
    'SDVOSB': 'SDVOSB',
    'SDVOSBC': 'SDVOSB',
    'HZC': 'HUBZONE',
    'HZS': 'HUBZONE',
    '8A': 'EIGHT_A',
    '8AN': 'EIGHT_A',
    'VSA': 'VETERAN_OWNED',
    'VSB': 'VETERAN_OWNED',
  };

  return mapping[samType?.toUpperCase() || ''] || 'NONE';
}

/**
 * Parse date string from SAM.gov
 */
function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;

  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}

/**
 * Convert SAM.gov opportunity to our contract format
 */
function convertToContract(opportunity: SAMGovOpportunity): CreateContractInput {
  const primaryContact = opportunity.pointOfContact?.[0];
  const pop = opportunity.placeOfPerformance;

  return {
    sourceId: opportunity.noticeId,
    source: 'SAM_GOV',
    sourceUrl: opportunity.uiLink || `https://sam.gov/opp/${opportunity.noticeId}/view`,
    title: opportunity.title || 'Untitled Opportunity',
    description: opportunity.description,
    synopsis: opportunity.description?.slice(0, 1000),
    solicitationNumber: opportunity.solicitationNumber,
    contractType: 'FEDERAL',
    setAsideType: mapSetAsideType(opportunity.typeOfSetAside),
    naicsCode: opportunity.naicsCode || opportunity.naicsCodes?.[0],
    pscCode: opportunity.classificationCode,
    agency: opportunity.fullParentPathName?.split('.')[0],
    subAgency: opportunity.fullParentPathName?.split('.').slice(1).join(' > '),
    office: opportunity.fullParentPathName,
    contactName: primaryContact?.fullName,
    contactEmail: primaryContact?.email,
    contactPhone: primaryContact?.phone,
    placeOfPerformance: [
      pop?.city?.name,
      pop?.state?.code,
      pop?.country?.code,
    ]
      .filter(Boolean)
      .join(', '),
    city: pop?.city?.name,
    state: pop?.state?.code,
    zipCode: pop?.zip,
    country: pop?.country?.code || 'USA',
    estimatedValue: opportunity.award?.amount,
    postedDate: parseDate(opportunity.postedDate),
    responseDeadline: parseDate(opportunity.responseDeadLine),
    rawData: opportunity as unknown as Record<string, unknown>,
  };
}

// =============================================================================
// MAIN SERVICE FUNCTIONS
// =============================================================================

/**
 * Search SAM.gov opportunities
 */
export async function searchOpportunities(
  params: SAMGovSearchParams
): Promise<SAMGovSearchResponse> {
  validateApiKey();

  const cacheKey = `${CACHE_PREFIX}search:${JSON.stringify(params)}`;

  // Check cache
  const cached = await cacheGet<SAMGovSearchResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const queryString = buildQueryString(params);
  const endpoint = `${SAM_GOV_BASE_URL}/search?${queryString}`;

  const response = await makeRequest<SAMGovSearchResponse>(endpoint);

  // Cache results
  await cacheSet(cacheKey, response, { ttl: CACHE_TTL });

  return response;
}

/**
 * Get single opportunity by ID
 */
export async function getOpportunity(noticeId: string): Promise<SAMGovOpportunity | null> {
  validateApiKey();

  const cacheKey = `${CACHE_PREFIX}opportunity:${noticeId}`;

  // Check cache
  const cached = await cacheGet<SAMGovOpportunity>(cacheKey);
  if (cached) {
    return cached;
  }

  const endpoint = `${SAM_GOV_BASE_URL}/search?noticeid=${noticeId}&api_key=${SAM_GOV_API_KEY}`;

  try {
    const response = await makeRequest<SAMGovSearchResponse>(endpoint);
    const opportunity = response.opportunitiesData?.[0];

    if (opportunity) {
      await cacheSet(cacheKey, opportunity, { ttl: CACHE_TTL });
    }

    return opportunity || null;
  } catch (error) {
    console.error(`Failed to fetch opportunity ${noticeId}:`, error);
    return null;
  }
}

/**
 * Sync opportunities from SAM.gov to database
 */
export async function syncOpportunities(
  params: SAMGovSearchParams,
  options: {
    maxPages?: number;
    onProgress?: (progress: { page: number; total: number; processed: number }) => void;
  } = {}
): Promise<SyncResult> {
  validateApiKey();

  const result: SyncResult = {
    total: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  const maxPages = options.maxPages || 10;
  const pageSize = MAX_RESULTS_PER_PAGE;
  let offset = params.offset || 0;
  let totalRecords = 0;
  let page = 1;

  do {
    try {
      const response = await searchOpportunities({
        ...params,
        offset,
        limit: pageSize,
      });

      totalRecords = response.totalRecords;
      result.total = totalRecords;

      for (const opportunity of response.opportunitiesData) {
        try {
          const contractInput = convertToContract(opportunity);
          const existingContract = await contractService.getContractBySourceId(
            opportunity.noticeId,
            'SAM_GOV'
          );

          if (existingContract) {
            await contractService.updateContract(existingContract.id, {
              title: contractInput.title,
              description: contractInput.description,
              estimatedValue: contractInput.estimatedValue,
              responseDeadline: contractInput.responseDeadline,
            });
            result.updated++;
          } else {
            await contractService.createContract(contractInput);
            result.created++;
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to process ${opportunity.noticeId}: ${(error as Error).message}`);
        }
      }

      // Progress callback
      if (options.onProgress) {
        options.onProgress({
          page,
          total: Math.ceil(totalRecords / pageSize),
          processed: offset + response.opportunitiesData.length,
        });
      }

      offset += pageSize;
      page++;

      // Rate limiting
      await delay(RATE_LIMIT_DELAY);
    } catch (error) {
      result.errors.push(`Page ${page} failed: ${(error as Error).message}`);
      break;
    }
  } while (offset < totalRecords && page <= maxPages);

  return result;
}

/**
 * Sync recent opportunities (last N days)
 */
export async function syncRecentOpportunities(
  daysBack: number = 7,
  options?: {
    naicsCodes?: string[];
    states?: string[];
    maxPages?: number;
  }
): Promise<SyncResult> {
  const today = new Date();
  const fromDate = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const params: SAMGovSearchParams = {
    postedFrom: fromDate.toISOString().split('T')[0],
    postedTo: today.toISOString().split('T')[0],
    naicsCode: options?.naicsCodes,
    state: options?.states,
  };

  return syncOpportunities(params, { maxPages: options?.maxPages });
}

/**
 * Sync opportunities with active deadlines
 */
export async function syncActiveOpportunities(
  options?: {
    naicsCodes?: string[];
    states?: string[];
    maxPages?: number;
  }
): Promise<SyncResult> {
  const today = new Date();
  const futureDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days out

  const params: SAMGovSearchParams = {
    responseDeadlineFrom: today.toISOString().split('T')[0],
    responseDeadlineTo: futureDate.toISOString().split('T')[0],
    naicsCode: options?.naicsCodes,
    state: options?.states,
  };

  return syncOpportunities(params, { maxPages: options?.maxPages });
}

/**
 * Search and sync by keyword
 */
export async function syncByKeyword(
  keyword: string,
  options?: {
    naicsCodes?: string[];
    states?: string[];
    maxPages?: number;
  }
): Promise<SyncResult> {
  const params: SAMGovSearchParams = {
    keyword,
    naicsCode: options?.naicsCodes,
    state: options?.states,
  };

  return syncOpportunities(params, { maxPages: options?.maxPages });
}

/**
 * Get count of opportunities matching criteria
 */
export async function getOpportunityCount(params: SAMGovSearchParams): Promise<number> {
  const response = await searchOpportunities({
    ...params,
    limit: 1, // Just need the count
  });

  return response.totalRecords;
}

// =============================================================================
// SET-ASIDE TYPE CONSTANTS
// =============================================================================

export const SAM_GOV_SET_ASIDE_TYPES = {
  SBA: 'Total Small Business Set-Aside',
  SBP: 'Partial Small Business Set-Aside',
  '8A': '8(a) Set-Aside',
  '8AN': '8(a) Sole Source',
  HZC: 'HUBZone Set-Aside',
  HZS: 'HUBZone Sole Source',
  SDVOSBC: 'SDVOSB Set-Aside',
  SDVOSBS: 'SDVOSB Sole Source',
  WOSB: 'WOSB Set-Aside',
  WOSBSS: 'WOSB Sole Source',
  EDWOSB: 'EDWOSB Set-Aside',
  EDWOSBSS: 'EDWOSB Sole Source',
  VSA: 'VOSB Set-Aside',
  VSB: 'VOSB Sole Source',
  IEE: 'Indian Economic Enterprise',
  ISBEE: 'Indian Small Business Economic Enterprise',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  searchOpportunities,
  getOpportunity,
  syncOpportunities,
  syncRecentOpportunities,
  syncActiveOpportunities,
  syncByKeyword,
  getOpportunityCount,
  SAM_GOV_SET_ASIDE_TYPES,
};
