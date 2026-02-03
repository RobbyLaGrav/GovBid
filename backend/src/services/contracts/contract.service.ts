// =============================================================================
// GovBid Pro - Contract Service
// =============================================================================
// Core contract management: CRUD, search, filtering, and analytics
// =============================================================================

import { prisma, cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from '../../config';
import type { Prisma, Contract, SavedContract, ContractStatus } from '@prisma/client';
import type {
  ContractSearchFilters,
  ContractSearchResult,
  ContractFacets,
  FacetItem,
  PaginationParams,
  PaginatedResponse,
  ContractStatistics,
  BidDecision,
} from '../../../../shared/types/contract.types';

// =============================================================================
// TYPES
// =============================================================================

export interface ContractWithRelations extends Contract {
  requirements?: { id: string; requirement: string; category: string | null; isMandatory: boolean }[];
  attachments?: { id: string; name: string; url: string; fileType: string | null }[];
  amendments?: { id: string; amendmentNumber: string; title: string | null; effectiveDate: Date | null }[];
  _count?: {
    requirements: number;
    attachments: number;
    amendments: number;
  };
}

export interface SavedContractWithContract extends SavedContract {
  contract: ContractWithRelations;
}

export interface CreateContractInput {
  sourceId: string;
  source: string;
  sourceUrl?: string;
  title: string;
  description?: string;
  synopsis?: string;
  solicitationNumber?: string;
  contractNumber?: string;
  contractType?: string;
  setAsideType?: string;
  naicsCode?: string;
  naicsDescription?: string;
  pscCode?: string;
  pscDescription?: string;
  agency?: string;
  subAgency?: string;
  office?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  placeOfPerformance?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  estimatedValue?: number;
  minValue?: number;
  maxValue?: number;
  postedDate?: Date;
  responseDeadline?: Date;
  qaDeadline?: Date;
  performanceStartDate?: Date;
  performanceEndDate?: Date;
  rawData?: Record<string, unknown>;
}

export interface UpdateContractInput {
  title?: string;
  description?: string;
  synopsis?: string;
  estimatedValue?: number;
  responseDeadline?: Date;
  isActive?: boolean;
  isCancelled?: boolean;
  aiSummary?: string;
  aiMatchScore?: number;
  aiKeyRequirements?: Record<string, unknown>;
  aiRecommendations?: Record<string, unknown>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CACHE_PREFIX = 'contract:';
const CACHE_TTL = 3600; // 1 hour
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// =============================================================================
// CONTRACT CRUD OPERATIONS
// =============================================================================

/**
 * Create a new contract
 */
export async function createContract(input: CreateContractInput): Promise<Contract> {
  const contract = await prisma.contract.create({
    data: {
      sourceId: input.sourceId,
      source: input.source,
      sourceUrl: input.sourceUrl,
      title: input.title,
      description: input.description,
      synopsis: input.synopsis,
      solicitationNumber: input.solicitationNumber,
      contractNumber: input.contractNumber,
      contractType: (input.contractType as Prisma.EnumContractTypeFieldUpdateOperationsInput['set']) || 'FEDERAL',
      setAsideType: (input.setAsideType as Prisma.EnumSetAsideTypeFieldUpdateOperationsInput['set']) || 'NONE',
      naicsCode: input.naicsCode,
      naicsDescription: input.naicsDescription,
      pscCode: input.pscCode,
      pscDescription: input.pscDescription,
      agency: input.agency,
      subAgency: input.subAgency,
      office: input.office,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      placeOfPerformance: input.placeOfPerformance,
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
      country: input.country || 'USA',
      estimatedValue: input.estimatedValue,
      minValue: input.minValue,
      maxValue: input.maxValue,
      postedDate: input.postedDate,
      responseDeadline: input.responseDeadline,
      qaDeadline: input.qaDeadline,
      performanceStartDate: input.performanceStartDate,
      performanceEndDate: input.performanceEndDate,
      rawData: input.rawData as Prisma.InputJsonValue,
      isActive: true,
      isCancelled: false,
    },
  });

  return contract;
}

/**
 * Get contract by ID
 */
export async function getContractById(
  contractId: string,
  includeRelations: boolean = false
): Promise<ContractWithRelations | null> {
  // Try cache first
  const cacheKey = `${CACHE_PREFIX}${contractId}`;
  const cached = await cacheGet<ContractWithRelations>(cacheKey);
  if (cached && !includeRelations) {
    return cached;
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: includeRelations
      ? {
          requirements: {
            select: {
              id: true,
              requirement: true,
              category: true,
              isMandatory: true,
            },
            orderBy: { priority: 'desc' },
          },
          attachments: {
            select: {
              id: true,
              name: true,
              url: true,
              fileType: true,
            },
          },
          amendments: {
            select: {
              id: true,
              amendmentNumber: true,
              title: true,
              effectiveDate: true,
            },
            orderBy: { effectiveDate: 'desc' },
          },
          _count: {
            select: {
              requirements: true,
              attachments: true,
              amendments: true,
            },
          },
        }
      : undefined,
  });

  if (contract && !includeRelations) {
    await cacheSet(cacheKey, contract, { ttl: CACHE_TTL });
  }

  return contract;
}

/**
 * Get contract by source ID
 */
export async function getContractBySourceId(
  sourceId: string,
  source: string
): Promise<Contract | null> {
  return prisma.contract.findUnique({
    where: {
      sourceId_source: { sourceId, source },
    },
  });
}

/**
 * Update contract
 */
export async function updateContract(
  contractId: string,
  input: UpdateContractInput
): Promise<Contract> {
  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: {
      ...input,
      aiKeyRequirements: input.aiKeyRequirements as Prisma.InputJsonValue,
      aiRecommendations: input.aiRecommendations as Prisma.InputJsonValue,
      lastAnalyzedAt: input.aiSummary ? new Date() : undefined,
    },
  });

  // Invalidate cache
  await cacheDelete(`${CACHE_PREFIX}${contractId}`);

  return contract;
}

