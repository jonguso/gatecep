from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
SRC = ROOT / "src"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

GENERIC_COACH_FILES = [
    APP / "analysis-ready.js",
    APP / "order-book.js",
    APP / "portfolio-command-center.js",
    APP / "portfolio-sync-center.js",
    APP / "watchlist-old.js",
    SRC / "services" / "alerts" / "alertStore.js"
]

COACH_DASHBOARD = APP / "coach-dashboard.js"


def backup(path):
    b = path.with_suffix(path.suffix + ".pc030b2.bak")
    shutil.copy2(path, b)
    return b


def archive_backup(path):
    try:
        rel = path.relative_to(APP)
    except ValueError:
        rel = Path("src") / path.relative_to(SRC)

    dest = ARCHIVE / rel
    dest.parent.mkdir(parents=True, exist_ok=True)

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

    shutil.move(str(path), str(dest))
    return dest


def replace_all(path, old, new):
    if not path.exists():
        raise FileNotFoundError(path)

    original = path.read_text(encoding="utf-8")
    text = original.replace(old, new)

    if text == original:
        print(f"UNCHANGED {path.relative_to(ROOT)}")
        return

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
    # ----------------------------------------------------------
    # GENERIC COACH G CALLERS
    # ----------------------------------------------------------
    #
    # These are Coach G home / behavior / navigation actions,
    # not recommendation execution actions.
    #

    for path in GENERIC_COACH_FILES:
        replace_all(
            path,
            '"/coach-insights"',
            '"/(tabs)/coach"'
        )

    #
    # ----------------------------------------------------------
    # COACH DASHBOARD COMPATIBILITY ROUTE
    # ----------------------------------------------------------
    #
    # No current callers remain.
    #
    # Keep /coach-dashboard alive for old bookmarks / deep links,
    # but immediately redirect to canonical Coach G.
    #

    original = COACH_DASHBOARD.read_text(
        encoding="utf-8"
    )

    compatibility = '''import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

/*
 * PC-030B2
 *
 * Legacy compatibility route.
 *
 * Canonical Coach G:
 *   /(tabs)/coach
 *
 * This route remains temporarily so old bookmarks,
 * notifications, or historical deep links do not break.
 */
export default function CoachDashboardCompatibilityRoute() {
  useEffect(() => {
    router.replace("/(tabs)/coach");
  }, []);

  return (
    <View style={styles.screen}>
      <ActivityIndicator />

      <Text style={styles.text}>
        Opening Coach G...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },

  text: {
    color: "#cbd5e1",
    fontWeight: "700"
  }
});
'''

    if original != compatibility:
        b = backup(COACH_DASHBOARD)

        COACH_DASHBOARD.write_text(
            compatibility,
            encoding="utf-8"
        )

        archived = archive_backup(b)

        print(
            "PATCHED app/coach-dashboard.js "
            "-> compatibility redirect"
        )

        print(
            f"  backup -> {archived.relative_to(ROOT)}"
        )

    print()
    print("PC-030B2 applied successfully.")

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
