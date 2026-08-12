#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"

CONVERSATION_SERVICE = (
    ROOT
    / "src"
    / "features"
    / "wealth-journey"
    / "coachGReconciliationConversationService.js"
)

INDEX = (
    ROOT
    / "src"
    / "features"
    / "wealth-journey"
    / "index.js"
)

def backup(path):
    b = path.with_suffix(path.suffix + ".pc028y.bak")
    shutil.copy2(path, b)
    return b

def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Anchor not found for {label}")
    return text.replace(old, new, 1)

def patch_conversation_service():
    if not CONVERSATION_SERVICE.exists():
        raise FileNotFoundError(CONVERSATION_SERVICE)

    original = CONVERSATION_SERVICE.read_text(encoding="utf-8")
    text = original

    import_anchor = '''import {
  loadInvestorDNAReconciliationClarifications,
  saveInvestorDNAReconciliationClarification
} from "./investorDNAReconciliationConversationStore";'''

    import_replacement = '''import {
  loadInvestorDNAReconciliationClarifications,
  saveInvestorDNAReconciliationClarification
} from "./investorDNAReconciliationConversationStore";

import {
  buildDNAReconciliationSignalFingerprint,
  buildClarificationResolutionContext
} from "./clarificationResolutionEngine";'''

    if "buildClarificationResolutionContext" not in text:
        text = replace_once(
            text,
            import_anchor,
            import_replacement,
            "PC-028Y clarification imports"
        )

    old_load = '''export async function loadCurrentCoachGReconciliationConversation() {
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

    new_load = '''export async function loadCurrentCoachGReconciliationConversation() {
  const [
    reconciliation,
    clarifications
  ] =
    await Promise.all([
      loadCurrentInvestorDNAReconciliation(),
      loadInvestorDNAReconciliationClarifications()
    ]);

  const resolutionContext =
    buildClarificationResolutionContext({
      reconciliation,
      clarifications
    });

  const resolvedReconciliation =
    resolutionContext?.resolvedReconciliation ||
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

    clarificationResolution:
      resolutionContext,

    dnaUpdateReview:
      resolutionContext?.dnaUpdateReview || null,

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

    if "clarificationResolution:" not in text:
        text = replace_once(
            text,
            old_load,
            new_load,
            "PC-028Y conversation resolution"
        )

    old_submit = '''  const evidence =
    buildDNAClarificationEvidence({
      signal,
      responseType,
      responseText
    });'''

    new_submit = '''  const evidence =
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
  }'''

    if "evidence.signalFingerprint" not in text:
        text = replace_once(
            text,
            old_submit,
            new_submit,
            "PC-028Y signal fingerprint save"
        )

    if text == original:
        return {
            "file": str(CONVERSATION_SERVICE),
            "status": "ALREADY_APPLIED"
        }

    b = backup(CONVERSATION_SERVICE)
    CONVERSATION_SERVICE.write_text(text, encoding="utf-8")

    return {
        "file": str(CONVERSATION_SERVICE),
        "status": "PATCHED",
        "backup": str(b)
    }

def patch_index():
    if not INDEX.exists():
        return {
            "file": str(INDEX),
            "status": "NOT_FOUND"
        }

    original = INDEX.read_text(encoding="utf-8")
    text = original

    exports = [
      'export * from "./clarificationResolutionEngine";',
      'export * from "./clarificationResolutionService";'
    ]

    for line in exports:
        if line not in text:
            text += "\n" + line + "\n"

    if text == original:
        return {
            "file": str(INDEX),
            "status": "ALREADY_APPLIED"
        }

    b = backup(INDEX)
    INDEX.write_text(text, encoding="utf-8")

    return {
        "file": str(INDEX),
        "status": "PATCHED",
        "backup": str(b)
    }

def main():
    results = [
      patch_conversation_service(),
      patch_index()
    ]

    print("PC-028Y applied.")

    for result in results:
        print(result)

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
