from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

COMMAND = APP / "portfolio-command-center.js"
ANALYSIS = APP / "portfolio-analysis.js"
PROFILE = APP / "my-profile.js"
LIVE = APP / "live-dashboard.js"


def backup(path):
    b = path.with_suffix(
        path.suffix + ".pc030c1.bak"
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


def write_replacement(path, content):
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


def replace(path, old, new):
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
            f"Anchor not found in {path}: {old!r}"
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
    # ----------------------------------------------------------
    # LEGACY PORTFOLIO COMMAND CENTER
    # ----------------------------------------------------------
    #

    command_compatibility = '''import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

/*
 * PC-030C1
 *
 * Legacy compatibility route.
 *
 * Canonical portfolio:
 *   /portfolio-hub
 *
 * Portfolio Command Center was a navigation shell whose
 * destinations are now available through the canonical
 * portfolio, Coach G, Trading, and supporting workflows.
 */
export default function PortfolioCommandCenterCompatibilityRoute() {
  useEffect(() => {
    router.replace("/portfolio-hub");
  }, []);

  return (
    <View style={styles.screen}>
      <ActivityIndicator />

      <Text style={styles.text}>
        Opening Portfolio Hub...
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

    write_replacement(
        COMMAND,
        command_compatibility
    )

    #
    # ----------------------------------------------------------
    # LEGACY COACH G PORTFOLIO ANALYSIS
    # ----------------------------------------------------------
    #

    analysis_compatibility = '''import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

/*
 * PC-030C1
 *
 * Legacy compatibility route.
 *
 * Canonical Coach G:
 *   /(tabs)/coach
 *
 * The former Portfolio Analysis screen duplicated portfolio
 * review, risk, recommendation, and simulation capabilities
 * now owned by the canonical Coach G experience.
 */
export default function PortfolioAnalysisCompatibilityRoute() {
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

    write_replacement(
        ANALYSIS,
        analysis_compatibility
    )

    #
    # ----------------------------------------------------------
    # MY PROFILE
    # ----------------------------------------------------------
    #

    replace(
        PROFILE,
        'onPress={() => router.push("/portfolio-command-center")}',
        'onPress={() => router.push("/portfolio-hub")}'
    )

    replace(
        PROFILE,
        '<Text style={styles.secondaryText}>Open Command Center</Text>',
        '<Text style={styles.secondaryText}>Open Portfolio Hub</Text>'
    )

    #
    # ----------------------------------------------------------
    # LIVE DASHBOARD
    # ----------------------------------------------------------
    #

    replace(
        LIVE,
        '<Quick title="Command Center" route="/portfolio-command-center" />',
        '<Quick title="Portfolio Analytics" route="/unified-portfolio-analytics" />'
    )

    print()
    print("PC-030C1 applied successfully.")

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
