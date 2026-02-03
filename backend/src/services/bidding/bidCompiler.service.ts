// =============================================================================
// GovBid Pro - Bid Compiler Service
// =============================================================================
// Core service for compiling and managing bid/proposal packages
// =============================================================================

import { prisma } from '../../config';
import claudeService from '../ai/claude.service';
import bomGenerator from './bomGenerator.service';
import type { Bid, BidStatus, Contract, PricingTier, BOMItem } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateBidInput {
  contractId: string;
  organizationId: string;
  userId: string;
  title?: string;
  pricingTier?: PricingTier;
}

export interface UpdateBidInput {
  title?: string;
  status?: BidStatus;
  pricingTier?: PricingTier;
  technicalProposal?: string;
  managementProposal?: string;
  pricingNarrative?: string;
  executiveSummary?: string;
  totalPrice?: number;
  laborCost?: number;
  materialCost?: number;
  overheadCost?: number;
  profitMargin?: number;
  assignedToId?: string;
}

export interface BidWithRelations extends Bid {
  contract: Contract;
  bomItems: BOMItem[];
  _count: {
    bomItems: number;
    documents: number;
    comments: number;
  };
}

export interface BidSummary {
  totalBids: number;
  byStatus: Record<BidStatus, number>;
  totalValue: number;
  winRate: number;
  averageValue: number;
}

export interface BidCompilationResult {
  bid: Bid;
  generatedSections: {
    executiveSummary: boolean;
    technicalProposal: boolean;
    managementProposal: boolean;
    pricingNarrative: boolean;
  };
  bomGenerated: boolean;
  errors: string[];
}

// =============================================================================
// BID CRUD OPERATIONS
// =============================================================================

/**
 * Create a new bid
 */
export async function createBid(input: CreateBidInput): Promise<Bid> {
  // Verify contract exists
  const contract = await prisma.contract.findUnique({
    where: { id: input.contractId },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  // Check if bid already exists for this contract/org
  const existingBid = await prisma.bid.findFirst({
    where: {
      contractId: input.contractId,
      organizationId: input.organizationId,
    },
  });

  if (existingBid) {
    throw new Error('A bid already exists for this contract');
  }

  const bid = await prisma.bid.create({
    data: {
      contractId: input.contractId,
      organizationId: input.organizationId,
      createdById: input.userId,
      title: input.title || `Bid for ${contract.title}`,
      status: 'DRAFT',
      pricingTier: input.pricingTier || 'COMPETITIVE',
      aiGenerated: false,
    },
  });

  return bid;
}

/**
 * Get bid by ID
 */
export async function getBidById(
  bidId: string,
  includeRelations: boolean = false
): Promise<BidWithRelations | Bid | null> {
  return prisma.bid.findUnique({
    where: { id: bidId },
    include: includeRelations
      ? {
          contract: true,
          bomItems: {
            orderBy: { lineNumber: 'asc' },
          },
          documents: true,
          _count: {
            select: {
              bomItems: true,
              documents: true,
              comments: true,
            },
          },
        }
      : undefined,
  });
}

/**
 * Get bids for organization
 */
export async function getOrganizationBids(
  organizationId: string,
  filters?: {
    status?: BidStatus[];
    contractId?: string;
  },
  pagination?: {
    page: number;
    limit: number;
  }
): Promise<{ bids: BidWithRelations[]; total: number }> {
  const where: Parameters<typeof prisma.bid.findMany>[0]['where'] = {
    organizationId,
  };

  if (filters?.status && filters.status.length > 0) {
    where.status = { in: filters.status };
  }
  if (filters?.contractId) {
    where.contractId = filters.contractId;
  }

  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;

  const [bids, total] = await Promise.all([
    prisma.bid.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        contract: true,
        bomItems: {
          orderBy: { lineNumber: 'asc' },
        },
        _count: {
          select: {
            bomItems: true,
            documents: true,
            comments: true,
          },
        },
      },
    }),
    prisma.bid.count({ where }),
  ]);

  return { bids: bids as BidWithRelations[], total };
}

/**
 * Update bid
 */
export async function updateBid(
  bidId: string,
  organizationId: string,
  input: UpdateBidInput
): Promise<Bid> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
  });

  if (!bid || bid.organizationId !== organizationId) {
    throw new Error('Bid not found');
  }

  // Don't allow updates to submitted bids
  if (bid.status === 'SUBMITTED') {
    throw new Error('Cannot update a submitted bid');
  }

  return prisma.bid.update({
    where: { id: bidId },
    data: input,
  });
}

/**
 * Delete bid
 */
export async function deleteBid(
  bidId: string,
  organizationId: string
): Promise<void> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
  });

  if (!bid || bid.organizationId !== organizationId) {
    throw new Error('Bid not found');
  }

  if (bid.status === 'SUBMITTED') {
    throw new Error('Cannot delete a submitted bid');
  }

  await prisma.bid.delete({
    where: { id: bidId },
  });
}

