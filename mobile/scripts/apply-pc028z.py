#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
SCREEN = ROOT / "app" / "reconciliation-conversation.js"
INDEX = ROOT / "src" / "features" / "wealth-journey" / "index.js"

def backup(path):
    b = path.with_suffix(path.suffix + ".pc028z.bak")
    shutil.copy2(path, b)
    return b

def patch_screen():
    if not SCREEN.exists():
        return {"file": str(SCREEN), "status": "NOT_FOUND"}

    original = SCREEN.read_text(encoding="utf-8")
    text = original

    marker = "          <View style={styles.guardrail}>"

    review_button = '''          {result?.dnaUpdateReview?.shouldReview ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push("/dna-update-review")
              }
            >
              <Text style={styles.primaryButtonText}>
                Review Investor DNA Changes
              </Text>
            </Pressable>
          ) : null}

'''

    if 'router.push("/dna-update-review")' not in text:
        if marker not in text:
            raise RuntimeError(
                "PC-028Z reconciliation-screen anchor not found."
            )

        text = text.replace(
            marker,
            review_button + marker,
            1
        )

    if text == original:
        return {"file": str(SCREEN), "status": "ALREADY_APPLIED"}

    b = backup(SCREEN)
    SCREEN.write_text(text, encoding="utf-8")

    return {
        "file": str(SCREEN),
        "status": "PATCHED",
        "backup": str(b)
    }

def patch_index():
    if not INDEX.exists():
        return {"file": str(INDEX), "status": "NOT_FOUND"}

    original = INDEX.read_text(encoding="utf-8")
    text = original

    exports = [
      'export * from "./investorDNAReviewConfirmationEngine";',
      'export * from "./investorDNAUpdateConfirmationStore";',
      'export * from "./investorDNAReviewConfirmationService";'
    ]

    for line in exports:
        if line not in text:
            text += "\n" + line + "\n"

    if text == original:
        return {"file": str(INDEX), "status": "ALREADY_APPLIED"}

    b = backup(INDEX)
    INDEX.write_text(text, encoding="utf-8")

    return {
        "file": str(INDEX),
        "status": "PATCHED",
        "backup": str(b)
    }

def main():
    results = [
      patch_screen(),
      patch_index()
    ]

    print("PC-028Z applied.")
    for result in results:
        print(result)

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
