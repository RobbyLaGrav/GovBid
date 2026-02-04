import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  logger.info("Incoming request", {
    method: req.method,
    path: req.originalUrl
  });
  next();
};