// =============================================================================
// BID STATUS MANAGEMENT
// =============================================================================

/**
 * Update bid status
 */
export async function updateBidStatus(
  bidId: string,
  organizationId: string,
  newStatus: BidStatus
): Promise<Bid> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
  });

  if (!bid || bid.organizationId !== organizationId) {
    throw new Error('Bid not found');
  }

  // Validate status transition
  const validTransitions: Record<BidStatus, BidStatus[]> = {
    DRAFT: ['IN_PROGRESS', 'WITHDRAWN'],
    IN_PROGRESS: ['UNDER_REVIEW', 'DRAFT', 'WITHDRAWN'],
    UNDER_REVIEW: ['APPROVED', 'IN_PROGRESS', 'WITHDRAWN'],
    APPROVED: ['SUBMITTED', 'IN_PROGRESS'],
    SUBMITTED: ['WITHDRAWN'],
    WITHDRAWN: ['DRAFT'],
  };

  if (!validTransitions[bid.status]?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${bid.status} to ${newStatus}`);
  }

  const updateData: Parameters<typeof prisma.bid.update>[0]['data'] = {
    status: newStatus,
  };

  if (newStatus === 'SUBMITTED') {
    updateData.submittedAt = new Date();
  }

  return prisma.bid.update({
    where: { id: bidId },
    data: updateData,
  });
}

/**
 * Submit bid
 */
export async function submitBid(
  bidId: string,
  organizationId: string,
  submissionDetails: {
    method: string;
    reference?: string;
  }
): Promise<Bid> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: {
      bomItems: true,
    },
  });

  if (!bid || bid.organizationId !== organizationId) {
    throw new Error('Bid not found');
  }

  if (bid.status !== 'APPROVED') {
    throw new Error('Bid must be approved before submission');
  }

  // Validate bid has required components
  if (!bid.totalPrice || bid.totalPrice.equals(0)) {
    throw new Error('Bid must have a total price');
  }

  return prisma.bid.update({
    where: { id: bidId },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      submissionMethod: submissionDetails.method,
      submissionReference: submissionDetails.reference,
    },
  });
}

// =============================================================================
// AI-POWERED BID COMPILATION
// =============================================================================

/**
 * Compile a complete bid using AI
 */
export async function compileBid(
  bidId: string,
  organizationId: string,
  options?: {
    generateProposal?: boolean;
    generateBOM?: boolean;
    pricingTier?: PricingTier;
  }
): Promise<BidCompilationResult> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: {
      contract: {
        include: {
          requirements: true,
        },
      },
      organization: {
        include: {
          businessProfile: true,
          pastPerformances: {
            take: 5,
            orderBy: { contractValue: 'desc' },
          },
        },
      },
    },
  });

  if (!bid || bid.organizationId !== organizationId) {
    throw new Error('Bid not found');
  }

  const result: BidCompilationResult = {
    bid,
    generatedSections: {
      executiveSummary: false,
      technicalProposal: false,
      managementProposal: false,
      pricingNarrative: false,
    },
    bomGenerated: false,
    errors: [],
  };

  const pricingTier = options?.pricingTier || bid.pricingTier;

  // Generate proposal if requested
  if (options?.generateProposal !== false) {
    try {
      const companyProfile = {
        name: bid.organization.name,
        description: bid.organization.businessProfile?.coreCompetencies?.join('. ') || '',
        capabilities: bid.organization.businessProfile?.coreCompetencies || [],
        pastPerformance: bid.organization.pastPerformances.map((pp) => pp.projectName),
      };

      const proposal = await claudeService.generateProposal(
        bid.contract,
        bid.contract.requirements,
        companyProfile
      );

      await prisma.bid.update({
        where: { id: bidId },
        data: {
          executiveSummary: proposal.executiveSummary,
          technicalProposal: proposal.technicalApproach.content,
          managementProposal: proposal.managementApproach.content,
          aiGenerated: true,
          aiGeneratedAt: new Date(),
        },
      });

      result.generatedSections = {
        executiveSummary: true,
        technicalProposal: true,
        managementProposal: true,
        pricingNarrative: false,
      };
    } catch (error) {
      result.errors.push(`Proposal generation failed: ${(error as Error).message}`);
    }
  }

  // Generate BOM if requested
  if (options?.generateBOM !== false) {
    try {
      const bomResult = await bomGenerator.generateBOM(
        bidId,
        bid.contract,
        bid.contract.requirements,
        pricingTier
      );

      result.bomGenerated = true;

      // Update bid with pricing
      await prisma.bid.update({
        where: { id: bidId },
        data: {
          pricingTier,
          totalPrice: bomResult.totals[pricingTier].total,
          laborCost: bomResult.totals[pricingTier].labor,
          materialCost: bomResult.totals[pricingTier].materials,
          overheadCost: bomResult.totals[pricingTier].overhead,
        },
      });
    } catch (error) {
      result.errors.push(`BOM generation failed: ${(error as Error).message}`);
    }
  }

  // Fetch updated bid
  result.bid = (await getBidById(bidId)) as Bid;

  return result;
}

/**
 * Regenerate a specific section of the bid
 */
export async function regenerateSection(
  bidId: string,
  organizationId: string,
  section: 'executiveSummary' | 'technicalProposal' | 'managementProposal' | 'pricingNarrative'
): Promise<string> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: {
      contract: {
        include: {
          requirements: true,
        },
      },
      organization: {
        include: {
          businessProfile: true,
        },
      },
    },
  });

  if (!bid || bid.organizationId !== organizationId) {
    throw new Error('Bid not found');
  }

  const companyProfile = {
    name: bid.organization.name,
    description: bid.organization.businessProfile?.coreCompetencies?.join('. ') || '',
    capabilities: bid.organization.businessProfile?.coreCompetencies || [],
  };

  const proposal = await claudeService.generateProposal(
    bid.contract,
    bid.contract.requirements,
    companyProfile,
    { sections: [section] }
  );

  let content = '';
  switch (section) {
    case 'executiveSummary':
      content = proposal.executiveSummary;
      break;
    case 'technicalProposal':
      content = proposal.technicalApproach.content;
      break;
    case 'managementProposal':
      content = proposal.managementApproach.content;
      break;
    default:
      throw new Error(`Unknown section: ${section}`);
  }

  await prisma.bid.update({
    where: { id: bidId },
    data: { [section]: content },
  });

  return content;
}

// =============================================================================
// BID ANALYTICS
// =============================================================================

/**
 * Get bid statistics for organization
 */
export async function getBidStatistics(organizationId: string): Promise<BidSummary> {
  const bids = await prisma.bid.findMany({
    where: { organizationId },
    select: {
      status: true,
      totalPrice: true,
      isAwarded: true,
    },
  });

  const byStatus: Record<string, number> = {};
  let totalValue = 0;
  let submittedCount = 0;
  let wonCount = 0;

  for (const bid of bids) {
    byStatus[bid.status] = (byStatus[bid.status] || 0) + 1;

    if (bid.totalPrice) {
      totalValue += Number(bid.totalPrice);
    }

    if (bid.status === 'SUBMITTED' || bid.isAwarded) {
      submittedCount++;
      if (bid.isAwarded) {
        wonCount++;
      }
    }
  }

  return {
    totalBids: bids.length,
    byStatus: byStatus as Record<BidStatus, number>,
    totalValue,
    winRate: submittedCount > 0 ? (wonCount / submittedCount) * 100 : 0,
    averageValue: bids.length > 0 ? totalValue / bids.length : 0,
  };
}

/**
 * Record bid outcome
 */
export async function recordBidOutcome(
  bidId: string,
  organizationId: string,
  outcome: {
    isAwarded: boolean;
    awardAmount?: number;
    feedback?: string;
  }
): Promise<Bid> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
  });

  if (!bid || bid.organizationId !== organizationId) {
    throw new Error('Bid not found');
  }

  if (bid.status !== 'SUBMITTED') {
    throw new Error('Can only record outcome for submitted bids');
  }

  return prisma.bid.update({
    where: { id: bidId },
    data: {
      isAwarded: outcome.isAwarded,
      awardedAt: outcome.isAwarded ? new Date() : null,
      awardAmount: outcome.awardAmount,
      feedbackReceived: outcome.feedback,
    },
  });
}

// =============================================================================
// BID VERSIONING
// =============================================================================

/**
 * Create a version snapshot of the bid
 */
export async function createBidVersion(
  bidId: string,
  userId: string,
  changes?: string
): Promise<void> {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: {
      bomItems: true,
    },
  });

  if (!bid) {
    throw new Error('Bid not found');
  }

  // Get current version count
  const versionCount = await prisma.bidVersion.count({
    where: { bidId },
  });

  await prisma.bidVersion.create({
    data: {
      bidId,
      versionNumber: versionCount + 1,
      changes,
      snapshot: bid as unknown as Parameters<typeof prisma.bidVersion.create>[0]['data']['snapshot'],
      createdById: userId,
    },
  });
}

/**
 * Get bid version history
 */
export async function getBidVersions(bidId: string) {
  return prisma.bidVersion.findMany({
    where: { bidId },
    orderBy: { versionNumber: 'desc' },
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // CRUD
  createBid,
  getBidById,
  getOrganizationBids,
  updateBid,
  deleteBid,

  // Status
  updateBidStatus,
  submitBid,

  // Compilation
  compileBid,
  regenerateSection,

  // Analytics
  getBidStatistics,
  recordBidOutcome,

  // Versioning
  createBidVersion,
  getBidVersions,
};
