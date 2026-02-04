import type { GithubWebhookEvent, WebhookProcessingSummary } from "./github.webhook.js";
import { githubWebhookConfig } from "../config/webhooks.js";

export interface StoredWebhookEvent {
  id: string;
  event: string;
  action?: string;
  repository?: string;
  sender?: string;
  deliveredAt: string;
  summary: WebhookProcessingSummary;
}

const inMemoryStore: StoredWebhookEvent[] = [];

export const listWebhookEvents = (): StoredWebhookEvent[] => {
  return [...inMemoryStore].sort((a, b) => (a.deliveredAt < b.deliveredAt ? 1 : -1));
};

export const addWebhookEvent = (event: GithubWebhookEvent, summary: WebhookProcessingSummary): void => {
  const record: StoredWebhookEvent = {
    id: event.id,
    event: event.event,
    action: event.action,
    repository: event.repository?.full_name,
    sender: event.sender?.login,
    deliveredAt: new Date().toISOString(),
    summary,
  };

  inMemoryStore.unshift(record);
  if (inMemoryStore.length > githubWebhookConfig.maxStoredEvents) {
    inMemoryStore.splice(githubWebhookConfig.maxStoredEvents);
  }
};

export const getWebhookEvent = (id: string): StoredWebhookEvent | undefined =>
  inMemoryStore.find((event) => event.id === id);

export const clearWebhookEvents = (): void => {
  inMemoryStore.splice(0, inMemoryStore.length);
};
