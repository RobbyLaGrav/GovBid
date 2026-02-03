// =============================================================================
// GovBid Pro - Authentication Service
// =============================================================================
// Core authentication functionality: registration, login, tokens, password reset
// =============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma, appConfig } from '../../config';
import { sendEmail, emailTemplates } from '../../config/email';
import { cacheSet, cacheGet, cacheDelete } from '../../config/redis';
import type { User, UserStatus, UserRole } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: SafeUser;
  tokens: AuthTokens;
}

export type SafeUser = Omit<User, 'passwordHash' | 'twoFactorSecret'>;

// =============================================================================
// CONSTANTS
// =============================================================================

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY = '30d';
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// =============================================================================
// PASSWORD HELPERS
// =============================================================================

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// =============================================================================
// JWT HELPERS
// =============================================================================

/**
 * Generate access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, appConfig.jwtSecret, {
    expiresIn: appConfig.jwtExpiresIn || ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, appConfig.jwtRefreshSecret, {
    expiresIn: appConfig.jwtRefreshExpiresIn || REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, appConfig.jwtSecret) as TokenPayload;
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, appConfig.jwtRefreshSecret) as TokenPayload;
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(payload: TokenPayload): AuthTokens {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Parse expiry to seconds
  const expiresIn = parseExpiryToSeconds(appConfig.jwtExpiresIn || ACCESS_TOKEN_EXPIRY);

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 604800; // Default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 604800;
  }
}

// =============================================================================
// USER HELPERS
// =============================================================================

/**
 * Remove sensitive fields from user object
 */
export function sanitizeUser(user: User): SafeUser {
  const { passwordHash, twoFactorSecret, ...safeUser } = user;
  return safeUser;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { organization: true },
  });
}

// =============================================================================
// REGISTRATION
// =============================================================================

/**
 * Register a new user
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const email = input.email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error('An account with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user and optionally organization in a transaction
  const result = await prisma.$transaction(async (tx) => {
    let organizationId: string | undefined;

    // Create organization if name provided
    if (input.organizationName) {
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          primaryEmail: email,
          subscriptionTier: 'FREE',
          subscriptionStatus: 'ACTIVE',
        },
      });
      organizationId = organization.id;
    }

    // Create user
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: organizationId ? 'OWNER' : 'MEMBER',
        status: 'PENDING_VERIFICATION',
        emailVerified: false,
        organizationId,
      },
      include: { organization: true },
    });

    return user;
  });

  // Send verification email
  await sendVerificationEmail(result);

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: result.id,
    email: result.email,
    role: result.role,
    organizationId: result.organizationId || undefined,
  };
  const tokens = generateTokens(tokenPayload);

  // Store refresh token
  await storeRefreshToken(result.id, tokens.refreshToken);

  return {
    user: sanitizeUser(result),
    tokens,
  };
}

// =============================================================================
// LOGIN
// =============================================================================

/**
 * Login user with email and password
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const email = input.email.toLowerCase().trim();

  // Get user
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    throw new Error(`Account is locked. Please try again in ${remainingMinutes} minutes`);
  }

  // Check if account is suspended
  if (user.status === 'SUSPENDED') {
    throw new Error('Your account has been suspended. Please contact support');
  }

  // Verify password
  if (!user.passwordHash) {
    throw new Error('Invalid email or password');
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    // Increment failed attempts
    await handleFailedLogin(user);
    throw new Error('Invalid email or password');
  }

  // Reset failed attempts and update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastActivityAt: new Date(),
      status: user.status === 'PENDING_VERIFICATION' ? 'PENDING_VERIFICATION' : 'ACTIVE',
    },
  });

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId || undefined,
  };
  const tokens = generateTokens(tokenPayload);

  // Store refresh token
  await storeRefreshToken(user.id, tokens.refreshToken);

  return {
    user: sanitizeUser(user),
    tokens,
  };
}

/**
 * Handle failed login attempt
 */
async function handleFailedLogin(user: User): Promise<void> {
  const attempts = user.failedLoginAttempts + 1;

  const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
    failedLoginAttempts: attempts,
  };

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });
}

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

/**
 * Store refresh token in database
 */
async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + parseExpiryToSeconds(REFRESH_TOKEN_EXPIRY) * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  // Verify the refresh token
  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error('Invalid refresh token');
  }

  // Check if token exists in database and is not revoked
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!storedToken || storedToken.revokedAt) {
    throw new Error('Invalid refresh token');
  }

  if (storedToken.expiresAt < new Date()) {
    throw new Error('Refresh token expired');
  }

  // Get fresh user data
  const user = await getUserById(payload.userId);
  if (!user || user.status === 'SUSPENDED') {
    throw new Error('User not found or suspended');
  }

  // Generate new tokens
  const newPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId || undefined,
  };
  const tokens = generateTokens(newPayload);

  // Revoke old refresh token and store new one
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + parseExpiryToSeconds(REFRESH_TOKEN_EXPIRY) * 1000),
      },
    }),
  ]);

  return tokens;
}

