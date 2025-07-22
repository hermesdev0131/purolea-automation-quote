import { Tables } from '@/integrations/supabase/types';

export interface QuoteCalculationInput {
  product: Tables<'products'>;
  quantity: number;
  formula: Tables<'formulas'>;
  packagingOption: Tables<'packaging_options'>;
  labelTiers: Tables<'label_tiers'>[];
  manufacturingTiers: Tables<'manufacturing_tiers'>[];
}

export interface QuoteCalculationResult {
  formulaCost: number;
  packagingCost: number;
  labelCost: number;
  manufacturingFee: number;
  totalUnitCost: number;
  totalCost: number;
  breakdown: {
    formulaCostPerUnit: number;
    packagingCostPerUnit: number;
    labelCostPerUnit: number;
    manufacturingFeePerUnit: number;
  };
}

export function calculateQuote(input: QuoteCalculationInput): QuoteCalculationResult {
  const { product, quantity, formula, packagingOption, labelTiers, manufacturingTiers } = input;

  // 1. Formula cost calculation
  const formulaCostPerUnit = formula.price_per_oz * product.size_oz;
  const formulaCost = formulaCostPerUnit * quantity;

  // 2. Packaging cost calculation
  const packagingCostPerUnit = packagingOption.price;
  const packagingCost = packagingCostPerUnit * quantity;

  // 3. Label cost calculation (tier-based)
  const labelTier = findApplicableTier(labelTiers, quantity);
  const labelCostPerUnit = labelTier ? labelTier.label_cost : 0;
  const labelCost = labelCostPerUnit * quantity;

  // 4. Manufacturing fee calculation (tier-based)
  const manufacturingTier = findApplicableTier(manufacturingTiers, quantity);
  const manufacturingFeePerUnit = manufacturingTier ? manufacturingTier.fee_per_unit : 0;
  const manufacturingFee = manufacturingFeePerUnit * quantity;

  // 5. Total calculations
  const totalUnitCost = formulaCostPerUnit + packagingCostPerUnit + labelCostPerUnit + manufacturingFeePerUnit;
  const totalCost = formulaCost + packagingCost + labelCost + manufacturingFee;

  return {
    formulaCost,
    packagingCost,
    labelCost,
    manufacturingFee,
    totalUnitCost,
    totalCost,
    breakdown: {
      formulaCostPerUnit,
      packagingCostPerUnit,
      labelCostPerUnit,
      manufacturingFeePerUnit,
    },
  };
}

function findApplicableTier<T extends { min_quantity: number }>(
  tiers: T[],
  quantity: number
): T | null {
  // Sort tiers by min_quantity in descending order
  const sortedTiers = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);
  
  // Find the first tier where quantity meets the minimum requirement
  return sortedTiers.find(tier => quantity >= tier.min_quantity) || null;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}