/**
 * Delete contract
 */
export async function deleteContract(contractId: string): Promise<void> {
  await prisma.contract.delete({
    where: { id: contractId },
  });

  await cacheDelete(`${CACHE_PREFIX}${contractId}`);
}

/**
 * Upsert contract (create or update based on source ID)
 */
export async function upsertContract(input: CreateContractInput): Promise<Contract> {
  const existing = await getContractBySourceId(input.sourceId, input.source);

  if (existing) {
    return updateContract(existing.id, {
      title: input.title,
      description: input.description,
      synopsis: input.synopsis,
      estimatedValue: input.estimatedValue,
      responseDeadline: input.responseDeadline,
    });
  }

  return createContract(input);
}

// =============================================================================
// CONTRACT SEARCH
// =============================================================================

/**
 * Search contracts with filters and pagination
 */
export async function searchContracts(
  filters: ContractSearchFilters,
  pagination: PaginationParams
): Promise<ContractSearchResult> {
  const startTime = Date.now();

  // Build where clause
  const where = buildWhereClause(filters);

  // Validate pagination
  const page = Math.max(1, pagination.page);
  const limit = Math.min(Math.max(1, pagination.limit), MAX_PAGE_SIZE);
  const skip = (page - 1) * limit;

  // Build order by
  const orderBy = buildOrderBy(pagination.sortBy, pagination.sortOrder);

  // Execute queries in parallel
  const [contracts, total, facets] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            requirements: true,
            attachments: true,
          },
        },
      },
    }),
    prisma.contract.count({ where }),
    buildFacets(filters),
  ]);

  const totalPages = Math.ceil(total / limit);
  const searchTimeMs = Date.now() - startTime;

  return {
    contracts,
    facets,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    searchMetadata: {
      query: filters.query,
      totalMatches: total,
      searchTimeMs,
      appliedFilters: filters,
    },
  };
}

/**
 * Build Prisma where clause from filters
 */
