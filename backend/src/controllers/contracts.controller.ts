// =============================================================================
// GovBid Pro - Contracts Controller
// =============================================================================
// HTTP request handlers for contract-related endpoints
// =============================================================================

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import contractService from '../services/contracts/contract.service';
import { asyncHandler, BadRequestError, NotFoundError, ValidationError } from '../middleware/errorHandler.middleware';
import type { ContractSearchFilters, PaginationParams, BidDecision } from '../../../shared/types/contract.types';
import type { ContractStatus } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string | null;
    role: string;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function handleValidationErrors(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(
      errors.array().map((err) => ({
        field: 'path' in err ? String(err.path) : 'unknown',
        message: err.msg,
      }))
    );
  }
}

function getPagination(query: Request['query']): PaginationParams {
  return {
    page: parseInt(query.page as string) || 1,
    limit: parseInt(query.limit as string) || 20,
    sortBy: query.sortBy as string,
    sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
  };
}

// =============================================================================
// PUBLIC CONTRACT ENDPOINTS
// =============================================================================

/**
 * Search contracts
 * GET /api/contracts
 */
export const searchContracts = asyncHandler(async (req: Request, res: Response) => {
  handleValidationErrors(req);

  const filters: ContractSearchFilters = {
    query: req.query.q as string,
    searchIn: req.query.searchIn
      ? (req.query.searchIn as string).split(',') as ('title' | 'description' | 'synopsis' | 'requirements')[]
      : undefined,
    contractTypes: req.query.contractTypes
      ? (req.query.contractTypes as string).split(',')
      : undefined,
    setAsideTypes: req.query.setAsideTypes
      ? (req.query.setAsideTypes as string).split(',')
      : undefined,
    naicsCodes: req.query.naicsCodes
      ? (req.query.naicsCodes as string).split(',')
      : undefined,
    pscCodes: req.query.pscCodes
      ? (req.query.pscCodes as string).split(',')
      : undefined,
    agencies: req.query.agencies
      ? (req.query.agencies as string).split(',')
      : undefined,
    states: req.query.states
      ? (req.query.states as string).split(',')
      : undefined,
    minValue: req.query.minValue
      ? parseFloat(req.query.minValue as string)
      : undefined,
    maxValue: req.query.maxValue
      ? parseFloat(req.query.maxValue as string)
      : undefined,
    postedAfter: req.query.postedAfter as string,
    postedBefore: req.query.postedBefore as string,
    deadlineAfter: req.query.deadlineAfter as string,
    deadlineBefore: req.query.deadlineBefore as string,
    isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
    excludeCancelled: req.query.excludeCancelled !== 'false',
    minMatchScore: req.query.minMatchScore
      ? parseFloat(req.query.minMatchScore as string)
      : undefined,
  };

  const pagination = getPagination(req.query);

  const result = await contractService.searchContracts(filters, pagination);

  res.json({
    success: true,
    data: result.contracts,
    facets: result.facets,
    pagination: result.pagination,
    meta: result.searchMetadata,
  });
});

/**
 * Get contract by ID
 * GET /api/contracts/:id
 */
export const getContract = asyncHandler(async (req: Request, res: Response) => {
  handleValidationErrors(req);

  const { id } = req.params;
  const includeRelations = req.query.include === 'all';

  const contract = await contractService.getContractById(id, includeRelations);

  if (!contract) {
    throw new NotFoundError('Contract not found');
  }

  res.json({
    success: true,
    data: contract,
  });
});

/**
 * Get contract requirements
 * GET /api/contracts/:id/requirements
 */
export const getContractRequirements = asyncHandler(async (req: Request, res: Response) => {
  handleValidationErrors(req);

  const { id } = req.params;

  // Verify contract exists
  const contract = await contractService.getContractById(id);
  if (!contract) {
    throw new NotFoundError('Contract not found');
  }

  const requirements = await contractService.getContractRequirements(id);

  res.json({
    success: true,
    data: requirements,
    meta: {
      total: requirements.length,
      mandatory: requirements.filter((r) => r.isMandatory).length,
    },
  });
});

// =============================================================================
// SAVED CONTRACTS ENDPOINTS (Require Authentication)
// =============================================================================

