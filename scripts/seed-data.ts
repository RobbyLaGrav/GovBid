import { promises as fs } from "node:fs";
import { join } from "node:path";

interface SeedContract {
  id: string;
  title: string;
  agency: string;
  status: string;
  dueDate: string | null;
  value: number;
  location: string;
}

const seedContracts: SeedContract[] = [
  {
    id: "seed-001",
    title: "Cloud Migration Support Services",
    agency: "Department of Energy",
    status: "active",
    dueDate: "2024-06-30T00:00:00.000Z",
    value: 1250000,
    location: "Washington, DC"
  },
  {
    id: "seed-002",
    title: "Cybersecurity Assessment",
    agency: "Department of Health",
    status: "active",
    dueDate: "2024-07-15T00:00:00.000Z",
    value: 650000,
    location: "Atlanta, GA"
  },
  {
    id: "seed-003",
    title: "Facilities Maintenance",
    agency: "General Services Administration",
    status: "forecasted",
    dueDate: null,
    value: 2200000,
    location: "Remote"
  }
];

const outputDir = join(process.cwd(), "data");
const outputFile = join(outputDir, "seed-contracts.json");

const writeSeedData = async () => {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(seedContracts, null, 2), "utf-8");
  console.info(`Seed data written to ${outputFile}`);
};

writeSeedData().catch((error) => {
  console.error("Failed to write seed data", error);
  process.exit(1);
});
