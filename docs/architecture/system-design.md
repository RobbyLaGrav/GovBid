# System Design

GovBid Pro is a multi-service platform built around a React frontend, Node/Express backend, and specialized scrapers/AI services.

## High-Level Components

1. **Frontend**
   - React + Redux Toolkit
   - Component-driven layout
   - Websocket subscription for live updates

2. **Backend API**
   - Express + TypeScript
   - Modular service layer
   - REST endpoints + webhook handlers

3. **Scrapers**
   - SAM.gov, state portals, commercial sources
   - Scheduled data ingestion
   - Normalization + storage

4. **AI Services**
   - Document processing
   - Proposal generation
   - Pricing models

5. **Data Stores**
   - PostgreSQL (primary)
   - MongoDB (events)
   - Redis (queues/cache)

## Key Flows

### Contract Discovery

1. Scrapers fetch and normalize opportunities.
2. Records stored in Postgres + raw data in Mongo.
3. Search index updated for fast filtering.

### Bid Compilation

1. User selects opportunity and opens builder.
2. AI service extracts requirements and drafts proposal.
3. Compliance checklist validates required forms.

### Notifications

1. Events queued in Redis.
2. Notification service dispatches email/SMS/push.
3. Delivery events stored in MongoDB.

## Reliability

- Retry policies for scraper jobs.
- Health endpoints for all services.
- Centralized logging and metrics.
