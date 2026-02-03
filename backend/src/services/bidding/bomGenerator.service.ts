// =============================================================================
// GovBid Pro - Bill of Materials (BOM) Generator Service
// =============================================================================
// AI-powered BOM generation with 3-tier pricing
// =============================================================================

import { prisma } from '../../config';
import {
  getClaudeClient,
  claudeConfig,
  systemPrompts,
} from '../../config';
import type { Contract, ContractRequirement, BOMItem, PricingTier } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// TYPES
// =============================================================================

export interface BOMLineItem {
  lineNumber: number;
  category: BOMCategory;
  description: string;
  unit: string;
  quantity: number;
  laborHours?: number;
  laborRate?: number;
  materialCost?: number;
  pricing: {
    aggressive: { unitPrice: number; totalPrice: number };
    competitive: { unitPrice: number; totalPrice: number };
    premium: { unitPrice: number; totalPrice: number };
  };
  notes?: string;
  vendorQuote?: string;
}

export type BOMCategory =
  | 'LABOR'
  | 'MATERIAL'
  | 'EQUIPMENT'
  | 'SUBCONTRACT'
  | 'TRAVEL'
  | 'ODC'
  | 'OTHER';

export interface BOMTotals {
  labor: number;
  materials: number;
  equipment: number;
  subcontracts: number;
  travel: number;
  odc: number;
  subtotal: number;
  overhead: number;
  profit: number;
  total: number;
}

export interface GeneratedBOM {
  bidId: string;
  items: BOMLineItem[];
  totals: {
    aggressive: BOMTotals;
    competitive: BOMTotals;
    premium: BOMTotals;
  };
  assumptions: string[];
  generatedAt: Date;
}

