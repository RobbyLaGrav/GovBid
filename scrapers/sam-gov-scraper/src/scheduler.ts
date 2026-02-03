import { SamScraper } from "./scraper.js";
import { logger } from "./logger.js";

export interface SchedulerOptions {
  intervalMs: number;
  immediate?: boolean;
  maxRuns?: number;
  failureBackoffMs?: number;
}

export type SchedulerEvent = "run-start" | "run-success" | "run-failure" | "stopped";

export interface SchedulerListener {
  (event: SchedulerEvent, payload?: Record<string, unknown>): void;
}

export interface SchedulerStats {
  runs: number;
  failures: number;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
}

export class ScraperScheduler {
  private scraper: SamScraper;
  private options: SchedulerOptions;
  private timer: NodeJS.Timeout | null = null;
  private runCount = 0;
  private running = false;
  private failures = 0;
  private listeners = new Set<SchedulerListener>();
  private lastError?: string;
  private lastRunAt?: string;
  private lastSuccessAt?: string;
  private lastFailureAt?: string;

  constructor(scraper: SamScraper, options: SchedulerOptions) {
    this.scraper = scraper;
    this.options = options;
  }

  start(): void {
    if (this.timer) {
      return;
    }

    if (this.options.immediate) {
      void this.executeRun("startup");
    }

    this.timer = setInterval(() => {
      void this.executeRun("interval");
    }, this.options.intervalMs);

    logger.info("Scheduler started", {
      intervalMs: this.options.intervalMs,
      immediate: this.options.immediate ?? false
    });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.emit("stopped");
      logger.info("Scheduler stopped");
    }
  }

  on(listener: SchedulerListener): void {
    this.listeners.add(listener);
  }

  off(listener: SchedulerListener): void {
    this.listeners.delete(listener);
  }

  stats(): SchedulerStats {
    return {
      runs: this.runCount,
      failures: this.failures,
      lastRunAt: this.lastRunAt,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastError: this.lastError
    };
  }

  async executeRun(trigger: "startup" | "interval" | "manual"): Promise<void> {
    if (this.running) {
      logger.warn("Scraper run skipped (already running)", { trigger });
      return;
    }

    if (this.options.maxRuns && this.runCount >= this.options.maxRuns) {
      logger.warn("Scraper run skipped (max runs reached)", { trigger });
      this.stop();
      return;
    }

    this.running = true;
    this.runCount += 1;
    this.lastRunAt = new Date().toISOString();
    this.emit("run-start", { trigger, runCount: this.runCount });

    try {
      logger.info("Scraper run started", { trigger, runCount: this.runCount });
      const result = await this.scraper.run();
      this.lastSuccessAt = new Date().toISOString();
      this.emit("run-success", { trigger, result });
      logger.info("Scraper run completed", { trigger, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.failures += 1;
      this.lastFailureAt = new Date().toISOString();
      this.lastError = message;
      this.emit("run-failure", { trigger, message });
      logger.error("Scraper run failed", { trigger, message });
      await this.applyBackoff();
    } finally {
      this.running = false;
    }
  }

  private emit(event: SchedulerEvent, payload?: Record<string, unknown>): void {
    this.listeners.forEach((listener) => listener(event, payload));
  }

  private async applyBackoff(): Promise<void> {
    if (!this.options.failureBackoffMs) {
      return;
    }
    logger.warn("Applying failure backoff", { delayMs: this.options.failureBackoffMs });
    await new Promise((resolve) => setTimeout(resolve, this.options.failureBackoffMs));
  }
}
