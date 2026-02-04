import type { NextFunction, Request, Response } from "express";
import { validationError } from "../utils/errors.js";

const MAX_BYTES = 5 * 1024 * 1024;

export const enforceUploadLimit = (req: Request, _res: Response, next: NextFunction) => {
  const lengthHeader = req.headers["content-length"];
  if (lengthHeader) {
    const length = Number(lengthHeader);
    if (Number.isFinite(length) && length > MAX_BYTES) {
      next(validationError("File too large", { maxBytes: MAX_BYTES }));
      return;
    }
  }
  next();
};
