function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isVerifiedBrokerFeeSchedule(schedule = {}) {
  return Boolean(
    schedule &&
    schedule.verified === true &&
    String(schedule.source || "").trim() &&
    String(schedule.verifiedAt || "").trim()
  );
}

export function estimateBrokerOrderCharges({ schedule = {}, consideration = 0 } = {}) {
  if (!isVerifiedBrokerFeeSchedule(schedule)) return null;
  const gross = Math.max(0, n(consideration));
  const commission = Math.max(
    n(schedule.minimumCommission),
    gross * (n(schedule.commissionRatePct) / 100)
  );
  const percentageCharges = gross * (n(schedule.otherChargesRatePct) / 100);
  const fixedCharges = n(schedule.fixedCharges);
  return {
    consideration: gross,
    commission,
    otherCharges: percentageCharges + fixedCharges,
    totalCharges: commission + percentageCharges + fixedCharges,
    currency: schedule.currency || "KES",
    evidenceSource: schedule.source,
    verifiedAt: schedule.verifiedAt
  };
}

export function compareVerifiedBrokerCharges({ accounts = [], order = {} } = {}) {
  const consideration = n(order.quantity) * n(order.price || order.limitPrice);
  const comparisons = accounts
    .filter((account) => account?.status !== "INACTIVE")
    .map((account) => ({
      account,
      estimate: estimateBrokerOrderCharges({
        schedule: account?.feeSchedule,
        consideration
      })
    }))
    .filter((item) => item.estimate)
    .sort((a, b) => a.estimate.totalCharges - b.estimate.totalCharges);

  if (!comparisons.length) {
    return {
      available: false,
      recommended: null,
      comparisons: [],
      reason: "Verified broker fee schedules are unavailable. Coach G will not invent a cost comparison."
    };
  }

  const best = comparisons[0];
  return {
    available: true,
    recommended: {
      brokerAccountId: best.account.id,
      brokerId: best.account.brokerId,
      brokerName: best.account.brokerName || best.account.name,
      estimatedCharges: best.estimate.totalCharges,
      currency: best.estimate.currency,
      evidenceSource: best.estimate.evidenceSource,
      verifiedAt: best.estimate.verifiedAt
    },
    comparisons,
    reason: `${best.account.brokerName || best.account.name} has the lowest verified estimated charges for this order.`
  };
}
