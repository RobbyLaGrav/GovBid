// =============================================================================
// GovBid Pro - Authentication Middleware
// =============================================================================
// Express middleware for JWT authentication and authorization
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, getUserById, TokenPayload, SafeUser } from '../services/auth/auth.service';
import type { UserRole } from '@prisma/client';

// =============================================================================
// TYPE EXTENSIONS
// =============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      token?: string;
      tokenPayload?: TokenPayload;
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Support raw token
  return authHeader;
}

/**
 * Create standardized error response
 */
function createAuthError(message: string, code: string) {
  return {
    success: false,
    error: {
      message,
      code,
    },
  };
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Require authentication - user must be logged in
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json(createAuthError('Authentication required', 'AUTH_REQUIRED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.token = token;
    req.tokenPayload = payload;

    // Fetch full user data
    getUserById(payload.userId)
      .then((user) => {
        if (!user) {
          res.status(401).json(createAuthError('User not found', 'USER_NOT_FOUND'));
          return;
        }

        if (user.status === 'SUSPENDED') {
          res.status(403).json(createAuthError('Account suspended', 'ACCOUNT_SUSPENDED'));
          return;
        }

        if (user.status === 'INACTIVE') {
          res.status(403).json(createAuthError('Account inactive', 'ACCOUNT_INACTIVE'));
          return;
        }

        // Remove sensitive fields
        const { passwordHash, twoFactorSecret, ...safeUser } = user;
        req.user = safeUser;

        next();
      })
      .catch((error) => {
        console.error('Auth middleware error:', error);
        res.status(500).json(createAuthError('Authentication error', 'AUTH_ERROR'));
      });
  } catch (error) {
    if ((error as Error).name === 'TokenExpiredError') {
      res.status(401).json(createAuthError('Token expired', 'TOKEN_EXPIRED'));
      return;
    }

    if ((error as Error).name === 'JsonWebTokenError') {
      res.status(401).json(createAuthError('Invalid token', 'INVALID_TOKEN'));
      return;
    }

    console.error('Auth middleware error:', error);
    res.status(401).json(createAuthError('Authentication failed', 'AUTH_FAILED'));
  }
}

/**
 * Optional authentication - proceed even if not logged in
 * If token is present and valid, user will be attached to request
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.token = token;
    req.tokenPayload = payload;

    getUserById(payload.userId)
      .then((user) => {
        if (user && user.status === 'ACTIVE') {
          const { passwordHash, twoFactorSecret, ...safeUser } = user;
          req.user = safeUser;
        }
        next();
      })
      .catch(() => {
        // Silently continue without user
        next();
      });
  } catch {
    // Invalid token, but continue without authentication
    next();
  }
}

// =============================================================================
// AUTHORIZATION MIDDLEWARE
// =============================================================================

/**
 * Require specific role(s)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(createAuthError('Authentication required', 'AUTH_REQUIRED'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json(
        createAuthError(
          'You do not have permission to perform this action',
          'INSUFFICIENT_PERMISSIONS'
        )
      );
      return;
    }

    next();
  };
}

/**
 * Require admin role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json(createAuthError('Authentication required', 'AUTH_REQUIRED'));
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json(
      createAuthError('Admin access required', 'ADMIN_REQUIRED')
    );
    return;
  }

  next();
}

/**
 * Require owner or admin role
 */
export function requireOwnerOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json(createAuthError('Authentication required', 'AUTH_REQUIRED'));
    return;
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
    res.status(403).json(
      createAuthError('Owner or admin access required', 'OWNER_OR_ADMIN_REQUIRED')
    );
    return;
  }

  next();
}

/**
 * Require email to be verified
 */
export function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json(createAuthError('Authentication required', 'AUTH_REQUIRED'));
    return;
  }

  if (!req.user.emailVerified) {
    res.status(403).json(
      createAuthError('Email verification required', 'EMAIL_NOT_VERIFIED')
    );
    return;
  }

  next();
}

/**
 * Require user to belong to an organization
 */
export function requireOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json(createAuthError('Authentication required', 'AUTH_REQUIRED'));
    return;
  }

  if (!req.user.organizationId) {
    res.status(403).json(
      createAuthError('Organization membership required', 'NO_ORGANIZATION')
    );
    return;
  }

  next();
}

/**
 * Require user to belong to a specific organization
 */
export function requireOrganizationAccess(organizationIdParam: string = 'organizationId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(createAuthError('Authentication required', 'AUTH_REQUIRED'));
      return;
    }

    const targetOrgId = req.params[organizationIdParam] || req.body[organizationIdParam];

    // Admins can access any organization
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    if (!req.user.organizationId || req.user.organizationId !== targetOrgId) {
      res.status(403).json(
        createAuthError('You do not have access to this organization', 'ORG_ACCESS_DENIED')
      );
      return;
    }

    next();
  };
}

/**
 * Require user to be the resource owner or admin
 */
export function requireResourceOwner(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(createAuthError('Authentication required', 'AUTH_REQUIRED'));
      return;
    }

    const targetUserId = req.params[userIdParam] || req.body[userIdParam];

    // Admins can access any resource
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    if (req.user.id !== targetUserId) {
      res.status(403).json(
        createAuthError('You do not have access to this resource', 'RESOURCE_ACCESS_DENIED')
      );
      return;
    }

    next();
  };
}

// =============================================================================
// COMPOSITE MIDDLEWARE
// =============================================================================

/**
 * Require authentication and verified email
 */
export function authenticateVerified(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  authenticate(req, res, () => {
    requireVerifiedEmail(req, res, next);
  });
}

/**
 * Require authentication and organization membership
 */
export function authenticateWithOrg(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  authenticate(req, res, () => {
    requireOrganization(req, res, next);
  });
}

/**
 * Full authentication: verified email + organization
 */
export function authenticateFull(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  authenticate(req, res, () => {
    requireVerifiedEmail(req, res, () => {
      requireOrganization(req, res, next);
    });
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireOwnerOrAdmin,
  requireVerifiedEmail,
  requireOrganization,
  requireOrganizationAccess,
  requireResourceOwner,
  authenticateVerified,
  authenticateWithOrg,
  authenticateFull,
};
