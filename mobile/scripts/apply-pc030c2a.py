from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

HUB = APP / "portfolio-hub.js"
ANALYTICS = APP / "unified-portfolio-analytics.js"


def backup(path):
    b = path.with_suffix(path.suffix + ".pc030c2a.bak")
    shutil.copy2(path, b)
    return b


def archive_backup(path):
    rel = path.relative_to(APP)
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


def replace_once(path, old, new):
    original = path.read_text(encoding="utf-8")

    if old in original:
        text = original.replace(old, new, 1)

    elif new in original:
        print(f"UNCHANGED {path.relative_to(ROOT)}")
        return

    else:
        raise RuntimeError(
            f"Anchor not found in {path.relative_to(ROOT)}:\n"
            f"{old[:500]}"
        )

    b = backup(path)
    path.write_text(text, encoding="utf-8")
    archived = archive_backup(b)

    print(f"PATCHED {path.relative_to(ROOT)}")
    print(f"  backup -> {archived.relative_to(ROOT)}")


try:
    #
    # ----------------------------------------------------------
    # PORTFOLIO HUB
    #
    # Add specialist destinations without replacing the Hub's
    # own Holdings / Performance / Income / Transactions tabs.
    # ----------------------------------------------------------
    #

    hub_anchor = '''      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >'''

    hub_specialists = '''      <View style={styles.specialistCard}>
        <Text style={styles.specialistTitle}>
          Portfolio Tools
        </Text>

        <Text style={styles.specialistDescription}>
          Open detailed portfolio views and specialist analytics.
        </Text>

        <View style={styles.specialistGrid}>
          <Pressable
            style={styles.specialistButton}
            onPress={() => router.push("/holding-details")}
          >
            <Text style={styles.specialistButtonText}>
              Holdings Detail
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() => router.push("/performance")}
          >
            <Text style={styles.specialistButtonText}>
              Performance
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() => router.push("/portfolio-activity")}
          >
            <Text style={styles.specialistButtonText}>
              Activity
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() => router.push("/unified-portfolio-analytics")}
          >
            <Text style={styles.specialistButtonText}>
              Portfolio Analytics
            </Text>
          </Pressable>
        </View>
      </View>

''' + hub_anchor

    replace_once(
        HUB,
        hub_anchor,
        hub_specialists
    )

    #
    # Add Hub styles before StyleSheet closes.
    #
    # Use the final closing sequence as an exact end-of-styles
    # anchor. If your file differs, the patch fails safely.
    #

    hub_text = HUB.read_text(encoding="utf-8")

    if "specialistCard:" not in hub_text:
        marker = "\n});"

        pos = hub_text.rfind(marker)

        if pos == -1:
            raise RuntimeError(
                "Unable to locate final StyleSheet closing in portfolio-hub.js"
            )

        styles = ''',

  specialistCard: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 18,
    padding: 16
  },

  specialistTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900"
  },

  specialistDescription: {
    color: "#94a3b8",
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 20
  },

  specialistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },

  specialistButton: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14
  },

  specialistButtonText: {
    color: "#e2e8f0",
    fontWeight: "800"
  }'''

        b = backup(HUB)

        hub_text = (
            hub_text[:pos] +
            styles +
            hub_text[pos:]
        )

        HUB.write_text(
            hub_text,
            encoding="utf-8"
        )

        archived = archive_backup(b)

        print("PATCHED app/portfolio-hub.js styles")
        print(
            f"  backup -> {archived.relative_to(ROOT)}"
        )

    #
    # ----------------------------------------------------------
    # UNIFIED PORTFOLIO ANALYTICS
    #
    # Add explicit specialist drill-down destinations:
    # Risk / Performance / Rebalancing.
    # ----------------------------------------------------------
    #

    analytics_anchor = '''        <Text style={styles.disclaimer}>'''

    analytics_tools = '''        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Specialist Analysis
          </Text>

          <Text style={styles.cardDescription}>
            Open the detailed engines behind the executive portfolio view.
          </Text>

          <View style={styles.specialistGrid}>
            <Pressable
              style={styles.specialistButton}
              onPress={() => router.push("/portfolio-risk")}
            >
              <Text style={styles.specialistButtonText}>
                Risk Analytics
              </Text>
            </Pressable>

            <Pressable
              style={styles.specialistButton}
              onPress={() => router.push("/performance")}
            >
              <Text style={styles.specialistButtonText}>
                Performance
              </Text>
            </Pressable>

            <Pressable
              style={styles.specialistButton}
              onPress={() => router.push("/portfolio-rebalancing")}
            >
              <Text style={styles.specialistButtonText}>
                Rebalancing
              </Text>
            </Pressable>

            <Pressable
              style={styles.specialistButton}
              onPress={() => router.push("/portfolio-hub")}
            >
              <Text style={styles.specialistButtonText}>
                Portfolio Hub
              </Text>
            </Pressable>
          </View>
        </View>

''' + analytics_anchor

    replace_once(
        ANALYTICS,
        analytics_anchor,
        analytics_tools
    )

    analytics_text = ANALYTICS.read_text(
        encoding="utf-8"
    )

    if "specialistGrid:" not in analytics_text:
        marker = "\n});"

        pos = analytics_text.rfind(marker)

        if pos == -1:
            raise RuntimeError(
                "Unable to locate final StyleSheet closing in "
                "unified-portfolio-analytics.js"
            )

        styles = ''',

  specialistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },

  specialistButton: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14
  },

  specialistButtonText: {
    color: "#e2e8f0",
    fontWeight: "800"
  }'''

        b = backup(ANALYTICS)

        analytics_text = (
            analytics_text[:pos] +
            styles +
            analytics_text[pos:]
        )

        ANALYTICS.write_text(
            analytics_text,
            encoding="utf-8"
        )

        archived = archive_backup(b)

        print(
            "PATCHED app/unified-portfolio-analytics.js styles"
        )

        print(
            f"  backup -> {archived.relative_to(ROOT)}"
        )

    print()
    print("PC-030C2A applied successfully.")

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )
    sys.exit(1)
