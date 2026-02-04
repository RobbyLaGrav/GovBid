import { ContractRecord } from "../../types/contract.types.js";
import { sanitizeString } from "../../utils/helpers.js";

export interface StatePortalListing {
  id: string;
  state: string;
  title: string;
  agency: string;
  status: string;
  dueAt?: string | null;
  url: string;
  naics?: string[];
  value?: number;
}

const sampleListings: StatePortalListing[] = [
  {
    id: "ca-1001",
    state: "CA",
    title: "Facilities Maintenance Services",
    agency: "California Dept. of Transportation",
    status: "active",
    dueAt: "2024-06-20T00:00:00.000Z",
    url: "https://caleprocure.ca.gov/event/1001",
    naics: ["561210"],
    value: 1200000
  },
  {
    id: "tx-2044",
    state: "TX",
    title: "IT Help Desk Modernization",
    agency: "Texas Department of Information Resources",
    status: "active",
    dueAt: "2024-07-05T00:00:00.000Z",
    url: "https://apps.tx.gov/cpa/opportunities/2044",
    naics: ["541519"],
    value: 780000
  }
];

export class StatePortalsService {
  private listings: StatePortalListing[];

  constructor(seed?: StatePortalListing[]) {
    this.listings = seed ? [...seed] : [...sampleListings];
  }

  list(state?: string): StatePortalListing[] {
    if (!state) return this.listings;
    return this.listings.filter((listing) => listing.state === state.toUpperCase());
  }

  toContracts(): ContractRecord[] {
    return this.listings.map((listing) => ({
      id: `state-${listing.id}`,
      externalId: listing.id,
      title: sanitizeString(listing.title) ?? listing.title,
      agency: sanitizeString(listing.agency),
      status: listing.status === "active" ? "active" : "forecasted",
      value: listing.value,
      postedAt: null,
      dueAt: listing.dueAt ?? null,
      naicsCodes: listing.naics ?? [],
      setAside: "State Local",
      summary: `Opportunity from ${listing.state} portal`,
      location: listing.state,
      source: `state-${listing.state}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }
}
