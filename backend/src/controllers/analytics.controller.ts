import type { Request, Response } from "express";
import { buildPagination } from "../utils/helpers.js";

const sampleTrends = [
  { month: "2024-01", bids: 12, wins: 4 },
  { month: "2024-02", bids: 18, wins: 6 },
  { month: "2024-03", bids: 20, wins: 7 },
  { month: "2024-04", bids: 15, wins: 5 }
];

export const analyticsOverview = (_req: Request, res: Response) => {
  res.status(200).json({
    data: {
      pipelineValue: 12500000,
      activeBids: 24,
      winRate: 0.31,
      avgBidValue: 520000,
      forecastedRevenue: 3800000
    }
  });
};

export const analyticsTrends = (req: Request, res: Response) => {
  const meta = buildPagination({ page: req.query.page as unknown as number, pageSize: req.query.pageSize as unknown as number }, sampleTrends.length);
  res.status(200).json({
    data: sampleTrends,
    meta
  });
};
