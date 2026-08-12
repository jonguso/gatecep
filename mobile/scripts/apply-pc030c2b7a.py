from pathlib import Path
import re
import shutil

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

path = APP / "performance.js"
text = path.read_text(encoding="utf-8")
original = text

# ------------------------------------------------------------
# Safety check: earlier PC-030C2B7 changes should already exist.
# ------------------------------------------------------------

required = [
    "buildPortfolioHealthScore",
    "currentHealth",
    "hasHistoricalComparison",
    "N/A — Insufficient history"
]

missing = [
    item
    for item in required
    if item not in text
]

if missing:
    raise SystemExit(
        "Earlier PC-030C2B7 changes are not complete. "
        f"Missing: {missing}"
    )

# ------------------------------------------------------------
# Patch historical snapshot Health display.
#
# Match formatting regardless of whitespace/newlines.
# ------------------------------------------------------------

if 's.healthScore !== null' not in text:

    pattern = re.compile(
        r'''Health\s*\{s\.healthScore\s*\|\|\s*0\}/100\s*•\s*Cash\s*KES\s*\{money\(s\.cash\)\}'''
    )

    replacement = '''Health{" "}
                    {s.healthScore !== null &&
                    s.healthScore !== undefined
                      ? `${Number(s.healthScore).toFixed(0)}/100`
                      : "N/A"}{" "}
                    • Cash KES {money(s.cash)}'''

    text, count = pattern.subn(
        replacement,
        text,
        count=1
    )

    if count == 0:
        raise SystemExit(
            "Snapshot Health expression still not found. "
            "No file changes made."
        )

else:
    print(
        "Snapshot Health expression already patched."
    )

# ------------------------------------------------------------
# Backup current partially-patched file before final write.
# ------------------------------------------------------------

if text != original:
    backup = path.with_suffix(
        path.suffix + ".pc030c2b7a.bak"
    )

    shutil.copy2(path, backup)

    path.write_text(
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

    print(
        "PATCHED app/performance.js snapshot history"
    )

    print(
        f"  backup -> {dest.relative_to(ROOT)}"
    )

else:
    print(
        "UNCHANGED app/performance.js"
    )

print()
print("PC-030C2B7A recovery complete.")
