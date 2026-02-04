export interface PricingInput {
  baseCost: number;
  laborHours: number;
  overheadRate: number;
  riskBuffer: number;
}

export interface PricingTier {
  tier: "aggressive" | "competitive" | "premium";
  subtotal: number;
  markupRate: number;
  total: number;
}

export class PricingEngineService {
  buildPricing(input: PricingInput): PricingTier[] {
    const laborCost = input.laborHours * (input.baseCost * 0.02);
    const overhead = input.baseCost * input.overheadRate;
    const subtotal = input.baseCost + laborCost + overhead + input.riskBuffer;

    const tiers: PricingTier[] = [
      { tier: "aggressive", markupRate: 0.05, subtotal, total: subtotal * 1.05 },
      { tier: "competitive", markupRate: 0.15, subtotal, total: subtotal * 1.15 },
      { tier: "premium", markupRate: 0.3, subtotal, total: subtotal * 1.3 }
    ];

    return tiers.map((tier) => ({
      ...tier,
      subtotal: Number(tier.subtotal.toFixed(2)),
      total: Number(tier.total.toFixed(2))
    }));
  }
}
