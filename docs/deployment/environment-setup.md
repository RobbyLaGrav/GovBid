# Environment Setup

This document outlines the required environment variables and secrets for GovBid Pro services.

## Core Application

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Runtime environment | `production` |
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
