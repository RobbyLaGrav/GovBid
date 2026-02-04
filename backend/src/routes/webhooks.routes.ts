import { Router } from "express";
import type { Request, Response } from "express";
import { getSignature, parseEvent, summarizeEvent, verifySignature } from "../webhooks/github.webhook.js";
import { validationError } from "../utils/errors.js";

export const webhooksRouter = Router();

webhooksRouter.post("/github", (req: Request, res: Response) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  if (!secret) {
    throw validationError("GITHUB_WEBHOOK_SECRET is not configured");
  }

  const signature = getSignature(req);
  const rawBody = req.body as Buffer;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    throw validationError("Invalid payload; raw body required");
  }

  const verified = verifySignature(secret, rawBody, signature);
  if (!verified) {
    throw validationError("Invalid signature");
  }

  const event = parseEvent(req);
  const summary = summarizeEvent(event);

  res.status(200).json({ data: summary });
});
