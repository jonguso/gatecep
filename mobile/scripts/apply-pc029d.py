#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

CARD = ROOT / "src" / "features" / "wealth-journey" / "components" / "CoachGReconciliationCard.js"
WEALTH = APP / "wealth-journey.js"
CONVERSATION = APP / "reconciliation-conversation.js"

def backup(path):
    b = path.with_suffix(path.suffix + ".pc029d.bak")
    shutil.copy2(path, b)
    return b

def archive_backup(path):
    if not path or not path.exists():
        return None

    try:
        rel = path.relative_to(APP)
    except ValueError:
        rel = Path("src") / path.relative_to(ROOT / "src")

    dest = ARCHIVE / rel
    dest.parent.mkdir(parents=True, exist_ok=True)

    if dest.exists():
        i = 1
        while True:
            candidate = dest.with_name(f"{dest.stem}-{i}{dest.suffix}")
            if not candidate.exists():
                dest = candidate
                break
            i += 1

    shutil.move(str(path), str(dest))
    return dest

def patch_file(path, edits):
    original = path.read_text(encoding="utf-8")
    text = original

    for old, new in edits:
        if old in text:
            text = text.replace(old, new, 1)
        elif new in text:
            continue
        else:
            raise RuntimeError(
                f"Anchor not found in {path}: {old[:140]!r}"
            )

    if text == original:
        print(f"UNCHANGED {path.relative_to(ROOT)}")
        return

    b = backup(path)
    path.write_text(text, encoding="utf-8")
    archived = archive_backup(b)

    print(f"PATCHED {path.relative_to(ROOT)}")
    print(f"  backup -> {archived.relative_to(ROOT)}")

def main():
    patch_file(
        CARD,
        [
            (
                "export default function CoachGReconciliationCard({ compact = true }) {",
                "export default function CoachGReconciliationCard({ compact = true, showWhenNotRequired = false }) {"
            ),
            (
                '''  if (!conversation || conversation?.state === "NOT_REQUIRED") {
    return null;
  }

  const prompt = conversation?.prompt || {};''',
                '''  if (!conversation || conversation?.state === "NOT_REQUIRED") {
    if (!showWhenNotRequired) {
      return null;
    }

    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>COACH G CHECK-IN</Text>

        <Text style={styles.title}>
          Review your real investing journey
        </Text>

        <Text style={styles.body}>
          There is no unresolved reconciliation issue right now. You can still open Coach G's check-in to review whether your real investing activity remains aligned with your goals and Investor DNA.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() =>
            router.push("/reconciliation-conversation")
          }
        >
          <Text style={styles.buttonText}>
            Open Coach G Check-in
          </Text>
        </Pressable>
      </View>
    );
  }

  const prompt = conversation?.prompt || {};'''
            )
        ]
    )

    patch_file(
        WEALTH,
        [
            (
                '<CoachGReconciliationCard compact={false} />',
                '<CoachGReconciliationCard compact={false} showWhenNotRequired={true} />'
            ),
            (
                '''          GateCEP learns from your goals, conversations, practice and
          investing behavior. A change in behavior is evidence to
          discuss—not proof that you did something wrong.''',
                '''          GateCEP learns from your goals, conversations, and real
          investing behavior. Practice remains a learning sandbox and is
          not used as Investor DNA evidence. A change in real behavior is
          evidence to discuss—not proof that you did something wrong.'''
            )
        ]
    )

    patch_file(
        CONVERSATION,
        [
            (
                '''          {result?.dnaUpdateReview?.shouldReview ? (
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
          ) : null}''',
                '''          {result?.dnaUpdateReview?.shouldReview ? (
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
          ) : (
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push("/dna-update-review")
              }
            >
              <Text style={styles.primaryButtonText}>
                View Investor DNA Review Status
              </Text>
            </Pressable>
          )}'''
            )
        ]
    )

    print()
    print("PC-029D applied.")
    print("Wealth Journey now always exposes Coach G Check-in.")
    print("DNA review remains change-gated, but its status screen is always reachable.")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
