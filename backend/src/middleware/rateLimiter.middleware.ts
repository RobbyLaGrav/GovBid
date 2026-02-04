import type { NextFunction, Request, Response } from "express";
import { rateLimitedError } from "../utils/errors.js";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const getKey = (req: Request, keyGenerator?: (req: Request) => string): string => {
  if (keyGenerator) return keyGenerator(req);
  return req.ip ?? "unknown";
};

export const createRateLimiter = (options: RateLimitOptions) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = getKey(req, options.keyGenerator);
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > options.max) {
      next(rateLimitedError());
      return;
    }

    store.set(key, existing);
    next();
  };
};
