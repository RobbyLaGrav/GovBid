// =============================================================================
// GovBid Pro - Webhook Configuration
// =============================================================================

export interface GithubWebhookConfig {
  secret: string;
  enabledEvents: string[];
  maxPayloadBytes: number;
  enableEventLogging: boolean;
  maxStoredEvents: number;
}

const parseEventList = (value?: string): string[] => {
  if (!value) return ["ping", "push", "pull_request", "issues", "issue_comment"];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const githubWebhookConfig: GithubWebhookConfig = {
  secret: process.env.GITHUB_WEBHOOK_SECRET || "",
  enabledEvents: parseEventList(process.env.GITHUB_WEBHOOK_EVENTS),
  maxPayloadBytes: parseNumber(process.env.GITHUB_WEBHOOK_MAX_BYTES, 1024 * 1024),
  enableEventLogging: process.env.GITHUB_WEBHOOK_LOG_EVENTS !== "false",
  maxStoredEvents: parseNumber(process.env.GITHUB_WEBHOOK_MAX_STORED, 50),
};

export const isGithubEventAllowed = (event: string): boolean =>
  githubWebhookConfig.enabledEvents.includes(event);

export const validateGithubWebhookConfig = (): string[] => {
  const errors: string[] = [];

  if (!githubWebhookConfig.secret) {
    errors.push("GITHUB_WEBHOOK_SECRET is required");
  }

  if (!githubWebhookConfig.enabledEvents.length) {
    errors.push("GITHUB_WEBHOOK_EVENTS must include at least one event type");
  }

  if (githubWebhookConfig.maxPayloadBytes < 1024) {
    errors.push("GITHUB_WEBHOOK_MAX_BYTES must be at least 1024 bytes");
  }

  if (githubWebhookConfig.maxStoredEvents < 1) {
    errors.push("GITHUB_WEBHOOK_MAX_STORED must be at least 1");
  }

  return errors;
};