/**
 * Save a contract
 * POST /api/contracts/:id/save
 */
export const saveContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  handleValidationErrors(req);

  if (!req.user?.organizationId) {
    throw new BadRequestError('Organization membership required');
  }

  const { id } = req.params;
  const { status, notes, tags, priority, matchScore } = req.body;

  // Verify contract exists
  const contract = await contractService.getContractById(id);
  if (!contract) {
    throw new NotFoundError('Contract not found');
  }

  const savedContract = await contractService.saveContract(
    id,
    req.user.organizationId,
    req.user.id,
    { status, notes, tags, priority, matchScore }
  );

  res.status(201).json({
    success: true,
    data: savedContract,
    message: 'Contract saved successfully',
  });
});

/**
 * Get saved contracts for organization
 * GET /api/contracts/saved
 */
export const getSavedContracts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  handleValidationErrors(req);

  if (!req.user?.organizationId) {
    throw new BadRequestError('Organization membership required');
  }

  const filters = {
    status: req.query.status
      ? (req.query.status as string).split(',') as ContractStatus[]
      : undefined,
    tags: req.query.tags
      ? (req.query.tags as string).split(',')
      : undefined,
    priority: req.query.priority
      ? parseInt(req.query.priority as string)
      : undefined,
    bidDecision: req.query.bidDecision as BidDecision | undefined,
  };

  const pagination = getPagination(req.query);

  const result = await contractService.getSavedContracts(
    req.user.organizationId,
    filters,
    pagination
  );

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * Update saved contract
 * PATCH /api/contracts/saved/:savedId
 */
export const updateSavedContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  handleValidationErrors(req);

  if (!req.user?.organizationId) {
    throw new BadRequestError('Organization membership required');
  }

  const { savedId } = req.params;
  const { status, notes, tags, priority, bidDecision, bidDecisionReason } = req.body;

  const savedContract = await contractService.updateSavedContract(
    savedId,
    req.user.organizationId,
    { status, notes, tags, priority, bidDecision, bidDecisionReason }
  );

  res.json({
    success: true,
    data: savedContract,
    message: 'Saved contract updated successfully',
  });
});

/**
 * Remove saved contract
 * DELETE /api/contracts/saved/:savedId
 */
export const removeSavedContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  handleValidationErrors(req);

  if (!req.user?.organizationId) {
    throw new BadRequestError('Organization membership required');
  }

  const { savedId } = req.params;

  await contractService.removeSavedContract(savedId, req.user.organizationId);

  res.json({
    success: true,
    message: 'Contract removed from saved list',
  });
});

/**
 * Check if contract is saved
 * GET /api/contracts/:id/saved-status
 */
export const getContractSavedStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.organizationId) {
    res.json({
      success: true,
      data: { isSaved: false },
    });
    return;
  }

  const { id } = req.params;
  const isSaved = await contractService.isContractSaved(id, req.user.organizationId);

  res.json({
    success: true,
    data: { isSaved },
  });
});

/**
 * Update bid decision
 * POST /api/contracts/saved/:savedId/decision
 */
export const updateBidDecision = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  handleValidationErrors(req);

  if (!req.user?.organizationId) {
    throw new BadRequestError('Organization membership required');
  }

  const { savedId } = req.params;
  const { decision, reason } = req.body;

  const savedContract = await contractService.updateSavedContract(
    savedId,
    req.user.organizationId,
    {
      bidDecision: decision,
      bidDecisionReason: reason,
    }
  );

  res.json({
    success: true,
    data: savedContract,
    message: `Bid decision updated to "${decision}"`,
  });
});

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk update saved contracts
 * PATCH /api/contracts/saved/bulk
 */
export const bulkUpdateSavedContracts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  handleValidationErrors(req);

  if (!req.user?.organizationId) {
    throw new BadRequestError('Organization membership required');
  }

  const { contractIds, updates } = req.body;

  if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
    throw new BadRequestError('contractIds array is required');
  }

  if (contractIds.length > 100) {
    throw new BadRequestError('Maximum 100 contracts can be updated at once');
  }

  const count = await contractService.bulkUpdateSavedContracts(
    req.user.organizationId,
    contractIds,
    updates
  );

  res.json({
    success: true,
    data: { updatedCount: count },
    message: `${count} contracts updated successfully`,
  });
});

