export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const MIN_PASSWORD_LENGTH = 12;
export const TOKEN_ISSUER = "govbid-api";

export const ROLE_NAMES = ["admin", "manager", "contributor", "viewer"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const CONTRACT_STATUSES = [
  "active",
  "forecasted",
  "awarded",
  "closed",
  "cancelled"
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const BID_STATUSES = ["draft", "submitted", "awarded", "lost"] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NOTIFICATION_CHANNELS = ["email", "sms", "push", "webhook"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const RATE_LIMITS = {
  auth: { windowMs: 60_000, max: 10 },
  api: { windowMs: 60_000, max: 120 }
};
