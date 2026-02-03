// =============================================================================
// GovBid Pro - Contract Matching Service
// =============================================================================
// AI-powered contract matching based on company profiles and capabilities
// =============================================================================

import {
  getClaudeClient,
  claudeConfig,
  systemPrompts,
  cacheGet,
  cacheSet,
  prisma,
} from '../../config';
import type { Contract, BusinessProfile, Organization, Certification } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface MatchScore {
  overall: number;
  breakdown: {
    naicsMatch: number;
    capabilityMatch: number;
    locationMatch: number;
    valueMatch: number;
    setAsideMatch: number;
    pastPerformanceMatch: number;
    certificationMatch: number;
  };
  confidence: number;
}

export interface MatchResult {
  contractId: string;
  contract: Contract;
  score: MatchScore;
  matchReasons: string[];
  warnings: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended';
  aiInsights?: string;
}

export interface MatchCriteria {
  naicsCodes?: string[];
  pscCodes?: string[];
  capabilities?: string[];
  preferredSetAsides?: string[];
  preferredContractTypes?: string[];
  minContractValue?: number;
  maxContractValue?: number;
  preferredStates?: string[];
  excludeAgencies?: string[];
  keywords?: string[];
}

export interface OrganizationProfile {
  id: string;
  name: string;
  naicsCodes: string[];
  pscCodes: string[];
  capabilities: string[];
  certifications: string[];
  setAsideEligibility: string[];
  serviceAreas: string[];
  pastPerformanceKeywords: string[];
  minContractValue?: number;
  maxContractValue?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CACHE_PREFIX = 'matching:';
const CACHE_TTL = 1800; // 30 minutes
const MATCH_THRESHOLD = 50; // Minimum score to consider a match

// Weight factors for scoring
const WEIGHTS = {
  naics: 0.25,
  capability: 0.20,
  setAside: 0.15,
  location: 0.10,
  value: 0.10,
  pastPerformance: 0.10,
  certification: 0.10,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Load organization profile with all related data
 */
export async function loadOrganizationProfile(
  organizationId: string
): Promise<OrganizationProfile | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      businessProfile: true,
      naicsCodes: true,
      pscCodes: true,
      certifications: {
        where: {
          OR: [
            { expirationDate: null },
            { expirationDate: { gt: new Date() } },
          ],
        },
      },
      pastPerformances: {
        select: {
          keywords: true,
          naicsCode: true,
          contractType: true,
        },
      },
    },
  });

  if (!organization) return null;

  const profile = organization.businessProfile;

  return {
    id: organization.id,
    name: organization.name,
    naicsCodes: organization.naicsCodes.map((n) => n.code),
    pscCodes: organization.pscCodes.map((p) => p.code),
    capabilities: profile?.coreCompetencies || [],
    certifications: organization.certifications.map((c) => c.name),
    setAsideEligibility: mapCertificationsToSetAsides(organization.certifications),
    serviceAreas: profile?.serviceAreas || [],
    pastPerformanceKeywords: organization.pastPerformances.flatMap((pp) => pp.keywords),
    minContractValue: profile?.minContractValue
      ? Number(profile.minContractValue)
      : undefined,
    maxContractValue: profile?.maxContractValue
      ? Number(profile.maxContractValue)
      : undefined,
  };
}

/**
 * Map certifications to set-aside eligibility
 */
