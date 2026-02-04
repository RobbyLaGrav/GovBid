-- GovBid PostgreSQL bootstrap

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS govbid;

CREATE TABLE IF NOT EXISTS govbid.healthcheck (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO govbid.healthcheck (status) VALUES ('ready');

CREATE TABLE IF NOT EXISTS govbid.contract_ingest_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE,
  fetched_count INTEGER DEFAULT 0,
  stored_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS contract_ingest_runs_source_idx
  ON govbid.contract_ingest_runs (source, started_at DESC);

CREATE TABLE IF NOT EXISTS govbid.scraper_watermarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  watermark_key TEXT NOT NULL,
  watermark_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (source, watermark_key)
);

GRANT USAGE ON SCHEMA govbid TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA govbid TO PUBLIC;
