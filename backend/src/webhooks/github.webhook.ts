import crypto from "node:crypto";
import type { Request } from "express";
import { validationError } from "../utils/errors.js";
import { githubWebhookConfig, isGithubEventAllowed } from "../config/webhooks.js";
import { logger } from "../utils/logger.js";

export interface GithubWebhookEvent {
  id: string;
  event: string;
  action?: string;
  repository?: {
    full_name?: string;
    html_url?: string;
    id?: number;
    default_branch?: string;
  };
  sender?: {
    login?: string;
    html_url?: string;
    id?: number;
  };
  payload: Record<string, unknown>;
}

export interface WebhookProcessingSummary {
  message: string;
  repo: string;
  sender: string;
  event: string;
  action?: string;
  metadata: Record<string, unknown>;
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
          html_url: payload.repository.html_url,
          id: payload.repository.id,
          default_branch: payload.repository.default_branch
        }
      : undefined,
    sender: payload?.sender
      ? {
          login: payload.sender.login,
          html_url: payload.sender.html_url,
          id: payload.sender.id
        }
      : undefined,
    payload
  };
};

const baseSummary = (event: GithubWebhookEvent, metadata: Record<string, unknown>): WebhookProcessingSummary => ({
  message: "Event received",
  repo: event.repository?.full_name ?? "unknown-repo",
  sender: event.sender?.login ?? "unknown",
  event: event.event,
  action: event.action,
  metadata
});

const extractCommitStats = (payload: Record<string, unknown>): Record<string, unknown> => {
  const commits = Array.isArray(payload.commits) ? payload.commits : [];
  const distinctAuthors = new Set(
    commits
      .map((commit) => (commit as { author?: { username?: string; name?: string } }).author)
      .map((author) => author?.username ?? author?.name)
      .filter((value): value is string => Boolean(value))
  );

  return {
    commitCount: commits.length,
    distinctAuthors: distinctAuthors.size,
    ref: payload.ref,
    compareUrl: payload.compare
  };
};

const extractPullRequestInfo = (payload: Record<string, unknown>): Record<string, unknown> => {
  const pullRequest = payload.pull_request as
    | {
        number?: number;
        title?: string;
        state?: string;
        merged?: boolean;
        html_url?: string;
        additions?: number;
        deletions?: number;
        changed_files?: number;
      }
    | undefined;

  return {
    number: pullRequest?.number,
    title: pullRequest?.title,
    state: pullRequest?.state,
    merged: pullRequest?.merged,
    url: pullRequest?.html_url,
    additions: pullRequest?.additions,
    deletions: pullRequest?.deletions,
    changedFiles: pullRequest?.changed_files
  };
};

const extractIssueInfo = (payload: Record<string, unknown>): Record<string, unknown> => {
  const issue = payload.issue as { number?: number; title?: string; state?: string; html_url?: string } | undefined;
  return {
    number: issue?.number,
    title: issue?.title,
    state: issue?.state,
    url: issue?.html_url
  };
};

const extractCommentInfo = (payload: Record<string, unknown>): Record<string, unknown> => {
  const comment = payload.comment as { id?: number; html_url?: string; body?: string } | undefined;
  const bodyPreview = comment?.body ? `${comment.body.substring(0, 140)}${comment.body.length > 140 ? "…" : ""}` : undefined;
  return {
    id: comment?.id,
    url: comment?.html_url,
    preview: bodyPreview
  };
};

export const summarizeEvent = (event: GithubWebhookEvent): WebhookProcessingSummary => {
  const basePayload = event.payload ?? {};

  if (!isGithubEventAllowed(event.event)) {
    return baseSummary(event, { ignored: true, reason: "event_not_enabled" });
  }

  if (event.event === "ping") {
    return {
      ...baseSummary(event, { zen: basePayload.zen, hookId: basePayload.hook_id }),
      message: "Webhook ping received"
    };
  }

  if (event.event === "push") {
    return {
      ...baseSummary(event, extractCommitStats(basePayload)),
      message: "Push event received"
    };
  }

  if (event.event === "pull_request") {
    return {
      ...baseSummary(event, extractPullRequestInfo(basePayload)),
      message: "Pull request event received"
    };
  }

  if (event.event === "issues") {
    return {
      ...baseSummary(event, extractIssueInfo(basePayload)),
      message: "Issue event received"
    };
  }

  if (event.event === "issue_comment") {
    return {
      ...baseSummary(event, { ...extractIssueInfo(basePayload), ...extractCommentInfo(basePayload) }),
      message: "Issue comment event received"
    };
  }

  return baseSummary(event, { notice: "Unhandled event type" });
};

export const logWebhookSummary = (summary: WebhookProcessingSummary): void => {
  if (!githubWebhookConfig.enableEventLogging) return;
  logger.info("GitHub webhook received", summary);
};
