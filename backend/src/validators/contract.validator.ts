// =============================================================================
// GovBid Pro - Contract Validators
// =============================================================================
// Request validation schemas for contract endpoints
// =============================================================================

import { body, param, query, ValidationChain } from 'express-validator';

// =============================================================================
// CONSTANTS
// =============================================================================

const CONTRACT_TYPES = ['FEDERAL', 'STATE', 'LOCAL', 'COMMERCIAL', 'SUBCONTRACT'];
const SET_ASIDE_TYPES = [
  'NONE',
  'SMALL_BUSINESS',
  'WOSB',
  'EDWOSB',
  'SDVOSB',
  'HUBZONE',
  'EIGHT_A',
  'VETERAN_OWNED',
  'MINORITY_OWNED',
];
const CONTRACT_STATUSES = [
  'DISCOVERED',
  'REVIEWING',
  'PREPARING_BID',
  'BID_SUBMITTED',
  'AWARDED',
  'NOT_AWARDED',
  'CANCELLED',
  'ARCHIVED',
];
const BID_DECISIONS = ['WILL_BID', 'NO_BID', 'UNDECIDED'];
const SORT_FIELDS = [
  'title',
  'postedDate',
  'responseDeadline',
  'estimatedValue',
  'agency',
  'matchScore',
  'createdAt',
];

// =============================================================================
// SEARCH VALIDATORS
// =============================================================================

