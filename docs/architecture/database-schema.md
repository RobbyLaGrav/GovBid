# Database Schema Overview

GovBid Pro uses PostgreSQL for core transactional data, MongoDB for event-style documents, and Redis for queues/caching.

## PostgreSQL (Primary)

### Core Tables

- **users**: authentication and account metadata.
- **business_profiles**: company details, NAICS, certifications.
- **contracts**: normalized opportunities ingested from scrapers.
- **bids**: proposals tied to contracts.
- **subscriptions**: billing status and plan history.
- **notifications**: alert delivery metadata.

### Analytics Tables

- **analytics_metrics**: daily aggregates.
- **pipeline_snapshots**: funnel snapshots.

### Scraper Tables

- **contract_ingest_runs**: scrape job execution history.
- **scraper_watermarks**: per-source paging watermark.

## MongoDB (Event Store)

- **audit_logs**: user actions.
- **contract_snapshots**: raw ingestion payloads.
- **notification_events**: delivery attempts.

## Redis (Queueing)

- **jobs:contract-scrape**: scraping triggers.
- **jobs:notifications**: email/SMS queue.
- **cache:contracts**: search caching.

## Notes

- Postgres uses UUID primary keys.
- MongoDB stores raw payloads for traceability.
- Redis is configured with LRU eviction for cache keys.
