import { calculateGoalRequiredTrajectory } from "./goalProgressIntelligenceEngine.js";

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const round = (value, digits = 2) => Number(finite(value).toFixed(digits));

function normalizeSectors(sectors = []) {
  const rows = (Array.isArray(sectors) ? sectors : [])
    .map((row) => ({
      sector: String(row?.sector || "Other"),
      value: Math.max(0, finite(row?.value ?? row?.totalValue ?? row?.marketValue)),
      targetPercentage: Number.isFinite(Number(row?.targetPercentage)) ? Number(row.targetPercentage) : null
    }))
    .filter((row) => row.value > 0);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return rows.map((row) => ({ ...row, currentPercentage: total > 0 ? row.value / total * 100 : 0 }));
}

export function buildConcentrationAwareSectorTargets(sectors = [], maximumPercentage = 30) {
  const rows = normalizeSectors(sectors);
  if (!rows.length) return [];
  const cap = Math.max(1, Math.min(100, finite(maximumPercentage, 30)));
  const largest = [...rows].sort((a, b) => b.currentPercentage - a.currentPercentage)[0];
  const excess = Math.max(0, largest.currentPercentage - cap);
  const others = rows.filter((row) => row.sector !== largest.sector);
  const otherTotal = others.reduce((sum, row) => sum + row.currentPercentage, 0);

  return rows.map((row) => {
    const explicit = row.targetPercentage;
    const target = explicit !== null
      ? explicit
      : row.sector === largest.sector
        ? largest.currentPercentage - excess
        : row.currentPercentage + (otherTotal > 0 ? excess * row.currentPercentage / otherTotal : 0);
    return { ...row, targetPercentage: round(target, 4) };
  });
}

export function buildGoalDiversificationScenario({
  currentValue,
  targetAmount,
  targetDate,
  monthlyContribution,
  annualReturnPercentage = 8,
  defensiveTargetPercentage = 5,
  currentDefensiveValue = 0,
  sectors = [],
  asOfDate = new Date().toISOString().slice(0, 10)
} = {}) {
  const position = { currentGoalValue: Math.max(0, finite(currentValue)) };
  const trajectory = calculateGoalRequiredTrajectory({
    goal: { targetAmount: finite(targetAmount), targetDate },
    currentPosition: position,
    contributionBehavior: { monthlyContribution: Math.max(0, finite(monthlyContribution)) },
    planningAssumptions: { annualReturnPercentage: finite(annualReturnPercentage, 8) },
    asOfDate
  });

  if (!trajectory.valid) {
    return { valid: false, reason: trajectory.reason, safeguards: advisorySafeguards() };
  }

  const contributionTotal = round(trajectory.monthlyContribution * trajectory.monthsRemaining);
  const projectedValue = Math.max(0, finite(trajectory.projectedValue));
  const defensiveTarget = Math.max(0, Math.min(100, finite(defensiveTargetPercentage, 5)));
  const defensiveTargetValue = projectedValue * defensiveTarget / 100;
  const defensiveGap = Math.max(0, defensiveTargetValue - Math.max(0, finite(currentDefensiveValue)));
  // Fund the defensive sleeve progressively. A defensive gap must not consume
  // the entire contribution plan and leave the goal/diversification problem untouched.
  const defensiveContribution = Math.min(
    contributionTotal * defensiveTarget / 100,
    defensiveGap
  );
  const equityContribution = Math.max(0, contributionTotal - defensiveContribution);
  const targetRows = buildConcentrationAwareSectorTargets(sectors);
  const currentEquity = targetRows.reduce((sum, row) => sum + row.value, 0);
  const simulatedEquity = currentEquity + equityContribution;
  const rawSectorGaps = targetRows.map((row) => ({
    ...row,
    targetValue: simulatedEquity * row.targetPercentage / 100,
    contributionGap: Math.max(0, simulatedEquity * row.targetPercentage / 100 - row.value)
  }));
  const totalSectorGap = rawSectorGaps.reduce((sum, row) => sum + row.contributionGap, 0);
  const allocationRows = rawSectorGaps.map((row) => {
    const directedContribution = totalSectorGap > 0
      ? equityContribution * row.contributionGap / totalSectorGap
      : equityContribution / Math.max(rawSectorGaps.length, 1);
    const simulatedValue = row.value + directedContribution;
    return {
      sector: row.sector,
      currentPercentage: round(row.currentPercentage),
      targetPercentage: round(row.targetPercentage),
      directedContribution: round(directedContribution),
      simulatedPercentage: simulatedEquity > 0 ? round(simulatedValue / simulatedEquity * 100) : 0
    };
  });
  const largestCurrent = [...allocationRows].sort((a, b) => b.currentPercentage - a.currentPercentage)[0] || null;
  const largestSimulated = [...allocationRows].sort((a, b) => b.simulatedPercentage - a.simulatedPercentage)[0] || null;

  return {
    valid: true,
    trajectory,
    goalGap: round(Math.max(0, trajectory.targetAmount - trajectory.projectedValue)),
    goalSurplus: round(Math.max(0, trajectory.projectedValue - trajectory.targetAmount)),
    requiredMonthlyContribution: round(trajectory.requiredMonthlyContribution),
    additionalMonthlyContribution: round(Math.max(0, trajectory.requiredMonthlyContribution - trajectory.monthlyContribution)),
    contributionPlan: {
      monthly: round(trajectory.monthlyContribution),
      total: contributionTotal,
      defensive: round(defensiveContribution),
      equitySectors: round(equityContribution)
    },
    defensivePlan: {
      targetPercentage: round(defensiveTarget),
      targetValue: round(defensiveTargetValue),
      currentValue: round(currentDefensiveValue),
      gap: round(defensiveGap),
      destination: "Verified money-market or fixed-income investment"
    },
    sectorPlan: allocationRows,
    concentration: {
      currentLargestSector: largestCurrent?.sector || null,
      currentLargestPercentage: largestCurrent?.currentPercentage ?? null,
      simulatedLargestSector: largestSimulated?.sector || null,
      simulatedLargestPercentage: largestSimulated?.simulatedPercentage ?? null
    },
    safeguards: advisorySafeguards()
  };
}

function advisorySafeguards() {
  return {
    advisoryOnly: true,
    realPortfolioChanged: false,
    goalChanged: false,
    holdingsChanged: false,
    contributionChanged: false,
    investorDNAChanged: false,
    tradesCreated: false
  };
}
