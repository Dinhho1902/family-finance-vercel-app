export type RefinedFund = {
  fundName: string;
  type: string;
  currentBalance: number;
  goalAmount: number | null;
  targetDate: string | null;
  monthlyTarget: number | null;
  isVirtual?: boolean;
  gap: number;
  daysRemaining: number | null;
  spentThisMonth: number;
  remainingMonthlyQuota: number | null;
};

export type AllocationResult = { fundName: string; amount: number };

const SURPLUS_FUND = 'Quỹ Chứng Khoán';
const GOLD_TARGET_RATIO = 0.15;

function isEmergencyFund(f: RefinedFund) {
  return f.type === 'emergency' || f.fundName.includes('Dự phòng');
}

function isGoldFund(f: RefinedFund) {
  return f.type === 'Vàng';
}

function effectiveGap(f: RefinedFund, totalAssets: number): number {
  if (isGoldFund(f)) {
    return Math.max(0, GOLD_TARGET_RATIO * totalAssets - f.currentBalance);
  }
  return f.gap;
}

export function computeAllocations(
  funds: RefinedFund[],
  amountToAllocate: number,
  totalAssets: number
): AllocationResult[] {
  if (amountToAllocate <= 0) return [];

  const allocMap: Record<string, number> = {};
  let remaining = amountToAllocate;

  const tier1 = funds
    .filter(f =>
      f.fundName !== SURPLUS_FUND &&
      f.daysRemaining !== null &&
      f.daysRemaining >= 0 &&
      f.daysRemaining <= 30 &&
      f.gap > 0
    )
    .sort((a, b) => a.gap - b.gap || (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

  const tier1Names = new Set(tier1.map(f => f.fundName));

  const tier2 = funds
    .filter(f =>
      f.fundName !== SURPLUS_FUND &&
      !tier1Names.has(f.fundName) &&
      effectiveGap(f, totalAssets) > 0
    )
    .sort((a, b) => {
      const aEmerg = isEmergencyFund(a) ? 0 : isGoldFund(a) ? 1 : 2;
      const bEmerg = isEmergencyFund(b) ? 0 : isGoldFund(b) ? 1 : 2;
      if (aEmerg !== bEmerg) return aEmerg - bEmerg;
      return effectiveGap(a, totalAssets) - effectiveGap(b, totalAssets);
    });

  for (const fund of tier1) {
    if (remaining <= 0) break;
    const toFill = Math.min(fund.gap, remaining);
    allocMap[fund.fundName] = (allocMap[fund.fundName] || 0) + toFill;
    remaining -= toFill;
  }

  for (const fund of tier2) {
    if (remaining <= 0) break;
    const eg = effectiveGap(fund, totalAssets);
    const quotaCap = fund.remainingMonthlyQuota !== null ? fund.remainingMonthlyQuota : Infinity;
    const toFill = Math.min(eg, quotaCap, remaining);
    if (toFill > 0) {
      allocMap[fund.fundName] = (allocMap[fund.fundName] || 0) + toFill;
      remaining -= toFill;
    }
  }

  if (remaining > 0) {
    const surplusFund = funds.find(f => f.fundName === SURPLUS_FUND);
    if (surplusFund) {
      allocMap[SURPLUS_FUND] = (allocMap[SURPLUS_FUND] || 0) + remaining;
      remaining = 0;
    } else {
      console.warn('[allocation] No surplus fund found, unallocated:', remaining);
    }
  }

  return Object.entries(allocMap)
    .filter(([, amount]) => amount > 0)
    .map(([fundName, amount]) => ({ fundName, amount: Math.round(amount) }));
}