/**
 * Logout - revoke refresh token
 */
export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revokedAt: new Date() },
  });
}

/**
 * Logout from all devices - revoke all refresh tokens
 */
export async function logoutAllDevices(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

// =============================================================================
// EMAIL VERIFICATION
// =============================================================================

/**
 * Send verification email
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);

  // Store verification token
  await prisma.emailVerification.create({
    data: {
      email: user.email,
      token,
      expiresAt,
    },
  });

  // Send email
  const template = emailTemplates.verification({
    name: user.firstName,
    token,
  });

  await sendEmail({
    ...template,
    to: user.email,
  });
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<SafeUser> {
  const verification = await prisma.emailVerification.findUnique({
    where: { token },
  });

  if (!verification) {
    throw new Error('Invalid verification token');
  }

  if (verification.verifiedAt) {
    throw new Error('Email already verified');
  }

  if (verification.expiresAt < new Date()) {
    throw new Error('Verification token expired');
  }

  // Update verification and user
  const [, user] = await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verifiedAt: new Date() },
    }),
    prisma.user.update({
      where: { email: verification.email },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      },
    }),
  ]);

  return sanitizeUser(user);
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  const user = await getUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists
    return;
  }

  if (user.emailVerified) {
    throw new Error('Email already verified');
  }

  // Delete old verification tokens
  await prisma.emailVerification.deleteMany({
    where: { email: user.email },
  });

  // Send new verification email
  await sendVerificationEmail(user);
}

// =============================================================================
// PASSWORD RESET
// =============================================================================

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await getUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists - always return success
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY);

  // Delete any existing reset tokens
  await prisma.passwordReset.deleteMany({
    where: { email: user.email },
  });

  // Create new reset token
  await prisma.passwordReset.create({
    data: {
      email: user.email,
      token,
      expiresAt,
    },
  });

  // Send reset email
  const template = emailTemplates.passwordReset({
    name: user.firstName,
    token,
  });

  await sendEmail({
    ...template,
    to: user.email,
  });
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const resetRequest = await prisma.passwordReset.findUnique({
    where: { token },
  });

  if (!resetRequest) {
    throw new Error('Invalid reset token');
  }

  if (resetRequest.usedAt) {
    throw new Error('Reset token already used');
  }

  if (resetRequest.expiresAt < new Date()) {
    throw new Error('Reset token expired');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password and mark token as used
  await prisma.$transaction([
    prisma.passwordReset.update({
      where: { id: resetRequest.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { email: resetRequest.email },
      data: { passwordHash },
    }),
    // Revoke all refresh tokens for security
    prisma.refreshToken.updateMany({
      where: {
        user: { email: resetRequest.email },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    }),
  ]);
}

/**
 * Change password (when logged in)
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await getUserById(userId);
  if (!user || !user.passwordHash) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash and update new password
  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Optionally revoke all other sessions
  // await logoutAllDevices(userId);
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + parseExpiryToSeconds(ACCESS_TOKEN_EXPIRY) * 1000);

  await prisma.session.create({
    data: {
      userId,
      token,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });
}

/**
 * Get active sessions for user
 */
export async function getActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      id: sessionId,
      userId, // Ensure user owns the session
    },
  });
}

// =============================================================================
// TWO-FACTOR AUTHENTICATION (Placeholder)
// =============================================================================

/**
 * Enable 2FA for user
 */
export async function enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
  // TODO: Implement with speakeasy or similar library
  throw new Error('2FA not yet implemented');
}

/**
 * Verify 2FA code
 */
export async function verify2FA(userId: string, code: string): Promise<boolean> {
  // TODO: Implement with speakeasy or similar library
  throw new Error('2FA not yet implemented');
}

/**
 * Disable 2FA for user
 */
export async function disable2FA(userId: string, code: string): Promise<void> {
  // TODO: Implement with speakeasy or similar library
  throw new Error('2FA not yet implemented');
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Password helpers
  hashPassword,
  verifyPassword,
  generateToken,

  // JWT helpers
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokens,

  // User helpers
  sanitizeUser,
  getUserById,
  getUserByEmail,

  // Authentication
  register,
  login,
  logout,
  logoutAllDevices,
  refreshAccessToken,

  // Email verification
  sendVerificationEmail,
  verifyEmail,
  resendVerificationEmail,

  // Password reset
  requestPasswordReset,
  resetPassword,
  changePassword,

  // Sessions
  createSession,
  getActiveSessions,
  revokeSession,

  // 2FA
  enable2FA,
  verify2FA,
  disable2FA,
};
