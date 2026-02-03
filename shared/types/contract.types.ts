// =============================================================================
// GovBid Pro - Contract TypeScript Types
// =============================================================================
// Shared type definitions for contracts used across frontend and backend
// =============================================================================

// =============================================================================
// ENUMS
// =============================================================================

export enum ContractStatus {
  DISCOVERED = 'DISCOVERED',
  REVIEWING = 'REVIEWING',
  PREPARING_BID = 'PREPARING_BID',
  BID_SUBMITTED = 'BID_SUBMITTED',
  AWARDED = 'AWARDED',
  NOT_AWARDED = 'NOT_AWARDED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum ContractType {
  FEDERAL = 'FEDERAL',
  STATE = 'STATE',
  LOCAL = 'LOCAL',
  COMMERCIAL = 'COMMERCIAL',
  SUBCONTRACT = 'SUBCONTRACT',
}

export enum SetAsideType {
  NONE = 'NONE',
  SMALL_BUSINESS = 'SMALL_BUSINESS',
  WOSB = 'WOSB', // Women-Owned Small Business
  EDWOSB = 'EDWOSB', // Economically Disadvantaged WOSB
  SDVOSB = 'SDVOSB', // Service-Disabled Veteran-Owned Small Business
  HUBZONE = 'HUBZONE',
  EIGHT_A = 'EIGHT_A', // 8(a) Program
  VETERAN_OWNED = 'VETERAN_OWNED',
  MINORITY_OWNED = 'MINORITY_OWNED',
}

export enum ContractSource {
  SAM_GOV = 'SAM_GOV',
  STATE_PORTAL = 'STATE_PORTAL',
  LOCAL_PORTAL = 'LOCAL_PORTAL',
  COMMERCIAL = 'COMMERCIAL',
  MANUAL = 'MANUAL',
}

export enum RequirementCategory {
  TECHNICAL = 'TECHNICAL',
  MANAGEMENT = 'MANAGEMENT',
  PAST_PERFORMANCE = 'PAST_PERFORMANCE',
  PRICING = 'PRICING',
  COMPLIANCE = 'COMPLIANCE',
  CERTIFICATION = 'CERTIFICATION',
  INSURANCE = 'INSURANCE',
  BONDING = 'BONDING',
  OTHER = 'OTHER',
}

// =============================================================================
// BASE INTERFACES
// =============================================================================

export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// CONTRACT INTERFACES
// =============================================================================

export interface Contract extends BaseEntity {
  // Source Information
  sourceId: string;
  source: ContractSource;
  sourceUrl?: string;

  // Basic Information
  title: string;
  description?: string;
  synopsis?: string;

  // Contract Details
  solicitationNumber?: string;
  contractNumber?: string;
  contractType: ContractType;
  setAsideType: SetAsideType;

  // Classification
  naicsCode?: string;
  naicsDescription?: string;
  pscCode?: string;
  pscDescription?: string;

  // Contracting Office
  agency?: string;
  subAgency?: string;
  office?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Location
  placeOfPerformance?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Financial
  estimatedValue?: number;
  minValue?: number;
  maxValue?: number;
  awardAmount?: number;

  // Dates
  postedDate?: Date | string;
  responseDeadline?: Date | string;
  qaDeadline?: Date | string;
  awardDate?: Date | string;
  performanceStartDate?: Date | string;
  performanceEndDate?: Date | string;
  archiveDate?: Date | string;

  // Status
  isActive: boolean;
  isCancelled: boolean;

  // AI Analysis
  aiSummary?: string;
  aiMatchScore?: number;
  aiKeyRequirements?: AIKeyRequirement[];
  aiRecommendations?: AIRecommendation[];
  lastAnalyzedAt?: Date | string;

  // Relations (when populated)
  requirements?: ContractRequirement[];
  attachments?: ContractAttachment[];
  amendments?: ContractAmendment[];
}

export interface ContractRequirement extends BaseEntity {
  contractId: string;
  category?: RequirementCategory;
  requirement: string;
  isMandatory: boolean;
  priority: number;
  confidence?: number;
  sourceSection?: string;
}

export interface ContractAttachment extends BaseEntity {
  contractId: string;
  name: string;
  description?: string;
  fileType?: string;
  fileSize?: number;
  url: string;
  s3Key?: string;
  isProcessed: boolean;
  processedAt?: Date | string;
  extractedText?: string;
}

export interface ContractAmendment extends BaseEntity {
  contractId: string;
  amendmentNumber: string;
  title?: string;
  description?: string;
  effectiveDate?: Date | string;
  newDeadline?: Date | string;
  url?: string;
}

