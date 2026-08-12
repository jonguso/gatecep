from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"

PATH = (
    ROOT /
    "src" /
    "services" /
    "brokers" /
    "brokerPortfolioSync.js"
)

ARCHIVE = (
    ROOT /
    "archive" /
    "expo-router-nonroutes" /
    "bak" /
    "src" /
    "services" /
    "brokers"
)


def archive_backup(path):
    ARCHIVE.mkdir(
        parents=True,
        exist_ok=True
    )

    dest = (
        ARCHIVE /
        "brokerPortfolioSync.js.pc030c2b9a.bak"
    )

    if dest.exists():
        i = 1

        while True:
            candidate = (
                ARCHIVE /
                f"brokerPortfolioSync.js.pc030c2b9a-{i}.bak"
            )

            if not candidate.exists():
                dest = candidate
                break

            i += 1

    shutil.move(
        str(path),
        str(dest)
    )

    return dest


try:
    original = PATH.read_text(
        encoding="utf-8"
    )

    text = original

    #
    # ==========================================================
    # 1. IMPORT SNAPSHOT LIFECYCLE TRIGGER
    # ==========================================================
    #

    import_text = '''import {
  refreshCanonicalRealPortfolioSnapshot
} from "../portfolio/portfolioSnapshotTrigger";

'''

    if (
        "refreshCanonicalRealPortfolioSnapshot"
        not in text
    ):
        #
        # Do not depend on a particular existing import shape.
        #
        # Insert immediately before the first non-import service
        # declaration by locating the end of the import section.
        #
        lines = text.splitlines(
            keepends=True
        )

        last_import_end = None
        inside_import = False

        for i, line in enumerate(lines):
            stripped = line.strip()

            if stripped.startswith("import "):
                inside_import = True

            if (
                inside_import and
                ";" in line
            ):
                last_import_end = i + 1
                inside_import = False

        if last_import_end is None:
            raise RuntimeError(
                "Unable to identify brokerPortfolioSync import section."
            )

        lines.insert(
            last_import_end,
            "\n" + import_text
        )

        text = "".join(lines)

    #
    # ==========================================================
    # 2. AUTHORITATIVE BROKER SYNC MUTATION BOUNDARY
    # ==========================================================
    #

    reason = (
        'reason: "BROKER_PORTFOLIO_SYNC"'
    )

    if reason not in text:

        old = '''  await buildSyncStatus();

  return {
    ok: true,
    brokerCount: accounts.length,
    holdings: portfolio,
    cash,
    results,
    syncedAt: new Date().toISOString()
  };'''

        new = '''  await buildSyncStatus();

  await refreshCanonicalRealPortfolioSnapshot({
    reason: "BROKER_PORTFOLIO_SYNC"
  });

  return {
    ok: true,
    brokerCount: accounts.length,
    holdings: portfolio,
    cash,
    results,
    syncedAt: new Date().toISOString()
  };'''

        if old not in text:
            raise RuntimeError(
                "Broker aggregate completion boundary not found."
            )

        text = text.replace(
            old,
            new,
            1
        )

    #
    # ==========================================================
    # 3. SAFETY
    # ==========================================================
    #

    required = [
        "refreshCanonicalRealPortfolioSnapshot",
        'reason: "BROKER_PORTFOLIO_SYNC"',
        'from "../portfolio/portfolioSnapshotTrigger"'
    ]

    missing = [
        item
        for item in required
        if item not in text
    ]

    if missing:
        raise RuntimeError(
            f"Missing final broker trigger elements: {missing}"
        )

    #
    # ==========================================================
    # 4. WRITE
    # ==========================================================
    #

    if text == original:
        print(
            "UNCHANGED brokerPortfolioSync.js — "
            "PC-030C2B9A already applied."
        )

    else:
        backup = PATH.with_suffix(
            PATH.suffix +
            ".pc030c2b9a.bak"
        )

        shutil.copy2(
            PATH,
            backup
        )

        PATH.write_text(
            text,
            encoding="utf-8"
        )

        archived = archive_backup(
            backup
        )

        print(
            "PATCHED "
            "src/services/brokers/"
            "brokerPortfolioSync.js"
        )

        print(
            "  backup -> "
            f"{archived.relative_to(ROOT)}"
        )

    print()
    print(
        "PC-030C2B9A broker lifecycle recovery complete."
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
