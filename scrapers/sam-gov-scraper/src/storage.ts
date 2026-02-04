import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { SamOpportunity } from "./parser.js";

export interface StorageWriteResult {
  stored: number;
  skipped: number;
  destination: string;
}

export interface SamStorage {
  loadExistingIds(): Promise<Set<string>>;
  persist(opportunities: SamOpportunity[]): Promise<StorageWriteResult>;
}

export interface FileStorageOptions {
  outputPath: string;
  pretty?: boolean;
}

export class FileSamStorage implements SamStorage {
  private outputPath: string;
  private pretty: boolean;

  constructor(options: FileStorageOptions) {
    this.outputPath = resolve(options.outputPath);
    this.pretty = options.pretty ?? true;
  }

  async loadExistingIds(): Promise<Set<string>> {
    const data = await this.readFile();
    const ids = new Set<string>();
    for (const item of data) {
      if (item.externalId) {
        ids.add(item.externalId);
      }
    }
    return ids;
  }

  async persist(opportunities: SamOpportunity[]): Promise<StorageWriteResult> {
    const data = await this.readFile();
    const existingIds = new Set(data.map((item) => item.externalId));

    let stored = 0;
    let skipped = 0;

    for (const opportunity of opportunities) {
      if (existingIds.has(opportunity.externalId)) {
        skipped += 1;
        continue;
      }
      data.push(opportunity);
      existingIds.add(opportunity.externalId);
      stored += 1;
    }

    await this.writeFile(data);

    return {
      stored,
      skipped,
      destination: this.outputPath
    };
  }

  private async readFile(): Promise<SamOpportunity[]> {
    try {
      const raw = await fs.readFile(this.outputPath, "utf-8");
      const parsed = JSON.parse(raw) as SamOpportunity[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  private async writeFile(data: SamOpportunity[]): Promise<void> {
    await fs.mkdir(dirname(this.outputPath), { recursive: true });
    const payload = this.pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await fs.writeFile(this.outputPath, payload, "utf-8");
  }
}

export interface MemoryStorageOptions {
  seed?: SamOpportunity[];
}

export class MemorySamStorage implements SamStorage {
  private records: SamOpportunity[];

  constructor(options?: MemoryStorageOptions) {
    this.records = options?.seed ? [...options.seed] : [];
  }

  async loadExistingIds(): Promise<Set<string>> {
    return new Set(this.records.map((item) => item.externalId));
  }

  async persist(opportunities: SamOpportunity[]): Promise<StorageWriteResult> {
    const existingIds = new Set(this.records.map((item) => item.externalId));
    let stored = 0;
    let skipped = 0;

    for (const opportunity of opportunities) {
      if (existingIds.has(opportunity.externalId)) {
        skipped += 1;
        continue;
      }
      this.records.push(opportunity);
      existingIds.add(opportunity.externalId);
      stored += 1;
    }

    return {
      stored,
      skipped,
      destination: "memory"
    };
  }

  snapshot(): SamOpportunity[] {
    return [...this.records];
  }
}
