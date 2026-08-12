from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
PATH = APP / "performance.js"

ARCHIVE = (
    ROOT /
    "archive" /
    "expo-router-nonroutes" /
    "bak"
)

try:
    original = PATH.read_text(
        encoding="utf-8"
    )

    text = original

    old = '''                <Circle
                cx={xForIndex(index)}
                cx={xForIndex(index)}
                cy={yForValue(
                  point.netWorth
                )}'''

    new = '''                <Circle
                  cx={xForIndex(index)}
                  cy={yForValue(
                    point.netWorth
                  )}'''

    if old in text:
        text = text.replace(
            old,
            new,
            1
        )

    elif '''                <Circle
                  cx={xForIndex(index)}
                  cy={yForValue(
                    point.netWorth
                  )}''' in text:
        print(
            "UNCHANGED app/performance.js — "
            "PC-030C2C5A already applied."
        )

        raise SystemExit(0)

    else:
        raise RuntimeError(
            "Duplicate Net Worth point anchor not found."
        )

    #
    # ==========================================================
    # SAFETY
    # ==========================================================
    #

    if '''cx={xForIndex(index)}
                cx={xForIndex(index)}''' in text:
        raise RuntimeError(
            "Duplicate cx attribute remains."
        )

    required = [
        "net-worth-hit-",
        'r="22"',
        'r="10"',
        "selectedChartPoint",
        "onSelectPoint?.(point)",
        "TimelineSelectedSnapshotSummary",
        "TimelineSnapshotInspector",
        "safePoints.length < 2",
        "Building Timeline History"
    ]

    missing = [
        item
        for item in required
        if item not in text
    ]

    if missing:
        raise RuntimeError(
            f"C5 interaction contract damaged: {missing}"
        )

    #
    # ==========================================================
    # BACKUP + WRITE
    # ==========================================================
    #

    backup = PATH.with_suffix(
        PATH.suffix +
        ".pc030c2c5a.bak"
    )

    shutil.copy2(
        PATH,
        backup
    )

    PATH.write_text(
        text,
        encoding="utf-8"
    )

    rel = backup.relative_to(APP)

    dest = ARCHIVE / rel

    dest.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    if dest.exists():
        i = 1

        while True:
            candidate = dest.with_name(
                f"{dest.stem}-{i}{dest.suffix}"
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
        "PATCHED app/performance.js"
    )

    print(
        "  backup -> "
        f"{dest.relative_to(ROOT)}"
    )

    print()
    print(
        "PC-030C2C5A applied successfully."
    )

    print(
        "Duplicate Net Worth SVG cx attribute removed."
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