/**
 * Bulk remove saved contracts
 * DELETE /api/contracts/saved/bulk
 */
export const bulkRemoveSavedContracts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  handleValidationErrors(req);

  if (!req.user?.organizationId) {
    throw new BadRequestError('Organization membership required');
  }

  const { contractIds } = req.body;

  if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
    throw new BadRequestError('contractIds array is required');
  }

  if (contractIds.length > 100) {
    throw new BadRequestError('Maximum 100 contracts can be removed at once');
  }

  const count = await contractService.bulkRemoveSavedContracts(
    req.user.organizationId,
    contractIds
  );

  res.json({
    success: true,
    data: { removedCount: count },
    message: `${count} contracts removed successfully`,
  });
});

// =============================================================================
// STATISTICS & ANALYTICS
// =============================================================================

/**
 * Get contract statistics
 * GET /api/contracts/statistics
 */
export const getContractStatistics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.organizationId) {
    throw new BadRequestError('Organization membership required');
  }

  const statistics = await contractService.getContractStatistics(req.user.organizationId);

  res.json({
    success: true,
    data: statistics,
  });
});

/**
 * Get contract pipeline
 * GET /api/contracts/pipeline
 */
export const getContractPipeline = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.organizationId) {
    throw new BadRequestError('Organization membership required');
  }

  // Get counts by status
  const statuses: ContractStatus[] = [
    'DISCOVERED',
    'REVIEWING',
    'PREPARING_BID',
    'BID_SUBMITTED',
    'AWARDED',
    'NOT_AWARDED',
  ];

  const pipeline = await Promise.all(
    statuses.map(async (status) => {
      const result = await contractService.getSavedContracts(
        req.user!.organizationId!,
        { status: [status] },
        { page: 1, limit: 5, sortBy: 'updatedAt', sortOrder: 'desc' }
      );

      return {
        status,
        count: result.pagination.total,
        recentContracts: result.data.slice(0, 5),
      };
    })
  );

  res.json({
    success: true,
    data: pipeline,
  });
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

/**
 * Create contract (Admin only - for manual entry)
 * POST /api/contracts
 */
export const createContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  handleValidationErrors(req);

  if (req.user?.role !== 'ADMIN') {
    throw new BadRequestError('Admin access required');
  }

  const contract = await contractService.createContract({
    ...req.body,
    source: 'MANUAL',
    sourceId: `manual-${Date.now()}`,
  });

  res.status(201).json({
    success: true,
    data: contract,
    message: 'Contract created successfully',
  });
});

/**
 * Update contract (Admin only)
 * PATCH /api/contracts/:id
 */
export const updateContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  handleValidationErrors(req);

  if (req.user?.role !== 'ADMIN') {
    throw new BadRequestError('Admin access required');
  }

  const { id } = req.params;

  const existingContract = await contractService.getContractById(id);
  if (!existingContract) {
    throw new NotFoundError('Contract not found');
  }

  const contract = await contractService.updateContract(id, req.body);

  res.json({
    success: true,
    data: contract,
    message: 'Contract updated successfully',
  });
});

/**
 * Delete contract (Admin only)
 * DELETE /api/contracts/:id
 */
export const deleteContract = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  handleValidationErrors(req);

  if (req.user?.role !== 'ADMIN') {
    throw new BadRequestError('Admin access required');
  }

  const { id } = req.params;

  const existingContract = await contractService.getContractById(id);
  if (!existingContract) {
    throw new NotFoundError('Contract not found');
  }

  await contractService.deleteContract(id);

  res.json({
    success: true,
    message: 'Contract deleted successfully',
  });
});

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Public
  searchContracts,
  getContract,
  getContractRequirements,

  // Saved contracts
  saveContract,
  getSavedContracts,
  updateSavedContract,
  removeSavedContract,
  getContractSavedStatus,
  updateBidDecision,

  // Bulk operations
  bulkUpdateSavedContracts,
  bulkRemoveSavedContracts,

  // Statistics
  getContractStatistics,
  getContractPipeline,

  // Admin
  createContract,
  updateContract,
  deleteContract,
};
