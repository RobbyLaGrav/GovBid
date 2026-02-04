import { Router } from "express";
import type { Request, Response } from "express";
import { githubWebhookConfig, validateGithubWebhookConfig } from "../config/webhooks.js";
import { getSignature, logWebhookSummary, parseEvent, summarizeEvent, verifySignature } from "../webhooks/github.webhook.js";
import { validationError } from "../utils/errors.js";
import { addWebhookEvent, clearWebhookEvents, getWebhookEvent, listWebhookEvents } from "../webhooks/github.store.js";

export const webhooksRouter = Router();

webhooksRouter.post("/github", (req: Request, res: Response) => {
  const configErrors = validateGithubWebhookConfig();
  if (configErrors.length) {
    throw validationError(`Webhook configuration error: ${configErrors.join(", ")}`);
  }

  const signature = getSignature(req);
  const rawBody = req.body as Buffer;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    throw validationError("Invalid payload; raw body required");
  }

  if (rawBody.byteLength > githubWebhookConfig.maxPayloadBytes) {
    throw validationError("Payload too large");
  }

  const verified = verifySignature(githubWebhookConfig.secret, rawBody, signature);
  if (!verified) {
    throw validationError("Invalid signature");
  }

  const event = parseEvent(req);
  const summary = summarizeEvent(event);

  logWebhookSummary(summary);
  addWebhookEvent(event, summary);

  res.status(200).json({ data: summary });
});

webhooksRouter.get("/github/events", (_req: Request, res: Response) => {
  res.status(200).json({ data: listWebhookEvents() });
});

webhooksRouter.get("/github/events/:id", (req: Request, res: Response) => {
  const record = getWebhookEvent(req.params.id);
  if (!record) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.status(200).json({ data: record });
});

webhooksRouter.delete("/github/events", (_req: Request, res: Response) => {
  clearWebhookEvents();
  res.status(204).send();
});
