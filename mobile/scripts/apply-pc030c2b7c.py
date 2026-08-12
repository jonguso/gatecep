from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

PATH = APP / "performance.js"

try:
    original = PATH.read_text(encoding="utf-8")
    text = original

    # ============================================================
    # 1. ADD HEALTH LABEL NORMALIZER
    # ============================================================

    anchor = '''function money(v) {'''

    helper = '''function normalizeHealthLabel(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    const candidate =
      value.label ??
      value.rating ??
      value.classification ??
      value.status ??
      value.name ??
      value.title ??
      value.grade ??
      null;

    if (
      candidate !== null &&
      candidate !== undefined &&
      typeof candidate !== "object"
    ) {
      return String(candidate);
    }
  }

  return null;
}

function money(v) {'''

    if "function normalizeHealthLabel" not in text:
        if anchor not in text:
            raise RuntimeError(
                "money() function anchor not found."
            )

        text = text.replace(
            anchor,
            helper,
            1
        )

    # ============================================================
    # 2. NORMALIZE CURRENT HEALTH RATING
    # ============================================================

    old = '''            healthRating:
              currentHealth?.rating ??
              currentHealth?.healthRating ??
              currentHealth?.classification ??
              null'''

    new = '''            healthRating:
              normalizeHealthLabel(
                currentHealth?.rating ??
                currentHealth?.healthRating ??
                currentHealth?.classification ??
                currentHealth?.status ??
                null
              )'''

    if old in text:
        text = text.replace(
            old,
            new,
            1
        )
    elif "normalizeHealthLabel(" not in text[text.find("healthRating:"):text.find("healthRating:") + 500]:
        raise RuntimeError(
            "Current healthRating anchor not found."
        )

    # ============================================================
    # 3. SAFETY
    # ============================================================

    required = [
        "function normalizeHealthLabel",
        "healthRating:",
        "normalizeHealthLabel("
    ]

    missing = [
        item
        for item in required
        if item not in text
    ]

    if missing:
        raise RuntimeError(
            f"Required changes missing: {missing}"
        )

    # ============================================================
    # 4. WRITE + ARCHIVE BACKUP
    # ============================================================

    if text == original:
        print(
            "UNCHANGED app/performance.js — "
            "PC-030C2B7C already present."
        )
    else:
        backup = PATH.with_suffix(
            PATH.suffix + ".pc030c2b7c.bak"
        )

        shutil.copy2(
            PATH,
            backup
        )

        PATH.write_text(
            text,
            encoding="utf-8"
        )

        ARCHIVE.mkdir(
            parents=True,
            exist_ok=True
        )

        dest = ARCHIVE / backup.name

        if dest.exists():
            i = 1

            while True:
                candidate = ARCHIVE / (
                    f"{backup.name}-{i}"
                )

                if not candidate.exists():
                    dest = candidate
                    break

                i += 1

        shutil.move(
            str(backup),
            str(dest)
        )

        print("PATCHED app/performance.js")
        print(
            f"  backup -> {dest.relative_to(ROOT)}"
        )

    print()
    print("PC-030C2B7C applied successfully.")

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )
    sys.exit(1)