export interface SavedContract extends BaseEntity {
  contractId: string;
  organizationId: string;
  userId: string;
  status: ContractStatus;
  matchScore?: number;
  notes?: string;
  tags: string[];
  priority: number;
  bidDecision?: BidDecision;
  bidDecisionReason?: string;
  bidDecisionAt?: Date | string;

  // Populated relations
  contract?: Contract;
}

// =============================================================================
// AI ANALYSIS INTERFACES
// =============================================================================

export interface AIKeyRequirement {
  id: string;
  category: RequirementCategory;
  text: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  sourceLocation?: string;
}

export interface AIRecommendation {
  id: string;
  type: 'strength' | 'weakness' | 'opportunity' | 'risk';
  title: string;
  description: string;
  actionItems?: string[];
  priority: number;
}

export interface ContractMatchResult {
  contractId: string;
  contract: Contract;
  overallScore: number;
  scores: {
    naicsMatch: number;
    capabilityMatch: number;
    locationMatch: number;
    valueMatch: number;
    setAsideMatch: number;
    pastPerformanceMatch: number;
  };
  matchReasons: string[];
  warnings: string[];
}

export interface AIContractSummary {
  contractId: string;
  summary: string;
  keyPoints: string[];
  requirements: AIKeyRequirement[];
  recommendations: AIRecommendation[];
  estimatedEffort: {
    proposalDays: number;
    complexity: 'low' | 'medium' | 'high';
  };
  competitiveAnalysis?: {
    estimatedBidders: number;
    competitionLevel: 'low' | 'medium' | 'high';
    marketInsights: string[];
  };
  generatedAt: Date | string;
}

// =============================================================================
// SEARCH & FILTER INTERFACES
// =============================================================================

export interface ContractSearchFilters {
  // Text search
  query?: string;
  searchIn?: ('title' | 'description' | 'synopsis' | 'requirements')[];

  // Classification
  contractTypes?: ContractType[];
  setAsideTypes?: SetAsideType[];
  naicsCodes?: string[];
  pscCodes?: string[];

  // Source
  sources?: ContractSource[];

  // Agency
  agencies?: string[];
  subAgencies?: string[];

  // Location
  states?: string[];
  cities?: string[];
  zipCodes?: string[];
  withinMiles?: number;
  fromZipCode?: string;

  // Financial
  minValue?: number;
  maxValue?: number;

  // Dates
  postedAfter?: Date | string;
  postedBefore?: Date | string;
  deadlineAfter?: Date | string;
  deadlineBefore?: Date | string;

  // Status
  isActive?: boolean;
  excludeCancelled?: boolean;

  // AI Matching
  minMatchScore?: number;

  // Saved status
  status?: ContractStatus[];
  savedOnly?: boolean;
  excludeSaved?: boolean;
}

export interface ContractSearchResult {
  contracts: Contract[];
  facets: ContractFacets;
  pagination: PaginatedResponse<Contract>['pagination'];
  searchMetadata: {
    query?: string;
    totalMatches: number;
    searchTimeMs: number;
    appliedFilters: Partial<ContractSearchFilters>;
  };
}

export interface ContractFacets {
  contractTypes: FacetItem[];
  setAsideTypes: FacetItem[];
  agencies: FacetItem[];
  states: FacetItem[];
  naicsCodes: FacetItem[];
  valueRanges: FacetItem[];
  sources: FacetItem[];
}

export interface FacetItem {
  value: string;
  label: string;
  count: number;
}

// =============================================================================
// SAVED SEARCH INTERFACES
// =============================================================================

export interface SavedSearch extends BaseEntity {
  userId: string;
  name: string;
  description?: string;
  criteria: ContractSearchFilters;
  alertEnabled: boolean;
  alertFrequency?: 'IMMEDIATE' | 'DAILY' | 'WEEKLY';
  lastAlertSentAt?: Date | string;
  lastUsedAt?: Date | string;
  useCount: number;
}

// =============================================================================
// CONTRACT TIMELINE INTERFACES
// =============================================================================

export interface ContractTimeline {
  contractId: string;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  date: Date | string;
  type: TimelineEventType;
  title: string;
  description?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  metadata?: Record<string, unknown>;
}

export type TimelineEventType =
  | 'posted'
  | 'qa_open'
  | 'qa_close'
  | 'amendment'
  | 'deadline'
  | 'evaluation'
  | 'award'
  | 'performance_start'
  | 'performance_end'
  | 'custom';

// =============================================================================
// BID DECISION TYPES
// =============================================================================

