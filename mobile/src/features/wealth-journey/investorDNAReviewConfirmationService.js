import {
  loadInvestorContext
} from "../investor/investorContextStore";

import {
  loadCurrentDNAUpdateReviewProposal
} from "./clarificationResolutionService";

import {
  buildInvestorDNAReviewFields,
  updateDNAReviewFieldProposal,
  confirmDNAReviewField,
  buildConfirmedInvestorDNAUpdateInstruction
} from "./investorDNAReviewConfirmationEngine";

import {
  saveInvestorDNAUpdateConfirmation
} from "./investorDNAUpdateConfirmationStore";

export async function loadCurrentInvestorDNAReview() {
  const [
    investorContext,
    dnaUpdateReview
  ] =
    await Promise.all([
      loadInvestorContext(),
      loadCurrentDNAUpdateReviewProposal()
    ]);

  const investorDNA =
    investorContext?.investorDNA || {};

  return {
    investorDNA,
    dnaUpdateReview,
    fields:
      buildInvestorDNAReviewFields({
        dnaUpdateReview,
        investorDNA
      }),
    shouldReview:
      dnaUpdateReview?.shouldReview === true
  };
}

export function proposeInvestorDNAReviewField({
  fields = [],
  fieldKey,
  proposedValue
} = {}) {
  return updateDNAReviewFieldProposal({
    fields,
    fieldKey,
    proposedValue
  });
}

export function confirmInvestorDNAReviewField({
  fields = [],
  fieldKey,
  confirmed = true
} = {}) {
  return confirmDNAReviewField({
    fields,
    fieldKey,
    confirmed
  });
}

export async function submitInvestorDNAReviewConfirmation({
  fields = [],
  dnaUpdateReview = {},
  investorConfirmation = false
} = {}) {
  const instruction =
    buildConfirmedInvestorDNAUpdateInstruction({
      fields,
      investorConfirmation,
      reviewContext: dnaUpdateReview
    });

  if (!instruction?.valid) {
    return instruction;
  }

  const saved =
    await saveInvestorDNAUpdateConfirmation(instruction);

  return {
    success: true,
    confirmation: saved,
    message:
      "Your field-level Investor DNA changes were confirmed and saved for controlled application. Your Investor DNA has not been changed automatically."
  };
}