function mapCertificationsToSetAsides(
  certifications: Pick<Certification, 'name'>[]
): string[] {
  const setAsides: string[] = [];
  const certNames = certifications.map((c) => c.name.toUpperCase());

  // Check for each set-aside type
  if (certNames.some((n) => n.includes('8(A)') || n.includes('8A'))) {
    setAsides.push('EIGHT_A');
  }
  if (certNames.some((n) => n.includes('HUBZONE'))) {
    setAsides.push('HUBZONE');
  }
  if (certNames.some((n) => n.includes('WOSB'))) {
    setAsides.push('WOSB');
  }
  if (certNames.some((n) => n.includes('EDWOSB'))) {
    setAsides.push('EDWOSB');
  }
  if (certNames.some((n) => n.includes('SDVOSB') || n.includes('SERVICE-DISABLED'))) {
    setAsides.push('SDVOSB');
  }
  if (certNames.some((n) => n.includes('VETERAN'))) {
    setAsides.push('VETERAN_OWNED');
  }
  if (certNames.some((n) => n.includes('SMALL BUSINESS') || n.includes('SBA'))) {
    setAsides.push('SMALL_BUSINESS');
  }

  return setAsides;
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate NAICS code match score
 */
function calculateNAICSScore(
  contractNaics: string | null,
  profileNaics: string[]
): number {
  if (!contractNaics || profileNaics.length === 0) return 50;

  // Exact match
  if (profileNaics.includes(contractNaics)) return 100;

  // Check for partial matches (same 2-4 digit prefix)
  const contractPrefix = contractNaics.slice(0, 4);
  const hasPartialMatch = profileNaics.some((code) =>
    code.startsWith(contractPrefix) || contractNaics.startsWith(code.slice(0, 4))
  );

  if (hasPartialMatch) return 70;

  // Check 2-digit industry match
  const industryPrefix = contractNaics.slice(0, 2);
  const hasIndustryMatch = profileNaics.some((code) =>
    code.startsWith(industryPrefix)
  );

  return hasIndustryMatch ? 40 : 0;
}

/**
 * Calculate set-aside eligibility score
 */
function calculateSetAsideScore(
  contractSetAside: string | null,
  profileSetAsides: string[]
): number {
  if (!contractSetAside || contractSetAside === 'NONE') return 100;
  if (profileSetAsides.includes(contractSetAside)) return 100;

  // Small business can bid on most set-asides
  if (profileSetAsides.includes('SMALL_BUSINESS')) {
    const smallBusinessEligible = [
      'SMALL_BUSINESS',
      'WOSB',
      'EDWOSB',
      'SDVOSB',
      'HUBZONE',
      'EIGHT_A',
      'VETERAN_OWNED',
    ];
    if (smallBusinessEligible.includes(contractSetAside)) return 50;
  }

  return 0;
}

/**
 * Calculate location match score
 */
function calculateLocationScore(
  contractState: string | null,
  profileServiceAreas: string[]
): number {
  if (!contractState || profileServiceAreas.length === 0) return 70;

  // Check if service area includes the state
  if (profileServiceAreas.includes(contractState)) return 100;

  // Check for nationwide coverage
  if (profileServiceAreas.some((a) =>
    a.toLowerCase().includes('nationwide') ||
    a.toLowerCase().includes('all states') ||
    a === 'US'
  )) {
    return 90;
  }

  // Check for regional coverage
  const regions: Record<string, string[]> = {
    NORTHEAST: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
    SOUTHEAST: ['AL', 'FL', 'GA', 'KY', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
    MIDWEST: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
    SOUTHWEST: ['AZ', 'NM', 'OK', 'TX'],
    WEST: ['AK', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
  };

  for (const [region, states] of Object.entries(regions)) {
    if (states.includes(contractState) &&
        profileServiceAreas.some((a) => a.toUpperCase().includes(region))) {
      return 80;
    }
  }

  return 30;
}

/**
 * Calculate contract value fit score
 */
function calculateValueScore(
  contractValue: number | null,
  minValue?: number,
  maxValue?: number
): number {
  if (!contractValue) return 70;

  const value = Number(contractValue);

  // Within preferred range
  if (minValue && maxValue && value >= minValue && value <= maxValue) {
    return 100;
  }

  // Below minimum (too small)
  if (minValue && value < minValue) {
    const ratio = value / minValue;
    return Math.max(0, ratio * 50);
  }

  // Above maximum (too large)
  if (maxValue && value > maxValue) {
    const ratio = maxValue / value;
    return Math.max(0, ratio * 70);
  }

  // Only min or max specified
  if (minValue && value >= minValue) return 90;
  if (maxValue && value <= maxValue) return 90;

  return 70;
}

/**
 * Calculate capability/keyword match score
 */
function calculateCapabilityScore(
  contractTitle: string,
  contractDescription: string | null,
  profileCapabilities: string[],
  profileKeywords: string[]
): number {
  if (profileCapabilities.length === 0 && profileKeywords.length === 0) return 50;

  const searchText = `${contractTitle} ${contractDescription || ''}`.toLowerCase();
  const allKeywords = [...profileCapabilities, ...profileKeywords].map((k) =>
    k.toLowerCase()
  );

  let matches = 0;
  let totalWeight = 0;

  for (const keyword of allKeywords) {
    const words = keyword.split(/\s+/);
    const weight = words.length; // Multi-word keywords have more weight
    totalWeight += weight;

    if (searchText.includes(keyword)) {
      matches += weight;
    } else {
      // Check for partial word matches
      const partialMatch = words.some((word) =>
        word.length > 3 && searchText.includes(word)
      );
      if (partialMatch) {
        matches += weight * 0.5;
      }
    }
  }

  if (totalWeight === 0) return 50;

  return Math.min(100, (matches / totalWeight) * 100);
}

// =============================================================================
// MAIN MATCHING FUNCTIONS
// =============================================================================

/**
 * Calculate match score for a contract against organization profile
 */
export function calculateMatchScore(
  contract: Contract,
  profile: OrganizationProfile
): MatchScore {
  const breakdown = {
    naicsMatch: calculateNAICSScore(contract.naicsCode, profile.naicsCodes),
    capabilityMatch: calculateCapabilityScore(
      contract.title,
      contract.description,
      profile.capabilities,
      profile.pastPerformanceKeywords
    ),
    locationMatch: calculateLocationScore(contract.state, profile.serviceAreas),
    valueMatch: calculateValueScore(
      contract.estimatedValue ? Number(contract.estimatedValue) : null,
      profile.minContractValue,
      profile.maxContractValue
    ),
    setAsideMatch: calculateSetAsideScore(contract.setAsideType, profile.setAsideEligibility),
    pastPerformanceMatch: calculateCapabilityScore(
      contract.title,
      contract.description,
      [],
      profile.pastPerformanceKeywords
    ),
    certificationMatch: profile.certifications.length > 0 ? 80 : 50,
  };

  // Calculate weighted overall score
  const overall =
    breakdown.naicsMatch * WEIGHTS.naics +
    breakdown.capabilityMatch * WEIGHTS.capability +
    breakdown.setAsideMatch * WEIGHTS.setAside +
    breakdown.locationMatch * WEIGHTS.location +
    breakdown.valueMatch * WEIGHTS.value +
    breakdown.pastPerformanceMatch * WEIGHTS.pastPerformance +
    breakdown.certificationMatch * WEIGHTS.certification;

  // Calculate confidence based on data completeness
  let dataPoints = 0;
  let filledPoints = 0;

  const checkField = (value: unknown) => {
    dataPoints++;
    if (value !== null && value !== undefined && value !== '' &&
        (Array.isArray(value) ? value.length > 0 : true)) {
      filledPoints++;
    }
  };

  checkField(contract.naicsCode);
  checkField(contract.description);
  checkField(contract.estimatedValue);
  checkField(contract.state);
  checkField(contract.setAsideType);
  checkField(profile.naicsCodes);
  checkField(profile.capabilities);
  checkField(profile.serviceAreas);

  const confidence = (filledPoints / dataPoints) * 100;

  return {
    overall: Math.round(overall),
    breakdown,
    confidence: Math.round(confidence),
  };
}

/**
 * Generate match reasons based on scores
 */
function generateMatchReasons(score: MatchScore, contract: Contract): string[] {
  const reasons: string[] = [];

  if (score.breakdown.naicsMatch >= 90) {
    reasons.push(`NAICS code ${contract.naicsCode} is an exact match`);
  } else if (score.breakdown.naicsMatch >= 70) {
    reasons.push(`Related NAICS code industry`);
  }

  if (score.breakdown.setAsideMatch === 100 && contract.setAsideType !== 'NONE') {
    reasons.push(`Eligible for ${contract.setAsideType} set-aside`);
  }

  if (score.breakdown.capabilityMatch >= 80) {
    reasons.push('Strong capability alignment');
  }

  if (score.breakdown.locationMatch >= 90) {
    reasons.push('Within service area');
  }

  if (score.breakdown.valueMatch >= 90) {
    reasons.push('Contract value within preferred range');
  }

  if (score.breakdown.pastPerformanceMatch >= 70) {
    reasons.push('Relevant past performance experience');
  }

  return reasons;
}

/**
 * Generate warnings based on scores
 */
function generateWarnings(score: MatchScore, contract: Contract): string[] {
  const warnings: string[] = [];

  if (score.breakdown.naicsMatch < 50) {
    warnings.push('NAICS code may not match company qualifications');
  }

  if (score.breakdown.setAsideMatch === 0 && contract.setAsideType !== 'NONE') {
    warnings.push(`May not be eligible for ${contract.setAsideType} set-aside`);
  }

  if (score.breakdown.valueMatch < 50) {
    warnings.push('Contract value outside typical range');
  }

  if (score.breakdown.locationMatch < 50) {
    warnings.push('Location may be outside normal service area');
  }

  if (score.confidence < 60) {
    warnings.push('Match score has lower confidence due to limited data');
  }

  return warnings;
}

/**
 * Determine recommendation level
 */
function getRecommendation(
  score: number
): 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended' {
  if (score >= 80) return 'highly_recommended';
  if (score >= 65) return 'recommended';
  if (score >= MATCH_THRESHOLD) return 'consider';
  return 'not_recommended';
}

/**
 * Match a single contract against organization profile
 */
export async function matchContract(
  contract: Contract,
  organizationId: string
): Promise<MatchResult> {
  const profile = await loadOrganizationProfile(organizationId);

  if (!profile) {
    throw new Error('Organization profile not found');
  }

  const score = calculateMatchScore(contract, profile);
  const matchReasons = generateMatchReasons(score, contract);
  const warnings = generateWarnings(score, contract);
  const recommendation = getRecommendation(score.overall);

  return {
    contractId: contract.id,
    contract,
    score,
    matchReasons,
    warnings,
    recommendation,
  };
}

/**
 * Find matching contracts for an organization
 */
export async function findMatchingContracts(
  organizationId: string,
  options?: {
    limit?: number;
    minScore?: number;
    includeAIInsights?: boolean;
  }
): Promise<MatchResult[]> {
  const profile = await loadOrganizationProfile(organizationId);

  if (!profile) {
    throw new Error('Organization profile not found');
  }

  const limit = options?.limit || 50;
  const minScore = options?.minScore || MATCH_THRESHOLD;

  // Get active contracts
  const contracts = await prisma.contract.findMany({
    where: {
      isActive: true,
      isCancelled: false,
      responseDeadline: { gt: new Date() },
    },
    orderBy: { postedDate: 'desc' },
    take: 500, // Get more to filter
  });

  // Score and filter contracts
  const results: MatchResult[] = [];

  for (const contract of contracts) {
    const score = calculateMatchScore(contract, profile);

    if (score.overall >= minScore) {
      const matchReasons = generateMatchReasons(score, contract);
      const warnings = generateWarnings(score, contract);
      const recommendation = getRecommendation(score.overall);

      results.push({
        contractId: contract.id,
        contract,
        score,
        matchReasons,
        warnings,
        recommendation,
      });
    }
  }

  // Sort by score and limit
  results.sort((a, b) => b.score.overall - a.score.overall);

  return results.slice(0, limit);
}

/**
 * Update match scores for all saved contracts
 */
export async function updateSavedContractScores(
  organizationId: string
): Promise<{ updated: number; errors: number }> {
  const profile = await loadOrganizationProfile(organizationId);

  if (!profile) {
    throw new Error('Organization profile not found');
  }

  const savedContracts = await prisma.savedContract.findMany({
    where: { organizationId },
    include: { contract: true },
  });

  let updated = 0;
  let errors = 0;

  for (const saved of savedContracts) {
    try {
      const score = calculateMatchScore(saved.contract, profile);

      await prisma.savedContract.update({
        where: { id: saved.id },
        data: { matchScore: score.overall },
      });

      updated++;
    } catch (error) {
      console.error(`Failed to update score for ${saved.id}:`, error);
      errors++;
    }
  }

  return { updated, errors };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  loadOrganizationProfile,
  calculateMatchScore,
  matchContract,
  findMatchingContracts,
  updateSavedContractScores,
};
