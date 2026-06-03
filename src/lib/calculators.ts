export function calculateInflationAdjustedTarget(
  currentCost: number,
  inflationRate: number,
  years: number
): number {
  if (years <= 0) return currentCost;
  return currentCost * Math.pow(1 + inflationRate / 100, years);
}

export function calculateRequiredSIP(
  targetAmount: number,
  currentAmount: number,
  expectedReturnAnnual: number, // e.g. 12 for 12%
  years: number
): number {
  if (years <= 0) return 0;
  
  const rAnnual = expectedReturnAnnual / 100;
  const nMonths = years * 12;
  const rMonthly = rAnnual / 12;

  // Future value of current savings
  const fvOfCurrentAmount = currentAmount * Math.pow(1 + rAnnual, years);

  // Shortfall to cover via SIP
  const shortfall = targetAmount - fvOfCurrentAmount;
  
  if (shortfall <= 0) return 0; // Already achieved

  // If return is 0, just divide shortfall by months
  if (rMonthly === 0) return shortfall / nMonths;

  // SIP Formula: P = FV / ( ((1 + r)^n - 1) / r * (1 + r) )
  const numerator = shortfall * rMonthly;
  const denominator = (Math.pow(1 + rMonthly, nMonths) - 1) * (1 + rMonthly);
  
  return numerator / denominator;
}
