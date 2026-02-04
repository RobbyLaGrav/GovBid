import axios, { AxiosInstance } from "axios";
import { load, CheerioAPI } from "cheerio";

export interface StatePortalOpportunity {
  source: string;
  externalId: string;
  title: string;
  agency?: string;
  status?: string;
  postedAt?: string | null;
  dueAt?: string | null;
  url: string;
  location?: string;
  summary?: string;
  raw?: Record<string, unknown>;
}

export interface StateScraperOptions {
  baseUrl: string;
  listPath: string;
  detailPath?: string;
  stateCode: string;
}

export abstract class BaseStateScraper {
  protected client: AxiosInstance;
  protected options: StateScraperOptions;

  constructor(options: StateScraperOptions) {
    this.options = options;
    this.client = axios.create({
      baseURL: options.baseUrl,
      timeout: 30000,
      headers: {
        "User-Agent": "GovBidScraper/1.0"
      }
    });
  }

  async scrape(): Promise<StatePortalOpportunity[]> {
    const html = await this.fetchHtml(this.options.listPath);
    const $ = load(html);
    const list = this.parseList($);

    const enriched = await this.enrichDetails(list);
    return enriched.map((item) => this.normalize(item));
  }

  protected async fetchHtml(path: string): Promise<string> {
    const response = await this.client.get(path);
    return response.data as string;
  }

  protected abstract parseList($: CheerioAPI): StatePortalOpportunity[];

  protected async enrichDetails(items: StatePortalOpportunity[]): Promise<StatePortalOpportunity[]> {
    if (!this.options.detailPath) {
      return items;
    }

    const enriched: StatePortalOpportunity[] = [];

    for (const item of items) {
      if (!item.externalId) {
        enriched.push(item);
        continue;
      }

      const detailPath = this.options.detailPath.replace(":id", item.externalId);
      const html = await this.fetchHtml(detailPath);
      const $ = load(html);
      const detail = this.parseDetail($, item) ?? item;
      enriched.push(detail);
    }

    return enriched;
  }

  protected parseDetail(_$: CheerioAPI, item: StatePortalOpportunity): StatePortalOpportunity | null {
    return item;
  }

  protected normalize(item: StatePortalOpportunity): StatePortalOpportunity {
    return {
      source: item.source ?? this.options.stateCode,
      externalId: item.externalId.trim(),
      title: item.title.trim(),
      agency: item.agency?.trim(),
      status: item.status?.trim(),
      postedAt: this.toIsoDate(item.postedAt),
      dueAt: this.toIsoDate(item.dueAt),
      url: item.url,
      location: item.location?.trim(),
      summary: item.summary?.replace(/\s+/g, " ").trim(),
      raw: item.raw ?? {}
    };
  }

  protected toIsoDate(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  }

  protected textFrom($: CheerioAPI, selector: string): string {
    return $(selector).text().replace(/\s+/g, " ").trim();
  }

  protected attributeFrom($: CheerioAPI, selector: string, attribute: string): string {
    return $(selector).attr(attribute)?.trim() ?? "";
  }
}
