# Environment Setup

This document outlines the required environment variables and secrets for GovBid Pro services.

## Core Application

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Runtime environment | `production` |
| `GITHUB_WEBHOOK_SECRET` | Secret for verifying GitHub webhook signatures | `change-me` |
| `GITHUB_WEBHOOK_EVENTS` | Comma-separated GitHub events to accept | `ping,push,pull_request,issues,issue_comment` |
| `GITHUB_WEBHOOK_MAX_BYTES` | Max payload size (bytes) for webhook deliveries | `1048576` |
| `GITHUB_WEBHOOK_LOG_EVENTS` | Toggle logging of webhook summaries | `true` |
| `GITHUB_WEBHOOK_MAX_STORED` | Max in-memory webhook events to retain | `50` |
| `PORT` | API port | `3000` |
| `DATABASE_URL` | Postgres connection string | `postgresql://user:pass@host:5432/govbid` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `MONGODB_URI` | MongoDB connection | `mongodb://user:pass@host:27017/govbid` |

## Auth & Security

| Variable | Description |
| --- | --- |
| `JWT_SECRET` | Token signing secret |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `SESSION_SECRET` | Session encryption key |

## AI Services

| Variable | Description |
| --- | --- |
| `CLAUDE_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `EMBEDDINGS_MODEL` | Embeddings model name |

## Integrations

| Variable | Description |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `OUTLOOK_CLIENT_ID` | Microsoft OAuth client ID |
| `OUTLOOK_CLIENT_SECRET` | Microsoft OAuth client secret |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |

## Scrapers

| Variable | Description |
| --- | --- |
| `SAM_GOV_API_KEY` | SAM.gov API key |
| `SCRAPER_OUTPUT_DIR` | Local scrape output directory |

## Logging & Observability

| Variable | Description |
| --- | --- |
| `LOG_LEVEL` | Logging verbosity |
| `SENTRY_DSN` | Sentry DSN |

## Notes

- Store secrets in a vault or secrets manager.
- Never commit `.env` files with secrets to source control.
