#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"

SERVICE = (
    ROOT
    / "src"
    / "features"
    / "wealth-journey"
    / "coachGReconciliationConversationService.js"
)

IMPORT_ANCHOR = '''import {
  loadInvestorDNAReconciliationClarifications,
  saveInvestorDNAReconciliationClarification
} from "./investorDNAReconciliationConversationStore";'''

IMPORT_REPLACEMENT = '''import {
  loadInvestorDNAReconciliationClarifications,
  saveInvestorDNAReconciliationClarification
} from "./investorDNAReconciliationConversationStore";

import {
  buildDNAReconciliationSignalFingerprint,
  buildClarificationResolutionContext
} from "./clarificationResolutionEngine";'''

LOAD_OLD = '''export async function loadCurrentCoachGReconciliationConversation() {
  const reconciliation =
    await loadCurrentInvestorDNAReconciliation();

  const conversation =
    buildCoachGReconciliationConversation({
      reconciliation
    });

  return {
    reconciliation,
    conversation,
    responseOptions:
      conversation?.activeSignal
        ? buildReconciliationResponseOptions({
            signal:
              conversation.activeSignal
          })
        : []
  };
}'''

LOAD_NEW = '''export async function loadCurrentCoachGReconciliationConversation() {
  const [
    reconciliation,
    clarifications
  ] =
    await Promise.all([
      loadCurrentInvestorDNAReconciliation(),
      loadInvestorDNAReconciliationClarifications()
    ]);

  const clarificationResolution =
    buildClarificationResolutionContext({
      reconciliation,
      clarifications
    });

  const resolvedReconciliation =
    clarificationResolution
      ?.resolvedReconciliation ||
    reconciliation;

  const conversation =
    buildCoachGReconciliationConversation({
      reconciliation:
        resolvedReconciliation
    });

  return {
    reconciliation:
      resolvedReconciliation,

    originalReconciliation:
      reconciliation,

    clarificationResolution,

    dnaUpdateReview:
      clarificationResolution
        ?.dnaUpdateReview || null,

    conversation,

    responseOptions:
      conversation?.activeSignal
        ? buildReconciliationResponseOptions({
            signal:
              conversation.activeSignal
          })
        : []
  };
}'''

SUBMIT_OLD = '''  const evidence =
    buildDNAClarificationEvidence({
      signal,
      responseType,
      responseText
    });

  if (!evidence?.valid) {
    return evidence;
  }'''

SUBMIT_NEW = '''  const evidence =
    buildDNAClarificationEvidence({
      signal,
      responseType,
      responseText
    });

  if (evidence?.valid) {
    evidence.signalFingerprint =
      buildDNAReconciliationSignalFingerprint(
        signal
      );
  }

  if (!evidence?.valid) {
    return evidence;
  }'''

def backup(path):
    b = path.with_suffix(path.suffix + ".pc028y1.bak")
    shutil.copy2(path, b)
    return b

def main():
    if not SERVICE.exists():
        raise FileNotFoundError(SERVICE)

    original = SERVICE.read_text(encoding="utf-8")
    text = original

    if "buildClarificationResolutionContext" not in text:
        if IMPORT_ANCHOR not in text:
            raise RuntimeError(
                "Import anchor not found. No changes written."
            )
        text = text.replace(
            IMPORT_ANCHOR,
            IMPORT_REPLACEMENT,
            1
        )

    if "clarificationResolution," not in text:
        if LOAD_OLD not in text:
            raise RuntimeError(
                "Load function anchor not found. No changes written."
            )
        text = text.replace(
            LOAD_OLD,
            LOAD_NEW,
            1
        )

    if "evidence.signalFingerprint" not in text:
        if SUBMIT_OLD not in text:
            raise RuntimeError(
                "Submit function anchor not found. No changes written."
            )
        text = text.replace(
            SUBMIT_OLD,
            SUBMIT_NEW,
            1
        )

    if text == original:
        print("PC-028Y1 already applied.")
        return

    b = backup(SERVICE)
    SERVICE.write_text(text, encoding="utf-8")

    print("PC-028Y1 applied.")
    print(f"Backup: {b}")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
