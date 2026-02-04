import axios, { AxiosInstance } from "axios";
import pLimit from "p-limit";
import { parseSamSearchResponse, SamSearchResponse } from "./parser.js";
import { SamStorage } from "./storage.js";
import { logger } from "./logger.js";

export interface SamScraperOptions {
  baseUrl: string;
  apiKey?: string;
  pageSize?: number;
  maxPages?: number;
  concurrency?: number;
  keywords?: string[];
  filters?: {
    naics?: string[];
    setAsides?: string[];
    activeOnly?: boolean;
  };
}

export interface SamScrapeResult {
  fetched: number;
  stored: number;
  skipped: number;
  pages: number;
  tookMs: number;
}

export class SamScraper {
  private client: AxiosInstance;
  private options: SamScraperOptions;
  private storage: SamStorage;

  constructor(options: SamScraperOptions, storage: SamStorage) {
    this.options = options;
    this.storage = storage;
    this.client = axios.create({
      baseURL: options.baseUrl,
      headers: options.apiKey ? { "X-API-Key": options.apiKey } : undefined,
      timeout: 30000
    });
  }

  async run(): Promise<SamScrapeResult> {
    const startedAt = Date.now();
    const pageSize = this.options.pageSize ?? 25;
    const maxPages = this.options.maxPages ?? 3;
    const concurrency = this.options.concurrency ?? 2;
    const limit = pLimit(concurrency);

    const tasks = Array.from({ length: maxPages }, (_, index) => index + 1).map((page) =>
      limit(() => this.fetchPage(page, pageSize))
    );

    const responses = await Promise.all(tasks);
    const allOpportunities = responses.flatMap((response) => response.opportunities);

    const persisted = await this.storage.persist(allOpportunities);

    return {
      fetched: allOpportunities.length,
      stored: persisted.stored,
      skipped: persisted.skipped,
      pages: responses.length,
      tookMs: Date.now() - startedAt
    };
  }

  private async fetchPage(page: number, size: number): Promise<SamSearchResponse> {
    const params = this.buildQueryParams(page, size);
    logger.info("Fetching SAM.gov page", { page, size, params });

    const response = await this.client.get("/search", { params });
    return parseSamSearchResponse(response.data);
  }

  private buildQueryParams(page: number, size: number): Record<string, string | number> {
    const params: Record<string, string | number> = {
      page,
      size,
      api_version: "v1"
    };

    if (this.options.keywords && this.options.keywords.length > 0) {
      params.keywords = this.options.keywords.join(" ");
    }

    if (this.options.filters?.naics && this.options.filters.naics.length > 0) {
      params.naics = this.options.filters.naics.join(",");
    }

    if (this.options.filters?.setAsides && this.options.filters.setAsides.length > 0) {
      params.set_asides = this.options.filters.setAsides.join(",");
    }

    if (this.options.filters?.activeOnly) {
      params.active = "true";
    }

    return params;
  }
}
