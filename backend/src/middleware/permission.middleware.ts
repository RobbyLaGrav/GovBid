import type { NextFunction, Request, Response } from "express";
import { forbiddenError, unauthorizedError } from "../utils/errors.js";
import { RoleName } from "../utils/constants.js";

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    next(unauthorizedError());
    return;
  }
  next();
};

export const requireRole = (roles: RoleName[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(unauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(forbiddenError());
      return;
    }
    next();
  };
};
