import pLimit from "p-limit";
import { BaseStateScraper, StatePortalOpportunity } from "./base.scraper.js";
import {
  CaliforniaScraper,
  FloridaScraper,
  NewYorkScraper,
  TexasScraper
} from "./states/{california,texas,newyork,florida}.scraper.js";

export interface CoordinatorOptions {
  concurrency?: number;
}

export interface CoordinatorResult {
  total: number;
  byState: Record<string, number>;
  opportunities: StatePortalOpportunity[];
}

export class StateScraperCoordinator {
  private scrapers: BaseStateScraper[];
  private options: CoordinatorOptions;

  constructor(options?: CoordinatorOptions) {
    this.options = options ?? {};
    this.scrapers = [
      new CaliforniaScraper(),
      new TexasScraper(),
      new NewYorkScraper(),
      new FloridaScraper()
    ];
  }

  async run(): Promise<CoordinatorResult> {
    const limit = pLimit(this.options.concurrency ?? 2);
    const tasks = this.scrapers.map((scraper) => limit(() => scraper.scrape()));
    const results = await Promise.all(tasks);

    const byState: Record<string, number> = {};
    const opportunities: StatePortalOpportunity[] = [];

    results.forEach((result, index) => {
      const state = this.scrapers[index].constructor.name;
      byState[state] = result.length;
      opportunities.push(...result);
    });

    return {
      total: opportunities.length,
      byState,
      opportunities
    };
  }
}

const coordinator = new StateScraperCoordinator();

coordinator
  .run()
  .then((result) => {
    console.info(`[state-portals] scraped ${result.total} opportunities`, result.byState);
  })
  .catch((error) => {
    console.error("[state-portals] scrape failed", error);
  });
