// =============================================================================
// GovBid Pro - Authentication Validators
// =============================================================================
// Request validation schemas for authentication endpoints
// =============================================================================

import { body, param, query, ValidationChain } from 'express-validator';

// =============================================================================
// CONSTANTS
// =============================================================================

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 255;
const PHONE_MAX_LENGTH = 20;
const ORG_NAME_MAX_LENGTH = 200;

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

const emailValidator = (field: string = 'email'): ValidationChain =>
  body(field)
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: EMAIL_MAX_LENGTH })
    .withMessage(`Email must not exceed ${EMAIL_MAX_LENGTH} characters`);

const passwordValidator = (field: string = 'password'): ValidationChain =>
  body(field)
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .isLength({ max: PASSWORD_MAX_LENGTH })
    .withMessage(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`)
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number');

const optionalStrongPassword = (field: string = 'password'): ValidationChain =>
  body(field)
    .optional()
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .isLength({ max: PASSWORD_MAX_LENGTH })
    .withMessage(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`)
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number');

const firstNameValidator = (): ValidationChain =>
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`First name must not exceed ${NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes');

const lastNameValidator = (): ValidationChain =>
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`Last name must not exceed ${NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes');

const phoneValidator = (): ValidationChain =>
  body('phone')
    .optional()
    .trim()
    .isLength({ max: PHONE_MAX_LENGTH })
    .withMessage(`Phone must not exceed ${PHONE_MAX_LENGTH} characters`)
    .matches(/^[\d\s\-\+\(\)\.]+$/)
    .withMessage('Invalid phone number format');

const tokenValidator = (location: 'body' | 'param' | 'query' = 'body'): ValidationChain => {
  const validator = location === 'param' ? param : location === 'query' ? query : body;
  return validator('token')
    .notEmpty()
    .withMessage('Token is required')
    .isString()
    .withMessage('Token must be a string')
    .isLength({ min: 32, max: 256 })
    .withMessage('Invalid token format');
};

// =============================================================================
// REGISTRATION VALIDATORS
// =============================================================================

export const registerValidator: ValidationChain[] = [
  emailValidator(),
  passwordValidator(),
  firstNameValidator(),
  lastNameValidator(),
  phoneValidator(),
  body('organizationName')
    .optional()
    .trim()
    .isLength({ max: ORG_NAME_MAX_LENGTH })
    .withMessage(`Organization name must not exceed ${ORG_NAME_MAX_LENGTH} characters`),
];

// =============================================================================
// LOGIN VALIDATORS
// =============================================================================

export const loginValidator: ValidationChain[] = [
  emailValidator(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean'),
];

// =============================================================================
// TOKEN VALIDATORS
// =============================================================================

export const refreshTokenValidator: ValidationChain[] = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
];

export const logoutValidator: ValidationChain[] = [
  body('refreshToken')
    .optional()
    .isString()
    .withMessage('Refresh token must be a string'),
];

// =============================================================================
// EMAIL VERIFICATION VALIDATORS
// =============================================================================

export const verifyEmailValidator: ValidationChain[] = [
  tokenValidator('query'),
];

export const resendVerificationValidator: ValidationChain[] = [
  emailValidator(),
];

// =============================================================================
// PASSWORD RESET VALIDATORS
// =============================================================================

export const requestPasswordResetValidator: ValidationChain[] = [
  emailValidator(),
];

export const resetPasswordValidator: ValidationChain[] = [
  tokenValidator(),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .isLength({ max: PASSWORD_MAX_LENGTH })
    .withMessage(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`)
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

export const changePasswordValidator: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .isLength({ max: PASSWORD_MAX_LENGTH })
    .withMessage(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`)
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

// =============================================================================
// PROFILE UPDATE VALIDATORS
// =============================================================================

export const updateProfileValidator: ValidationChain[] = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`First name must not exceed ${NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`Last name must not exceed ${NAME_MAX_LENGTH} characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  phoneValidator(),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('Avatar URL must be a valid URL'),
];

// =============================================================================
// TWO-FACTOR AUTHENTICATION VALIDATORS
// =============================================================================

export const verify2FAValidator: ValidationChain[] = [
  body('code')
    .notEmpty()
    .withMessage('2FA code is required')
    .isString()
    .withMessage('2FA code must be a string')
    .isLength({ min: 6, max: 6 })
    .withMessage('2FA code must be 6 digits')
    .isNumeric()
    .withMessage('2FA code must contain only numbers'),
];

export const disable2FAValidator: ValidationChain[] = [
  body('code')
    .notEmpty()
    .withMessage('2FA code is required')
    .isString()
    .withMessage('2FA code must be a string')
    .isLength({ min: 6, max: 6 })
    .withMessage('2FA code must be 6 digits')
    .isNumeric()
    .withMessage('2FA code must contain only numbers'),
  body('password')
    .notEmpty()
    .withMessage('Password is required for security verification'),
];

// =============================================================================
// SESSION VALIDATORS
// =============================================================================

export const revokeSessionValidator: ValidationChain[] = [
  param('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isString()
    .withMessage('Session ID must be a string'),
];

// =============================================================================
// OAUTH VALIDATORS
// =============================================================================

export const oauthCallbackValidator: ValidationChain[] = [
  query('code')
    .notEmpty()
    .withMessage('Authorization code is required'),
  query('state')
    .optional()
    .isString()
    .withMessage('State must be a string'),
];

// =============================================================================
// TEAM INVITATION VALIDATORS
// =============================================================================

export const inviteTeamMemberValidator: ValidationChain[] = [
  emailValidator(),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['ADMIN', 'OWNER', 'MANAGER', 'MEMBER', 'VIEWER'])
    .withMessage('Invalid role'),
];

export const acceptInvitationValidator: ValidationChain[] = [
  tokenValidator(),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`First name must not exceed ${NAME_MAX_LENGTH} characters`),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`Last name must not exceed ${NAME_MAX_LENGTH} characters`),
  optionalStrongPassword(),
];

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Registration & Login
  register: registerValidator,
  login: loginValidator,

  // Tokens
  refreshToken: refreshTokenValidator,
  logout: logoutValidator,

  // Email verification
  verifyEmail: verifyEmailValidator,
  resendVerification: resendVerificationValidator,

  // Password
  requestPasswordReset: requestPasswordResetValidator,
  resetPassword: resetPasswordValidator,
  changePassword: changePasswordValidator,

  // Profile
  updateProfile: updateProfileValidator,

  // 2FA
  verify2FA: verify2FAValidator,
  disable2FA: disable2FAValidator,

  // Sessions
  revokeSession: revokeSessionValidator,

  // OAuth
  oauthCallback: oauthCallbackValidator,

  // Team
  inviteTeamMember: inviteTeamMemberValidator,
  acceptInvitation: acceptInvitationValidator,
};