export type BidDecision = 'WILL_BID' | 'NO_BID' | 'UNDECIDED';

export interface BidDecisionPayload {
  contractId: string;
  decision: BidDecision;
  reason?: string;
}

// =============================================================================
// CONTRACT COMPARISON INTERFACES
// =============================================================================

export interface ContractComparison {
  contracts: Contract[];
  comparisonMatrix: ComparisonMatrix;
  recommendations: {
    bestMatch: string; // Contract ID
    reasons: string[];
  };
}

export interface ComparisonMatrix {
  fields: ComparisonField[];
}

export interface ComparisonField {
  name: string;
  label: string;
  values: {
    contractId: string;
    value: string | number | boolean | null;
    displayValue: string;
    highlight?: 'best' | 'worst' | 'neutral';
  }[];
}

// =============================================================================
// CONTRACT STATISTICS INTERFACES
// =============================================================================

export interface ContractStatistics {
  totalContracts: number;
  activeContracts: number;
  byStatus: Record<ContractStatus, number>;
  byType: Record<ContractType, number>;
  bySetAside: Record<SetAsideType, number>;
  valueStats: {
    total: number;
    average: number;
    median: number;
    min: number;
    max: number;
  };
  upcomingDeadlines: {
    next7Days: number;
    next30Days: number;
    next90Days: number;
  };
  recentActivity: {
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface CreateSavedContractRequest {
  contractId: string;
  status?: ContractStatus;
  notes?: string;
  tags?: string[];
  priority?: number;
}

export interface UpdateSavedContractRequest {
  status?: ContractStatus;
  notes?: string;
  tags?: string[];
  priority?: number;
  bidDecision?: BidDecision;
  bidDecisionReason?: string;
}

export interface BulkUpdateContractsRequest {
  contractIds: string[];
  updates: UpdateSavedContractRequest;
}

export interface ContractAnalysisRequest {
  contractId: string;
  analysisTypes?: ('summary' | 'requirements' | 'recommendations' | 'matching')[];
  forceRefresh?: boolean;
}

export interface ContractAnalysisResponse {
  contractId: string;
  analysis: AIContractSummary;
  matchResult?: ContractMatchResult;
  processingTimeMs: number;
}

// =============================================================================
// WEBSOCKET EVENT TYPES
// =============================================================================

export interface ContractUpdateEvent {
  type: 'CONTRACT_UPDATED' | 'CONTRACT_CREATED' | 'CONTRACT_DELETED';
  contractId: string;
  contract?: Contract;
  changes?: Partial<Contract>;
  timestamp: Date | string;
}

export interface ContractMatchEvent {
  type: 'NEW_MATCH';
  contractId: string;
  contract: Contract;
  matchScore: number;
  matchReasons: string[];
  timestamp: Date | string;
}

export interface DeadlineReminderEvent {
  type: 'DEADLINE_REMINDER';
  contractId: string;
  contract: Contract;
  deadline: Date | string;
  daysRemaining: number;
  timestamp: Date | string;
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export interface ContractExportOptions {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  fields?: (keyof Contract)[];
  includeRequirements?: boolean;
  includeAttachments?: boolean;
  filters?: ContractSearchFilters;
}

export interface ContractExportResult {
  url: string;
  filename: string;
  format: string;
  recordCount: number;
  generatedAt: Date | string;
  expiresAt: Date | string;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isContract(obj: unknown): obj is Contract {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'source' in obj &&
    'sourceId' in obj
  );
}

export function isSavedContract(obj: unknown): obj is SavedContract {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'contractId' in obj &&
    'organizationId' in obj &&
    'status' in obj
  );
}

export function isContractStatus(value: string): value is ContractStatus {
  return Object.values(ContractStatus).includes(value as ContractStatus);
}

export function isContractType(value: string): value is ContractType {
  return Object.values(ContractType).includes(value as ContractType);
}

export function isSetAsideType(value: string): value is SetAsideType {
  return Object.values(SetAsideType).includes(value as SetAsideType);
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type ContractSortField =
  | 'title'
  | 'postedDate'
  | 'responseDeadline'
  | 'estimatedValue'
  | 'agency'
  | 'matchScore'
  | 'status'
  | 'createdAt';

export type ContractWithRelations = Contract & {
  requirements: ContractRequirement[];
  attachments: ContractAttachment[];
  amendments: ContractAmendment[];
};

export type PartialContract = Partial<Contract> & Pick<Contract, 'id'>;

export type ContractCreateInput = Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>;

export type ContractUpdateInput = Partial<Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>>;