function buildWhereClause(filters: ContractSearchFilters): Prisma.ContractWhereInput {
  const where: Prisma.ContractWhereInput = {};
  const AND: Prisma.ContractWhereInput[] = [];

  // Text search
  if (filters.query) {
    const searchFields = filters.searchIn || ['title', 'description', 'synopsis'];
    const OR: Prisma.ContractWhereInput[] = [];

    if (searchFields.includes('title')) {
      OR.push({ title: { contains: filters.query, mode: 'insensitive' } });
    }
    if (searchFields.includes('description')) {
      OR.push({ description: { contains: filters.query, mode: 'insensitive' } });
    }
    if (searchFields.includes('synopsis')) {
      OR.push({ synopsis: { contains: filters.query, mode: 'insensitive' } });
    }
    if (searchFields.includes('requirements')) {
      OR.push({
        requirements: {
          some: { requirement: { contains: filters.query, mode: 'insensitive' } },
        },
      });
    }

    if (OR.length > 0) {
      AND.push({ OR });
    }
  }

  // Contract types
  if (filters.contractTypes && filters.contractTypes.length > 0) {
    AND.push({ contractType: { in: filters.contractTypes as Prisma.EnumContractTypeFilter['in'] } });
  }

  // Set-aside types
  if (filters.setAsideTypes && filters.setAsideTypes.length > 0) {
    AND.push({ setAsideType: { in: filters.setAsideTypes as Prisma.EnumSetAsideTypeFilter['in'] } });
  }

  // NAICS codes
  if (filters.naicsCodes && filters.naicsCodes.length > 0) {
    AND.push({ naicsCode: { in: filters.naicsCodes } });
  }

  // PSC codes
  if (filters.pscCodes && filters.pscCodes.length > 0) {
    AND.push({ pscCode: { in: filters.pscCodes } });
  }

  // Sources
  if (filters.sources && filters.sources.length > 0) {
    AND.push({ source: { in: filters.sources as string[] } });
  }

  // Agencies
  if (filters.agencies && filters.agencies.length > 0) {
    AND.push({ agency: { in: filters.agencies } });
  }

  // States
  if (filters.states && filters.states.length > 0) {
    AND.push({ state: { in: filters.states } });
  }

  // Value range
  if (filters.minValue !== undefined) {
    AND.push({ estimatedValue: { gte: filters.minValue } });
  }
  if (filters.maxValue !== undefined) {
    AND.push({ estimatedValue: { lte: filters.maxValue } });
  }

  // Date filters
  if (filters.postedAfter) {
    AND.push({ postedDate: { gte: new Date(filters.postedAfter) } });
  }
  if (filters.postedBefore) {
    AND.push({ postedDate: { lte: new Date(filters.postedBefore) } });
  }
  if (filters.deadlineAfter) {
    AND.push({ responseDeadline: { gte: new Date(filters.deadlineAfter) } });
  }
  if (filters.deadlineBefore) {
    AND.push({ responseDeadline: { lte: new Date(filters.deadlineBefore) } });
  }

  // Status filters
  if (filters.isActive !== undefined) {
    AND.push({ isActive: filters.isActive });
  }
  if (filters.excludeCancelled) {
    AND.push({ isCancelled: false });
  }

  // Match score filter
  if (filters.minMatchScore !== undefined) {
    AND.push({ aiMatchScore: { gte: filters.minMatchScore } });
  }

  if (AND.length > 0) {
    where.AND = AND;
  }

  return where;
}

/**
 * Build order by clause
 */
