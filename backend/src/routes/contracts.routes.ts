// =============================================================================
// GovBid Pro - Contract Routes
// =============================================================================
// Express routes for contract-related endpoints
// =============================================================================

import { Router } from 'express';
import contractsController from '../controllers/contracts.controller';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  searchContractsValidator,
  getContractValidator,
  saveContractValidator,
  updateSavedContractValidator,
  bulkUpdateValidator,
  bidDecisionValidator,
  createContractValidator,
  updateContractValidator,
} from '../validators/contract.validator';

const router = Router();

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * @route   GET /api/contracts
 * @desc    Search and filter contracts
 * @access  Public (with optional auth for personalized results)
 */
router.get(
  '/',
  optionalAuth,
  searchContractsValidator,
  validate,
  contractsController.searchContracts
);

/**
 * @route   GET /api/contracts/statistics
 * @desc    Get contract statistics and metrics
 * @access  Private
 */
router.get(
  '/statistics',
  authenticate,
  contractsController.getContractStatistics
);

/**
 * @route   GET /api/contracts/pipeline
 * @desc    Get contract pipeline view
 * @access  Private
 */
router.get(
  '/pipeline',
  authenticate,
  contractsController.getContractPipeline
);

/**
 * @route   GET /api/contracts/saved
 * @desc    Get saved contracts for organization
 * @access  Private
 */
router.get(
  '/saved',
  authenticate,
  contractsController.getSavedContracts
);

/**
 * @route   PATCH /api/contracts/saved/bulk
 * @desc    Bulk update saved contracts
 * @access  Private
 */
router.patch(
  '/saved/bulk',
  authenticate,
  bulkUpdateValidator,
  validate,
  contractsController.bulkUpdateSavedContracts
);

/**
 * @route   DELETE /api/contracts/saved/bulk
 * @desc    Bulk remove saved contracts
 * @access  Private
 */
router.delete(
  '/saved/bulk',
  authenticate,
  bulkUpdateValidator,
  validate,
  contractsController.bulkRemoveSavedContracts
);

/**
 * @route   PATCH /api/contracts/saved/:savedId
 * @desc    Update a saved contract
 * @access  Private
 */
router.patch(
  '/saved/:savedId',
  authenticate,
  updateSavedContractValidator,
  validate,
  contractsController.updateSavedContract
);

/**
 * @route   DELETE /api/contracts/saved/:savedId
 * @desc    Remove a saved contract
 * @access  Private
 */
router.delete(
  '/saved/:savedId',
  authenticate,
  contractsController.removeSavedContract
);

/**
 * @route   POST /api/contracts/saved/:savedId/decision
 * @desc    Update bid decision for a saved contract
 * @access  Private
 */
router.post(
  '/saved/:savedId/decision',
  authenticate,
  bidDecisionValidator,
  validate,
  contractsController.updateBidDecision
);

/**
 * @route   GET /api/contracts/:id
 * @desc    Get contract details by ID
 * @access  Public
 */
router.get(
  '/:id',
  optionalAuth,
  getContractValidator,
  validate,
  contractsController.getContract
);

/**
 * @route   GET /api/contracts/:id/requirements
 * @desc    Get contract requirements
 * @access  Public
 */
router.get(
  '/:id/requirements',
  optionalAuth,
  getContractValidator,
  validate,
  contractsController.getContractRequirements
);

/**
 * @route   GET /api/contracts/:id/saved-status
 * @desc    Check if contract is saved by current user's organization
 * @access  Private (returns false if not authenticated)
 */
router.get(
  '/:id/saved-status',
  optionalAuth,
  getContractValidator,
  validate,
  contractsController.getContractSavedStatus
);

/**
 * @route   POST /api/contracts/:id/save
 * @desc    Save a contract to organization's list
 * @access  Private
 */
router.post(
  '/:id/save',
  authenticate,
  saveContractValidator,
  validate,
  contractsController.saveContract
);

// =============================================================================
// ADMIN ROUTES
// =============================================================================

/**
 * @route   POST /api/contracts
 * @desc    Create a new contract (manual entry)
 * @access  Admin
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  createContractValidator,
  validate,
  contractsController.createContract
);

/**
 * @route   PATCH /api/contracts/:id
 * @desc    Update a contract
 * @access  Admin
 */
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  updateContractValidator,
  validate,
  contractsController.updateContract
);

/**
 * @route   DELETE /api/contracts/:id
 * @desc    Delete a contract
 * @access  Admin
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  getContractValidator,
  validate,
  contractsController.deleteContract
);

// =============================================================================
// EXPORT
// =============================================================================

export default router;
