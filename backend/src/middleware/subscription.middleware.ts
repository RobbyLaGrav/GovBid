import type { NextFunction, Request, Response } from "express";
import { forbiddenError, unauthorizedError } from "../utils/errors.js";

export const requireActiveSubscription = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    next(unauthorizedError());
    return;
  }

  const isActive = (req.user as { subscriptionActive?: boolean }).subscriptionActive ?? true;
  if (!isActive) {
    next(forbiddenError("Subscription inactive"));
    return;
  }

  next();
};
