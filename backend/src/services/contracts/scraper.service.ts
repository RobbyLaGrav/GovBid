import { ContractRecord } from "../../types/contract.types.js";
import { ContractAggregatorService } from "./aggregator.service.js";

export interface ScrapeRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "completed" | "failed";
  fetched: number;
  stored: number;
  skipped: number;
  error?: string;
}

export class ContractScraperService {
  private runs: ScrapeRun[] = [];
  private aggregator: ContractAggregatorService;
  private records: ContractRecord[] = [];

  constructor(aggregator?: ContractAggregatorService) {
    this.aggregator = aggregator ?? new ContractAggregatorService();
  }

  listRuns(): ScrapeRun[] {
    return [...this.runs];
  }

  listContracts(): ContractRecord[] {
    return [...this.records];
  }

  async run(): Promise<ScrapeRun> {
    const run: ScrapeRun = {
      id: `run_${this.runs.length + 1}`,
      startedAt: new Date().toISOString(),
      status: "running",
      fetched: 0,
      stored: 0,
      skipped: 0
    };
    this.runs.push(run);

    try {
      const contracts = this.aggregator.refresh();
      run.fetched = contracts.length;

      const existingIds = new Set(this.records.map((record) => record.id));
      contracts.forEach((contract) => {
        if (existingIds.has(contract.id)) {
          run.skipped += 1;
          return;
        }
        this.records.push(contract);
        existingIds.add(contract.id);
        run.stored += 1;
      });

      run.status = "completed";
      run.finishedAt = new Date().toISOString();
    } catch (error) {
      run.status = "failed";
      run.finishedAt = new Date().toISOString();
      run.error = error instanceof Error ? error.message : String(error);
    }

    return run;
  }
}
