from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

COMMAND = APP / "portfolio-command-center.js"
ANALYSIS = APP / "portfolio-analysis.js"
COACH_DASHBOARD = APP / "coach-dashboard.js"
DASHBOARD = APP / "(tabs)" / "dashboard.js"
LIVE = APP / "live-dashboard.js"


def backup(path):
    b = path.with_suffix(
        path.suffix + ".pc030c1a.bak"
    )
    shutil.copy2(path, b)
    return b


def archive_backup(path):
    rel = path.relative_to(APP)

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
        str(path),
        str(dest)
    )

    return dest


def write_file(path, content):
    original = path.read_text(
        encoding="utf-8"
    )

    if original == content:
        print(
            f"UNCHANGED {path.relative_to(ROOT)}"
        )
        return

    b = backup(path)

    path.write_text(
        content,
        encoding="utf-8"
    )

    archived = archive_backup(b)

    print(
        f"PATCHED {path.relative_to(ROOT)}"
    )

    print(
        f"  backup -> {archived.relative_to(ROOT)}"
    )


def replace_once(path, old, new):
    original = path.read_text(
        encoding="utf-8"
    )

    if old in original:
        text = original.replace(
            old,
            new,
            1
        )

    elif new in original:
        print(
            f"UNCHANGED {path.relative_to(ROOT)}"
        )
        return

    else:
        raise RuntimeError(
            f"Anchor not found in {path}: {old[:180]!r}"
        )

    b = backup(path)

    path.write_text(
        text,
        encoding="utf-8"
    )

    archived = archive_backup(b)

    print(
        f"PATCHED {path.relative_to(ROOT)}"
    )

    print(
        f"  backup -> {archived.relative_to(ROOT)}"
    )


try:

    #
    # ==========================================================
    # 1. PORTFOLIO COMMAND CENTER
    # Declarative redirect avoids navigation-before-root-mount.
    # ==========================================================
    #

    command_redirect = '''import React from "react";
import { Redirect } from "expo-router";

/*
 * PC-030C1A
 *
 * Legacy compatibility route.
 *
 * Canonical portfolio:
 *   /portfolio-hub
 */
export default function PortfolioCommandCenterCompatibilityRoute() {
  return (
    <Redirect href="/portfolio-hub" />
  );
}
'''

    write_file(
        COMMAND,
        command_redirect
    )

    #
    # ==========================================================
    # 2. PORTFOLIO ANALYSIS
    # ==========================================================
    #

    analysis_redirect = '''import React from "react";
import { Redirect } from "expo-router";

/*
 * PC-030C1A
 *
 * Legacy compatibility route.
 *
 * Canonical Coach G:
 *   /(tabs)/coach
 */
export default function PortfolioAnalysisCompatibilityRoute() {
  return (
    <Redirect href="/(tabs)/coach" />
  );
}
'''

    write_file(
        ANALYSIS,
        analysis_redirect
    )

    #
    # ==========================================================
    # 3. COACH DASHBOARD
    #
    # Same compatibility pattern. Fix proactively so old direct
    # /coach-dashboard bookmarks cannot hit the same web error.
    # ==========================================================
    #

    coach_redirect = '''import React from "react";
import { Redirect } from "expo-router";

/*
 * PC-030C1A
 *
 * Legacy compatibility route.
 *
 * Canonical Coach G:
 *   /(tabs)/coach
 */
export default function CoachDashboardCompatibilityRoute() {
  return (
    <Redirect href="/(tabs)/coach" />
  );
}
'''

    write_file(
        COACH_DASHBOARD,
        coach_redirect
    )

    #
    # ==========================================================
    # 4. DASHBOARD
    #
    # Current code hides Live Investing when brokerConnected
    # is false. Keep the live screen reachable for navigation
    # and testing, while the screen itself can communicate
    # broker readiness.
    #
    # Add Portfolio Analytics as its own specialist destination.
    # ==========================================================
    #

    old_dashboard = '''    {brokerConnected ? (
      <Quick
        title="Live Investing"
        route="/live-dashboard"
      />
    ) : null}
   </View>
</View>'''

    new_dashboard = '''    <Quick
      title="Live Investing"
      route="/live-dashboard"
    />

    <Quick
      title="Portfolio Analytics"
      route="/unified-portfolio-analytics"
    />
   </View>
</View>'''

    replace_once(
        DASHBOARD,
        old_dashboard,
        new_dashboard
    )

    #
    # ==========================================================
    # 5. LIVE DASHBOARD
    #
    # Ensure specialized routes are visible together.
    # ==========================================================
    #

    old_live = '''        <Quick title="Portfolio Hub" route="/portfolio-hub" />
        <Quick title="Portfolio Analytics" route="/unified-portfolio-analytics" />
        <Quick title="Trade" route="/trade" />
        <Quick title="Order Book" route="/order-book" />'''

    new_live = '''        <Quick title="Portfolio Hub" route="/portfolio-hub" />
        <Quick title="Portfolio Analytics" route="/unified-portfolio-analytics" />
        <Quick title="Coach G" route="/(tabs)/coach" />
        <Quick title="Trade" route="/trade" />
        <Quick title="Order Book" route="/order-book" />'''

    replace_once(
        LIVE,
        old_live,
        new_live
    )

    print()
    print("PC-030C1A applied successfully.")

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )
    sys.exit(1)