function buildOrderBy(
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Prisma.ContractOrderByWithRelationInput[] {
  const order = sortOrder || 'desc';

  switch (sortBy) {
    case 'title':
      return [{ title: order }];
    case 'postedDate':
      return [{ postedDate: order }];
    case 'responseDeadline':
      return [{ responseDeadline: order }];
    case 'estimatedValue':
      return [{ estimatedValue: order }];
    case 'agency':
      return [{ agency: order }];
    case 'matchScore':
      return [{ aiMatchScore: order }];
    default:
      return [{ postedDate: 'desc' }, { createdAt: 'desc' }];
  }
}

/**
 * Build search facets
 */
async function buildFacets(filters: ContractSearchFilters): Promise<ContractFacets> {
  // Base where clause without certain filters for facet counting
  const baseWhere = buildWhereClause({
    ...filters,
    contractTypes: undefined,
    setAsideTypes: undefined,
    agencies: undefined,
    states: undefined,
    naicsCodes: undefined,
  });

  const [contractTypes, setAsideTypes, agencies, states, naicsCodes, sources] = await Promise.all([
    prisma.contract.groupBy({
      by: ['contractType'],
      where: baseWhere,
      _count: true,
    }),
    prisma.contract.groupBy({
      by: ['setAsideType'],
      where: baseWhere,
      _count: true,
    }),
    prisma.contract.groupBy({
      by: ['agency'],
      where: { ...baseWhere, agency: { not: null } },
      _count: true,
      orderBy: { _count: { agency: 'desc' } },
      take: 20,
    }),
    prisma.contract.groupBy({
      by: ['state'],
      where: { ...baseWhere, state: { not: null } },
      _count: true,
      orderBy: { _count: { state: 'desc' } },
      take: 20,
    }),
    prisma.contract.groupBy({
      by: ['naicsCode'],
      where: { ...baseWhere, naicsCode: { not: null } },
      _count: true,
      orderBy: { _count: { naicsCode: 'desc' } },
      take: 20,
    }),
    prisma.contract.groupBy({
      by: ['source'],
      where: baseWhere,
      _count: true,
    }),
  ]);

  return {
    contractTypes: contractTypes.map((item) => ({
      value: item.contractType,
      label: formatLabel(item.contractType),
      count: item._count,
    })),
    setAsideTypes: setAsideTypes.map((item) => ({
      value: item.setAsideType,
      label: formatSetAsideLabel(item.setAsideType),
      count: item._count,
    })),
    agencies: agencies
      .filter((item) => item.agency)
      .map((item) => ({
        value: item.agency!,
        label: item.agency!,
        count: item._count,
      })),
    states: states
      .filter((item) => item.state)
      .map((item) => ({
        value: item.state!,
        label: item.state!,
        count: item._count,
      })),
    naicsCodes: naicsCodes
      .filter((item) => item.naicsCode)
      .map((item) => ({
        value: item.naicsCode!,
        label: item.naicsCode!,
        count: item._count,
      })),
    valueRanges: [], // Can be computed separately if needed
    sources: sources.map((item) => ({
      value: item.source,
      label: formatSourceLabel(item.source),
      count: item._count,
    })),
  };
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSetAsideLabel(value: string): string {
  const labels: Record<string, string> = {
    NONE: 'No Set-Aside',
    SMALL_BUSINESS: 'Small Business',
    WOSB: 'Women-Owned Small Business',
    EDWOSB: 'Economically Disadvantaged WOSB',
    SDVOSB: 'Service-Disabled Veteran-Owned',
    HUBZONE: 'HUBZone',
    EIGHT_A: '8(a) Program',
    VETERAN_OWNED: 'Veteran-Owned',
    MINORITY_OWNED: 'Minority-Owned',
  };
  return labels[value] || formatLabel(value);
}

function formatSourceLabel(value: string): string {
  const labels: Record<string, string> = {
    SAM_GOV: 'SAM.gov',
    STATE_PORTAL: 'State Portal',
    LOCAL_PORTAL: 'Local Portal',
    COMMERCIAL: 'Commercial',
    MANUAL: 'Manual Entry',
  };
  return labels[value] || value;
}

// =============================================================================
// SAVED CONTRACTS
// =============================================================================

/**
 * Save a contract for an organization
 */
export async function saveContract(
  contractId: string,
  organizationId: string,
  userId: string,
  data?: {
    status?: ContractStatus;
    notes?: string;
    tags?: string[];
    priority?: number;
    matchScore?: number;
  }
): Promise<SavedContract> {
  const savedContract = await prisma.savedContract.upsert({
    where: {
      contractId_organizationId: { contractId, organizationId },
    },
    create: {
      contractId,
      organizationId,
      userId,
      status: data?.status || 'DISCOVERED',
      notes: data?.notes,
      tags: data?.tags || [],
      priority: data?.priority || 0,
      matchScore: data?.matchScore,
    },
    update: {
      status: data?.status,
      notes: data?.notes,
      tags: data?.tags,
      priority: data?.priority,
      matchScore: data?.matchScore,
    },
  });

  return savedContract;
}

/**
 * Get saved contracts for an organization
 */
export async function getSavedContracts(
  organizationId: string,
  filters: {
    status?: ContractStatus[];
    tags?: string[];
    priority?: number;
    bidDecision?: BidDecision;
  },
  pagination: PaginationParams
): Promise<PaginatedResponse<SavedContractWithContract>> {
  const where: Prisma.SavedContractWhereInput = {
    organizationId,
  };

  if (filters.status && filters.status.length > 0) {
    where.status = { in: filters.status };
  }
  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags };
  }
  if (filters.priority !== undefined) {
    where.priority = filters.priority;
  }
  if (filters.bidDecision) {
    where.bidDecision = filters.bidDecision;
  }

  const page = Math.max(1, pagination.page);
  const limit = Math.min(Math.max(1, pagination.limit), MAX_PAGE_SIZE);
  const skip = (page - 1) * limit;

  const [savedContracts, total] = await Promise.all([
    prisma.savedContract.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      include: {
        contract: {
          include: {
            _count: {
              select: {
                requirements: true,
                attachments: true,
              },
            },
          },
        },
      },
    }),
    prisma.savedContract.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: savedContracts as SavedContractWithContract[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Update saved contract
 */
export async function updateSavedContract(
  savedContractId: string,
  organizationId: string,
  data: {
    status?: ContractStatus;
    notes?: string;
    tags?: string[];
    priority?: number;
    bidDecision?: BidDecision;
    bidDecisionReason?: string;
  }
): Promise<SavedContract> {
  return prisma.savedContract.update({
    where: {
      id: savedContractId,
      organizationId, // Ensure organization owns this
    },
    data: {
      ...data,
      bidDecisionAt: data.bidDecision ? new Date() : undefined,
    },
  });
}

/**
 * Remove saved contract
 */
export async function removeSavedContract(
  savedContractId: string,
  organizationId: string
): Promise<void> {
  await prisma.savedContract.delete({
    where: {
      id: savedContractId,
      organizationId,
    },
  });
}

/**
 * Check if contract is saved by organization
 */
export async function isContractSaved(
  contractId: string,
  organizationId: string
): Promise<boolean> {
  const saved = await prisma.savedContract.findUnique({
    where: {
      contractId_organizationId: { contractId, organizationId },
    },
    select: { id: true },
  });
  return !!saved;
}

// =============================================================================
// CONTRACT STATISTICS
// =============================================================================

/**
 * Get contract statistics for an organization
 */
export async function getContractStatistics(
  organizationId: string
): Promise<ContractStatistics> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const today = new Date(now.setHours(0, 0, 0, 0));
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalContracts,
    activeContracts,
    byStatus,
    byType,
    bySetAside,
    valueStats,
    upcomingDeadlines,
    recentActivity,
  ] = await Promise.all([
    prisma.contract.count(),
    prisma.contract.count({ where: { isActive: true, isCancelled: false } }),
    prisma.savedContract.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    }),
    prisma.contract.groupBy({
      by: ['contractType'],
      where: { isActive: true },
      _count: true,
    }),
    prisma.contract.groupBy({
      by: ['setAsideType'],
      where: { isActive: true },
      _count: true,
    }),
    prisma.contract.aggregate({
      where: { isActive: true, estimatedValue: { not: null } },
      _sum: { estimatedValue: true },
      _avg: { estimatedValue: true },
      _min: { estimatedValue: true },
      _max: { estimatedValue: true },
    }),
    Promise.all([
      prisma.contract.count({
        where: {
          isActive: true,
          responseDeadline: { gte: now, lte: sevenDaysFromNow },
        },
      }),
      prisma.contract.count({
        where: {
          isActive: true,
          responseDeadline: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      prisma.contract.count({
        where: {
          isActive: true,
          responseDeadline: { gte: now, lte: ninetyDaysFromNow },
        },
      }),
    ]),
    Promise.all([
      prisma.contract.count({
        where: { postedDate: { gte: today } },
      }),
      prisma.contract.count({
        where: { postedDate: { gte: weekAgo } },
      }),
      prisma.contract.count({
        where: { postedDate: { gte: monthAgo } },
      }),
    ]),
  ]);

  // Convert grouped results to records
  const statusRecord: Record<string, number> = {};
  byStatus.forEach((item) => {
    statusRecord[item.status] = item._count;
  });

  const typeRecord: Record<string, number> = {};
  byType.forEach((item) => {
    typeRecord[item.contractType] = item._count;
  });

  const setAsideRecord: Record<string, number> = {};
  bySetAside.forEach((item) => {
    setAsideRecord[item.setAsideType] = item._count;
  });

  return {
    totalContracts,
    activeContracts,
    byStatus: statusRecord as Record<ContractStatus, number>,
    byType: typeRecord as Record<string, number>,
    bySetAside: setAsideRecord as Record<string, number>,
    valueStats: {
      total: Number(valueStats._sum.estimatedValue) || 0,
      average: Number(valueStats._avg.estimatedValue) || 0,
      median: 0, // Would need separate query
      min: Number(valueStats._min.estimatedValue) || 0,
      max: Number(valueStats._max.estimatedValue) || 0,
    },
    upcomingDeadlines: {
      next7Days: upcomingDeadlines[0],
      next30Days: upcomingDeadlines[1],
      next90Days: upcomingDeadlines[2],
    },
    recentActivity: {
      newToday: recentActivity[0],
      newThisWeek: recentActivity[1],
      newThisMonth: recentActivity[2],
    },
  };
}

// =============================================================================
// CONTRACT REQUIREMENTS
// =============================================================================

/**
 * Add requirements to a contract
 */
export async function addContractRequirements(
  contractId: string,
  requirements: {
    category?: string;
    requirement: string;
    isMandatory?: boolean;
    priority?: number;
    confidence?: number;
    sourceSection?: string;
  }[]
): Promise<number> {
  const result = await prisma.contractRequirement.createMany({
    data: requirements.map((req) => ({
      contractId,
      category: req.category,
      requirement: req.requirement,
      isMandatory: req.isMandatory ?? true,
      priority: req.priority ?? 0,
      confidence: req.confidence,
      sourceSection: req.sourceSection,
    })),
  });

  return result.count;
}

/**
 * Get requirements for a contract
 */
export async function getContractRequirements(contractId: string) {
  return prisma.contractRequirement.findMany({
    where: { contractId },
    orderBy: [{ isMandatory: 'desc' }, { priority: 'desc' }],
  });
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk update saved contracts
 */
export async function bulkUpdateSavedContracts(
  organizationId: string,
  contractIds: string[],
  data: {
    status?: ContractStatus;
    tags?: string[];
    priority?: number;
  }
): Promise<number> {
  const result = await prisma.savedContract.updateMany({
    where: {
      organizationId,
      contractId: { in: contractIds },
    },
    data,
  });

  return result.count;
}

/**
 * Bulk delete saved contracts
 */
export async function bulkRemoveSavedContracts(
  organizationId: string,
  contractIds: string[]
): Promise<number> {
  const result = await prisma.savedContract.deleteMany({
    where: {
      organizationId,
      contractId: { in: contractIds },
    },
  });

  return result.count;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // CRUD
  createContract,
  getContractById,
  getContractBySourceId,
  updateContract,
  deleteContract,
  upsertContract,

  // Search
  searchContracts,

  // Saved contracts
  saveContract,
  getSavedContracts,
  updateSavedContract,
  removeSavedContract,
  isContractSaved,

  // Statistics
  getContractStatistics,

  // Requirements
  addContractRequirements,
  getContractRequirements,

  // Bulk operations
  bulkUpdateSavedContracts,
  bulkRemoveSavedContracts,
};
