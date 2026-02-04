import crypto from "node:crypto";
import type { Request } from "express";
import { validationError } from "../utils/errors.js";

export interface GithubWebhookEvent {
  id: string;
  event: string;
  action?: string;
  repository?: {
    full_name?: string;
    html_url?: string;
  };
  sender?: {
    login?: string;
    html_url?: string;
  };
  payload: Record<string, unknown>;
}

export const getSignature = (req: Request): string | undefined => {
  const signature = req.headers["x-hub-signature-256"];
  if (Array.isArray(signature)) {
    return signature[0];
  }
  return signature;
};

const createHmac = (secret: string, payload: Buffer): string => {
  const digest = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `sha256=${digest}`;
};

export const verifySignature = (secret: string, payload: Buffer, signature?: string): boolean => {
  if (!signature) return false;
  const expected = createHmac(secret, payload);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

export const parseEvent = (req: Request): GithubWebhookEvent => {
  const event = req.headers["x-github-event"];
  const delivery = req.headers["x-github-delivery"];
  if (!event || !delivery) {
    throw validationError("Missing GitHub event headers");
  }

  const payload = req.body && Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString("utf8")) : {};

  return {
    id: Array.isArray(delivery) ? delivery[0] : delivery,
    event: Array.isArray(event) ? event[0] : event,
    action: typeof payload?.action === "string" ? payload.action : undefined,
    repository: payload?.repository
      ? {
          full_name: payload.repository.full_name,
          html_url: payload.repository.html_url
        }
      : undefined,
    sender: payload?.sender
      ? {
          login: payload.sender.login,
          html_url: payload.sender.html_url
        }
      : undefined,
    payload
  };
};

export const summarizeEvent = (event: GithubWebhookEvent): Record<string, unknown> => {
  const repo = event.repository?.full_name ?? "unknown-repo";
  const sender = event.sender?.login ?? "unknown";

  if (event.event === "ping") {
    return { message: "Webhook ping received", repo, sender };
  }

  if (event.event === "push") {
    const commits = Array.isArray(event.payload.commits) ? event.payload.commits.length : 0;
    return { message: "Push event received", repo, sender, commits };
  }

  if (event.event === "pull_request") {
    const pr = event.payload.pull_request as { number?: number; title?: string } | undefined;
    return {
      message: "Pull request event received",
      repo,
      sender,
      action: event.action,
      prNumber: pr?.number,
      prTitle: pr?.title
    };
  }

  return { message: "Event received", repo, sender, event: event.event, action: event.action };
};