export const searchContractsValidator: ValidationChain[] = [
  query('q')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Search query must not exceed 500 characters'),

  query('searchIn')
    .optional()
    .isString()
    .custom((value) => {
      const fields = value.split(',');
      const validFields = ['title', 'description', 'synopsis', 'requirements'];
      return fields.every((f: string) => validFields.includes(f));
    })
    .withMessage('Invalid searchIn fields'),

  query('contractTypes')
    .optional()
    .isString()
    .custom((value) => {
      const types = value.split(',');
      return types.every((t: string) => CONTRACT_TYPES.includes(t));
    })
    .withMessage(`Invalid contract types. Must be: ${CONTRACT_TYPES.join(', ')}`),

  query('setAsideTypes')
    .optional()
    .isString()
    .custom((value) => {
      const types = value.split(',');
      return types.every((t: string) => SET_ASIDE_TYPES.includes(t));
    })
    .withMessage(`Invalid set-aside types. Must be: ${SET_ASIDE_TYPES.join(', ')}`),

  query('naicsCodes')
    .optional()
    .isString()
    .custom((value) => {
      const codes = value.split(',');
      return codes.every((c: string) => /^\d{2,6}$/.test(c));
    })
    .withMessage('NAICS codes must be 2-6 digit numbers'),

  query('pscCodes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('PSC codes list too long'),

  query('agencies')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Agencies list too long'),

  query('states')
    .optional()
    .isString()
    .custom((value) => {
      const states = value.split(',');
      return states.every((s: string) => /^[A-Z]{2}$/.test(s));
    })
    .withMessage('States must be 2-letter abbreviations'),

  query('minValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum value must be a positive number'),

  query('maxValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum value must be a positive number')
    .custom((value, { req }) => {
      if (req.query?.minValue && parseFloat(value) < parseFloat(req.query.minValue)) {
        throw new Error('Maximum value must be greater than minimum value');
      }
      return true;
    }),

  query('postedAfter')
    .optional()
    .isISO8601()
    .withMessage('postedAfter must be a valid ISO 8601 date'),

  query('postedBefore')
    .optional()
    .isISO8601()
    .withMessage('postedBefore must be a valid ISO 8601 date'),

  query('deadlineAfter')
    .optional()
    .isISO8601()
    .withMessage('deadlineAfter must be a valid ISO 8601 date'),

  query('deadlineBefore')
    .optional()
    .isISO8601()
    .withMessage('deadlineBefore must be a valid ISO 8601 date'),

  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive must be true or false'),

  query('excludeCancelled')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('excludeCancelled must be true or false'),

  query('minMatchScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('minMatchScore must be between 0 and 100'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(SORT_FIELDS)
    .withMessage(`Sort field must be one of: ${SORT_FIELDS.join(', ')}`),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

// =============================================================================
// SINGLE CONTRACT VALIDATORS
// =============================================================================

export const getContractValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('Contract ID is required')
    .isString()
    .withMessage('Contract ID must be a string'),

  query('include')
    .optional()
    .isIn(['all', 'none'])
    .withMessage('Include must be "all" or "none"'),
];

// =============================================================================
// SAVED CONTRACT VALIDATORS
// =============================================================================

export const saveContractValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('Contract ID is required')
    .isString()
    .withMessage('Contract ID must be a string'),

  body('status')
    .optional()
    .isIn(CONTRACT_STATUSES)
    .withMessage(`Status must be one of: ${CONTRACT_STATUSES.join(', ')}`),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Notes must not exceed 5000 characters'),

  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with max 20 items'),

  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be 1-50 characters'),

  body('priority')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('Priority must be between 0 and 5'),

  body('matchScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Match score must be between 0 and 100'),
];

export const updateSavedContractValidator: ValidationChain[] = [
  param('savedId')
    .notEmpty()
    .withMessage('Saved contract ID is required')
    .isString()
    .withMessage('Saved contract ID must be a string'),

  body('status')
    .optional()
    .isIn(CONTRACT_STATUSES)
    .withMessage(`Status must be one of: ${CONTRACT_STATUSES.join(', ')}`),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Notes must not exceed 5000 characters'),

  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with max 20 items'),

  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be 1-50 characters'),

  body('priority')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('Priority must be between 0 and 5'),

  body('bidDecision')
    .optional()
    .isIn(BID_DECISIONS)
    .withMessage(`Bid decision must be one of: ${BID_DECISIONS.join(', ')}`),

  body('bidDecisionReason')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Bid decision reason must not exceed 2000 characters'),
];

// =============================================================================
// BID DECISION VALIDATOR
// =============================================================================

export const bidDecisionValidator: ValidationChain[] = [
  param('savedId')
    .notEmpty()
    .withMessage('Saved contract ID is required')
    .isString()
    .withMessage('Saved contract ID must be a string'),

  body('decision')
    .notEmpty()
    .withMessage('Decision is required')
    .isIn(BID_DECISIONS)
    .withMessage(`Decision must be one of: ${BID_DECISIONS.join(', ')}`),

  body('reason')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Reason must not exceed 2000 characters'),
];

// =============================================================================
// BULK OPERATION VALIDATORS
// =============================================================================

export const bulkUpdateValidator: ValidationChain[] = [
  body('contractIds')
    .notEmpty()
    .withMessage('Contract IDs are required')
    .isArray({ min: 1, max: 100 })
    .withMessage('Contract IDs must be an array with 1-100 items'),

  body('contractIds.*')
    .isString()
    .withMessage('Each contract ID must be a string'),

  body('updates')
    .optional()
    .isObject()
    .withMessage('Updates must be an object'),

  body('updates.status')
    .optional()
    .isIn(CONTRACT_STATUSES)
    .withMessage(`Status must be one of: ${CONTRACT_STATUSES.join(', ')}`),

  body('updates.tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with max 20 items'),

  body('updates.priority')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('Priority must be between 0 and 5'),
];

// =============================================================================
// ADMIN VALIDATORS
// =============================================================================

export const createContractValidator: ValidationChain[] = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('Title must be 5-500 characters'),

  body('description')
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage('Description must not exceed 10000 characters'),

  body('synopsis')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Synopsis must not exceed 5000 characters'),

  body('solicitationNumber')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Solicitation number must not exceed 100 characters'),

  body('contractType')
    .optional()
    .isIn(CONTRACT_TYPES)
    .withMessage(`Contract type must be one of: ${CONTRACT_TYPES.join(', ')}`),

  body('setAsideType')
    .optional()
    .isIn(SET_ASIDE_TYPES)
    .withMessage(`Set-aside type must be one of: ${SET_ASIDE_TYPES.join(', ')}`),

  body('naicsCode')
    .optional()
    .matches(/^\d{2,6}$/)
    .withMessage('NAICS code must be 2-6 digits'),

  body('agency')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Agency must not exceed 200 characters'),

  body('state')
    .optional()
    .matches(/^[A-Z]{2}$/)
    .withMessage('State must be a 2-letter abbreviation'),

  body('estimatedValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated value must be a positive number'),

  body('responseDeadline')
    .optional()
    .isISO8601()
    .withMessage('Response deadline must be a valid ISO 8601 date'),

  body('contactEmail')
    .optional()
    .isEmail()
    .withMessage('Contact email must be a valid email address'),

  body('contactPhone')
    .optional()
    .matches(/^[\d\s\-\+\(\)\.]+$/)
    .withMessage('Invalid phone number format'),
];

export const updateContractValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('Contract ID is required')
    .isString()
    .withMessage('Contract ID must be a string'),

  body('title')
    .optional()
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('Title must be 5-500 characters'),

  body('description')
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage('Description must not exceed 10000 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('isCancelled')
    .optional()
    .isBoolean()
    .withMessage('isCancelled must be a boolean'),

  body('aiSummary')
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage('AI summary must not exceed 10000 characters'),

  body('aiMatchScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('AI match score must be between 0 and 100'),
];

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  searchContracts: searchContractsValidator,
  getContract: getContractValidator,
  saveContract: saveContractValidator,
  updateSavedContract: updateSavedContractValidator,
  bidDecision: bidDecisionValidator,
  bulkUpdate: bulkUpdateValidator,
  createContract: createContractValidator,
  updateContract: updateContractValidator,
};