export interface PricingMultipliers {
  aggressive: number;
  competitive: number;
  premium: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MULTIPLIERS: PricingMultipliers = {
  aggressive: 0.85, // 15% below market
  competitive: 1.0,  // Market rate
  premium: 1.20,    // 20% above market
};

const OVERHEAD_RATES = {
  aggressive: 0.15, // 15% overhead
  competitive: 0.20, // 20% overhead
  premium: 0.25,    // 25% overhead
};

const PROFIT_MARGINS = {
  aggressive: 0.05, // 5% profit
  competitive: 0.10, // 10% profit
  premium: 0.15,    // 15% profit
};

const DEFAULT_LABOR_RATES: Record<string, number> = {
  'Project Manager': 150,
  'Senior Engineer': 135,
  'Engineer': 110,
  'Technician': 85,
  'Administrator': 65,
  'Subject Matter Expert': 175,
  'Quality Assurance': 95,
  'Technical Writer': 80,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate prices for all three tiers
 */
function calculateTieredPricing(
  baseUnitPrice: number,
  quantity: number,
  multipliers: PricingMultipliers = DEFAULT_MULTIPLIERS
): BOMLineItem['pricing'] {
  return {
    aggressive: {
      unitPrice: Math.round(baseUnitPrice * multipliers.aggressive * 100) / 100,
      totalPrice: Math.round(baseUnitPrice * multipliers.aggressive * quantity * 100) / 100,
    },
    competitive: {
      unitPrice: Math.round(baseUnitPrice * multipliers.competitive * 100) / 100,
      totalPrice: Math.round(baseUnitPrice * multipliers.competitive * quantity * 100) / 100,
    },
    premium: {
      unitPrice: Math.round(baseUnitPrice * multipliers.premium * 100) / 100,
      totalPrice: Math.round(baseUnitPrice * multipliers.premium * quantity * 100) / 100,
    },
  };
}

/**
 * Calculate totals for a pricing tier
 */
function calculateTotals(
  items: BOMLineItem[],
  tier: 'aggressive' | 'competitive' | 'premium'
): BOMTotals {
  const categoryTotals: Record<string, number> = {
    LABOR: 0,
    MATERIAL: 0,
    EQUIPMENT: 0,
    SUBCONTRACT: 0,
    TRAVEL: 0,
    ODC: 0,
    OTHER: 0,
  };

  for (const item of items) {
    categoryTotals[item.category] += item.pricing[tier].totalPrice;
  }

  const subtotal = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  const overhead = subtotal * OVERHEAD_RATES[tier];
  const profit = (subtotal + overhead) * PROFIT_MARGINS[tier];
  const total = subtotal + overhead + profit;

  return {
    labor: Math.round(categoryTotals.LABOR * 100) / 100,
    materials: Math.round(categoryTotals.MATERIAL * 100) / 100,
    equipment: Math.round(categoryTotals.EQUIPMENT * 100) / 100,
    subcontracts: Math.round(categoryTotals.SUBCONTRACT * 100) / 100,
    travel: Math.round(categoryTotals.TRAVEL * 100) / 100,
    odc: Math.round((categoryTotals.ODC + categoryTotals.OTHER) * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    overhead: Math.round(overhead * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Parse JSON from Claude response
 */
function parseJSONResponse<T>(response: string): T {
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return JSON.parse(cleaned.trim()) as T;
}

// =============================================================================
// AI-POWERED BOM GENERATION
// =============================================================================

/**
 * Generate BOM using AI analysis
 */
export async function generateBOM(
  bidId: string,
  contract: Contract,
  requirements: ContractRequirement[],
  defaultTier: PricingTier = 'COMPETITIVE'
): Promise<GeneratedBOM> {
  const client = getClaudeClient();

  // Build context for AI
  const requirementsList = requirements
    .filter((r) => r.isMandatory)
    .map((r, i) => `${i + 1}. ${r.requirement}`)
    .join('\n');

  const prompt = `Create a detailed Bill of Materials (BOM) for this government contract.

CONTRACT:
Title: ${contract.title}
Agency: ${contract.agency || 'Not specified'}
Estimated Value: ${contract.estimatedValue ? `$${Number(contract.estimatedValue).toLocaleString()}` : 'Not specified'}
Period of Performance: ${contract.performanceStartDate ? `${new Date(contract.performanceStartDate).toLocaleDateString()} - ${contract.performanceEndDate ? new Date(contract.performanceEndDate).toLocaleDateString() : 'TBD'}` : 'Not specified'}

REQUIREMENTS:
${requirementsList || 'No specific requirements provided'}

DESCRIPTION:
${contract.description?.slice(0, 2000) || 'No description available'}

Generate a comprehensive BOM with line items. For each item, provide:
- Category (LABOR, MATERIAL, EQUIPMENT, SUBCONTRACT, TRAVEL, ODC)
- Description
- Unit of measure
- Quantity
- Base unit price (competitive/market rate)
- Labor hours and rate if applicable

Return JSON in this exact format:
{
  "items": [
    {
      "category": "LABOR",
      "description": "Project Manager",
      "unit": "HOUR",
      "quantity": 160,
      "laborHours": 160,
      "laborRate": 150,
      "baseUnitPrice": 150,
      "notes": "Assumed 4 weeks full-time"
    },
    {
      "category": "MATERIAL",
      "description": "Network equipment",
      "unit": "LOT",
      "quantity": 1,
      "baseUnitPrice": 25000,
      "notes": "Estimate based on requirements"
    }
  ],
  "assumptions": [
    "Assumed 6-month performance period",
    "Labor rates based on current GSA rates"
  ]
}

Be thorough and realistic. Include all labor categories, materials, equipment, travel, and other direct costs needed to fulfill the requirements.`;

  const response = await client.messages.create({
    model: claudeConfig.model,
    max_tokens: 4096,
    temperature: 0.7,
    system: systemPrompts.bomGeneration,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || !('text' in textContent)) {
    throw new Error('No response from AI');
  }

  const aiResult = parseJSONResponse<{
    items: Array<{
      category: BOMCategory;
      description: string;
      unit: string;
      quantity: number;
      laborHours?: number;
      laborRate?: number;
      baseUnitPrice: number;
      notes?: string;
    }>;
    assumptions: string[];
  }>(textContent.text);

  // Convert AI result to BOM items with tiered pricing
  const items: BOMLineItem[] = aiResult.items.map((item, index) => ({
    lineNumber: index + 1,
    category: item.category,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    laborHours: item.laborHours,
    laborRate: item.laborRate,
    materialCost: item.category === 'MATERIAL' ? item.baseUnitPrice : undefined,
    pricing: calculateTieredPricing(item.baseUnitPrice, item.quantity),
    notes: item.notes,
  }));

  // Calculate totals for all tiers
  const totals = {
    aggressive: calculateTotals(items, 'aggressive'),
    competitive: calculateTotals(items, 'competitive'),
    premium: calculateTotals(items, 'premium'),
  };

  // Save items to database
  await saveBOMItems(bidId, items);

  return {
    bidId,
    items,
    totals,
    assumptions: aiResult.assumptions,
    generatedAt: new Date(),
  };
}

/**
 * Save BOM items to database
 */
async function saveBOMItems(bidId: string, items: BOMLineItem[]): Promise<void> {
  // Delete existing items
  await prisma.bOMItem.deleteMany({
    where: { bidId },
  });

  // Insert new items
  await prisma.bOMItem.createMany({
    data: items.map((item) => ({
      bidId,
      lineNumber: item.lineNumber,
      category: item.category,
      description: item.description,
      unit: item.unit,
      quantity: new Decimal(item.quantity),
      laborHours: item.laborHours ? new Decimal(item.laborHours) : null,
      laborRate: item.laborRate ? new Decimal(item.laborRate) : null,
      materialCost: item.materialCost ? new Decimal(item.materialCost) : null,
      aggressiveUnitPrice: new Decimal(item.pricing.aggressive.unitPrice),
      aggressiveTotalPrice: new Decimal(item.pricing.aggressive.totalPrice),
      competitiveUnitPrice: new Decimal(item.pricing.competitive.unitPrice),
      competitiveTotalPrice: new Decimal(item.pricing.competitive.totalPrice),
      premiumUnitPrice: new Decimal(item.pricing.premium.unitPrice),
      premiumTotalPrice: new Decimal(item.pricing.premium.totalPrice),
      notes: item.notes,
    })),
  });
}

// =============================================================================
// BOM MANAGEMENT
// =============================================================================

/**
 * Get BOM items for a bid
 */
export async function getBOMItems(bidId: string): Promise<BOMItem[]> {
  return prisma.bOMItem.findMany({
    where: { bidId },
    orderBy: { lineNumber: 'asc' },
  });
}

/**
 * Add a manual BOM item
 */
export async function addBOMItem(
  bidId: string,
  item: Omit<BOMLineItem, 'lineNumber' | 'pricing'> & { baseUnitPrice: number }
): Promise<BOMItem> {
  // Get next line number
  const lastItem = await prisma.bOMItem.findFirst({
    where: { bidId },
    orderBy: { lineNumber: 'desc' },
  });
  const lineNumber = (lastItem?.lineNumber || 0) + 1;

  const pricing = calculateTieredPricing(item.baseUnitPrice, item.quantity);

  return prisma.bOMItem.create({
    data: {
      bidId,
      lineNumber,
      category: item.category,
      description: item.description,
      unit: item.unit,
      quantity: new Decimal(item.quantity),
      laborHours: item.laborHours ? new Decimal(item.laborHours) : null,
      laborRate: item.laborRate ? new Decimal(item.laborRate) : null,
      materialCost: item.materialCost ? new Decimal(item.materialCost) : null,
      aggressiveUnitPrice: new Decimal(pricing.aggressive.unitPrice),
      aggressiveTotalPrice: new Decimal(pricing.aggressive.totalPrice),
      competitiveUnitPrice: new Decimal(pricing.competitive.unitPrice),
      competitiveTotalPrice: new Decimal(pricing.competitive.totalPrice),
      premiumUnitPrice: new Decimal(pricing.premium.unitPrice),
      premiumTotalPrice: new Decimal(pricing.premium.totalPrice),
      notes: item.notes,
      vendorQuote: item.vendorQuote,
    },
  });
}

/**
 * Update a BOM item
 */
export async function updateBOMItem(
  itemId: string,
  bidId: string,
  updates: Partial<Omit<BOMLineItem, 'pricing'> & { baseUnitPrice?: number }>
): Promise<BOMItem> {
  const item = await prisma.bOMItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.bidId !== bidId) {
    throw new Error('BOM item not found');
  }

  const updateData: Parameters<typeof prisma.bOMItem.update>[0]['data'] = {};

  if (updates.category) updateData.category = updates.category;
  if (updates.description) updateData.description = updates.description;
  if (updates.unit) updateData.unit = updates.unit;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.vendorQuote !== undefined) updateData.vendorQuote = updates.vendorQuote;
  if (updates.laborHours !== undefined) {
    updateData.laborHours = updates.laborHours ? new Decimal(updates.laborHours) : null;
  }
  if (updates.laborRate !== undefined) {
    updateData.laborRate = updates.laborRate ? new Decimal(updates.laborRate) : null;
  }

  // Recalculate pricing if quantity or price changed
  if (updates.quantity !== undefined || updates.baseUnitPrice !== undefined) {
    const quantity = updates.quantity ?? Number(item.quantity);
    const basePrice = updates.baseUnitPrice ?? Number(item.competitiveUnitPrice);
    const pricing = calculateTieredPricing(basePrice, quantity);

    updateData.quantity = new Decimal(quantity);
    updateData.aggressiveUnitPrice = new Decimal(pricing.aggressive.unitPrice);
    updateData.aggressiveTotalPrice = new Decimal(pricing.aggressive.totalPrice);
    updateData.competitiveUnitPrice = new Decimal(pricing.competitive.unitPrice);
    updateData.competitiveTotalPrice = new Decimal(pricing.competitive.totalPrice);
    updateData.premiumUnitPrice = new Decimal(pricing.premium.unitPrice);
    updateData.premiumTotalPrice = new Decimal(pricing.premium.totalPrice);
  }

  return prisma.bOMItem.update({
    where: { id: itemId },
    data: updateData,
  });
}

/**
 * Delete a BOM item
 */
export async function deleteBOMItem(itemId: string, bidId: string): Promise<void> {
  const item = await prisma.bOMItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.bidId !== bidId) {
    throw new Error('BOM item not found');
  }

  await prisma.bOMItem.delete({
    where: { id: itemId },
  });

  // Renumber remaining items
  const remainingItems = await prisma.bOMItem.findMany({
    where: { bidId },
    orderBy: { lineNumber: 'asc' },
  });

  for (let i = 0; i < remainingItems.length; i++) {
    if (remainingItems[i].lineNumber !== i + 1) {
      await prisma.bOMItem.update({
        where: { id: remainingItems[i].id },
        data: { lineNumber: i + 1 },
      });
    }
  }
}

/**
 * Calculate BOM totals
 */
export async function calculateBOMTotals(bidId: string): Promise<{
  aggressive: BOMTotals;
  competitive: BOMTotals;
  premium: BOMTotals;
}> {
  const dbItems = await prisma.bOMItem.findMany({
    where: { bidId },
  });

  // Convert to BOMLineItem format
  const items: BOMLineItem[] = dbItems.map((item) => ({
    lineNumber: item.lineNumber,
    category: item.category as BOMCategory,
    description: item.description,
    unit: item.unit || 'EACH',
    quantity: Number(item.quantity),
    laborHours: item.laborHours ? Number(item.laborHours) : undefined,
    laborRate: item.laborRate ? Number(item.laborRate) : undefined,
    materialCost: item.materialCost ? Number(item.materialCost) : undefined,
    pricing: {
      aggressive: {
        unitPrice: Number(item.aggressiveUnitPrice),
        totalPrice: Number(item.aggressiveTotalPrice),
      },
      competitive: {
        unitPrice: Number(item.competitiveUnitPrice),
        totalPrice: Number(item.competitiveTotalPrice),
      },
      premium: {
        unitPrice: Number(item.premiumUnitPrice),
        totalPrice: Number(item.premiumTotalPrice),
      },
    },
    notes: item.notes || undefined,
  }));

  return {
    aggressive: calculateTotals(items, 'aggressive'),
    competitive: calculateTotals(items, 'competitive'),
    premium: calculateTotals(items, 'premium'),
  };
}

/**
 * Clone BOM from another bid
 */
export async function cloneBOM(sourceBidId: string, targetBidId: string): Promise<number> {
  const sourceItems = await prisma.bOMItem.findMany({
    where: { bidId: sourceBidId },
    orderBy: { lineNumber: 'asc' },
  });

  if (sourceItems.length === 0) {
    return 0;
  }

  // Delete existing items in target
  await prisma.bOMItem.deleteMany({
    where: { bidId: targetBidId },
  });

  // Clone items
  await prisma.bOMItem.createMany({
    data: sourceItems.map((item) => ({
      ...item,
      id: undefined,
      bidId: targetBidId,
      createdAt: undefined,
      updatedAt: undefined,
    })),
  });

  return sourceItems.length;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  generateBOM,
  getBOMItems,
  addBOMItem,
  updateBOMItem,
  deleteBOMItem,
  calculateBOMTotals,
  cloneBOM,
  calculateTieredPricing,
  DEFAULT_LABOR_RATES,
};
