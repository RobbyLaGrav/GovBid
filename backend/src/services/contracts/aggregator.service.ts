import { ContractRecord } from "../../types/contract.types.js";
import { uniqueBy } from "../../utils/helpers.js";
import { UsaSpendingService } from "./usaSpending.service.js";
import { StatePortalsService } from "./statePortals.service.js";

export interface ContractAggregatorOptions {
  includeUsaSpending?: boolean;
  includeStatePortals?: boolean;
}

export class ContractAggregatorService {
  private usaSpending: UsaSpendingService;
  private statePortals: StatePortalsService;

  constructor(usaSpending?: UsaSpendingService, statePortals?: StatePortalsService) {
    this.usaSpending = usaSpending ?? new UsaSpendingService();
    this.statePortals = statePortals ?? new StatePortalsService();
  }

  aggregate(options: ContractAggregatorOptions = {}): ContractRecord[] {
    const { includeUsaSpending = true, includeStatePortals = true } = options;
    let contracts: ContractRecord[] = [];

    if (includeUsaSpending) {
      contracts = contracts.concat(this.usaSpending.list());
    }

    if (includeStatePortals) {
      contracts = contracts.concat(this.statePortals.toContracts());
    }

    return uniqueBy(contracts, (contract) => contract.id);
  }

  refresh(): ContractRecord[] {
    return this.aggregate();
  }
}
