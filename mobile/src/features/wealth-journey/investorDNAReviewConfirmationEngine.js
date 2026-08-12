export const DNA_REVIEW_FIELD_STATUSES = Object.freeze({
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  UNCHANGED: "UNCHANGED",
  PROPOSED: "PROPOSED",
  CONFIRMED: "CONFIRMED",
  SKIPPED: "SKIPPED"
});

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeFieldKey(label) {
  const value = clean(label);
  if (!value) return null;

  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readCurrentDNAValue({
  investorDNA = {},
  fieldLabel
} = {}) {
  const key = normalizeFieldKey(fieldLabel);

  const aliases = {
    goal: investorDNA?.goal,
    target:
      investorDNA?.targetAmount ??
      investorDNA?.goalTarget ??
      investorDNA?.target,
    timeline:
      investorDNA?.timeHorizon ??
      investorDNA?.timeline,
    priority:
      investorDNA?.priority,
    contribution_capacity:
      investorDNA?.contributionCapacity ??
      investorDNA?.monthlyContribution,
    risk_profile:
      investorDNA?.riskProfile,
    risk_tolerance:
      investorDNA?.riskTolerance ??
      investorDNA?.riskProfile,
    investment_style:
      investorDNA?.investmentStyle ??
      investorDNA?.investorType,
    time_horizon:
      investorDNA?.timeHorizon,
    liquidity_preference:
      investorDNA?.liquidityPreference,
    cash_needs:
      investorDNA?.cashNeeds,
    sector_preferences:
      investorDNA?.sectorPreferences,
    concentration_tolerance:
      investorDNA?.concentrationTolerance,
    portfolio_constraints:
      investorDNA?.portfolioConstraints,
    strategy_conviction:
      investorDNA?.strategyConviction,
    investment_preferences:
      investorDNA?.investmentPreferences
  };

  if (Object.prototype.hasOwnProperty.call(aliases, key)) {
    return aliases[key] ?? null;
  }

  return investorDNA?.[key] ?? null;
}

export function buildInvestorDNAReviewFields({
  dnaUpdateReview = {},
  investorDNA = {}
} = {}) {
  const seen = new Set();
  const fields = [];

  safeArray(dnaUpdateReview?.candidates).forEach((candidate) => {
    safeArray(candidate?.requestedReview).forEach((fieldLabel) => {
      const fieldKey = normalizeFieldKey(fieldLabel);

      if (!fieldKey || seen.has(fieldKey)) return;

      seen.add(fieldKey);

      fields.push({
        fieldKey,
        fieldLabel,
        currentValue:
          readCurrentDNAValue({
            investorDNA,
            fieldLabel
          }),
        proposedValue: null,
        status:
          DNA_REVIEW_FIELD_STATUSES.REVIEW_REQUIRED,
        sourceCandidates: [
          candidate?.signalFingerprint
        ].filter(Boolean),
        reason:
          candidate?.reason || null
      });
    });
  });

  return fields;
}

export function updateDNAReviewFieldProposal({
  fields = [],
  fieldKey,
  proposedValue
} = {}) {
  return safeArray(fields).map((field) => {
    if (field?.fieldKey !== fieldKey) return field;

    const normalized = clean(proposedValue);

    const unchanged =
      String(field?.currentValue ?? "").trim() ===
      String(normalized ?? "").trim();

    return {
      ...field,
      proposedValue: normalized,
      status:
        unchanged
          ? DNA_REVIEW_FIELD_STATUSES.UNCHANGED
          : normalized
            ? DNA_REVIEW_FIELD_STATUSES.PROPOSED
            : DNA_REVIEW_FIELD_STATUSES.REVIEW_REQUIRED
    };
  });
}

export function confirmDNAReviewField({
  fields = [],
  fieldKey,
  confirmed = true
} = {}) {
  return safeArray(fields).map((field) => {
    if (field?.fieldKey !== fieldKey) return field;

    if (!confirmed) {
      return {
        ...field,
        status:
          DNA_REVIEW_FIELD_STATUSES.SKIPPED
      };
    }

    if (
      !clean(field?.proposedValue) ||
      field?.status ===
        DNA_REVIEW_FIELD_STATUSES.UNCHANGED
    ) {
      return field;
    }

    return {
      ...field,
      status:
        DNA_REVIEW_FIELD_STATUSES.CONFIRMED
    };
  });
}

export function buildConfirmedInvestorDNAUpdateInstruction({
  fields = [],
  investorConfirmation = false,
  reviewContext = {},
  confirmedAt = new Date().toISOString()
} = {}) {
  const confirmedFields =
    safeArray(fields).filter(
      (field) =>
        field?.status ===
          DNA_REVIEW_FIELD_STATUSES.CONFIRMED &&
        clean(field?.proposedValue)
    );

  if (!investorConfirmation) {
    return {
      valid: false,
      reason:
        "Explicit investor confirmation is required before creating an Investor DNA update instruction."
    };
  }

  if (!confirmedFields.length) {
    return {
      valid: false,
      reason:
        "At least one changed Investor DNA field must be explicitly confirmed."
    };
  }

  return {
    valid: true,
    instructionType:
      "EXPLICIT_INVESTOR_DNA_UPDATE_CONFIRMATION",
    confirmedAt,
    confirmedByInvestor: true,
    updates:
      confirmedFields.map((field) => ({
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel,
        previousValue:
          field.currentValue ?? null,
        proposedValue:
          field.proposedValue,
        explicitlyConfirmed: true,
        sourceCandidates:
          safeArray(field?.sourceCandidates),
        reason:
          field?.reason || null
      })),
    reviewContext: {
      status:
        reviewContext?.status || null,
      candidateCount:
        safeArray(reviewContext?.candidates).length
    },
    safeguards: {
      automaticDNAChange: false,
      fieldLevelConfirmation: true,
      secondDNACreated: false,
      practiceEvidenceUsed: false,
      portfolioChanged: false,
      tradesPlaced: false
    }
  };
}
