from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

HUB = APP / "portfolio-hub.js"
ANALYTICS = APP / "unified-portfolio-analytics.js"


def backup(path):
    b = path.with_suffix(
        path.suffix + ".pc030c2a1.bak"
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


def patch_text(path, old, new):
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
        return False

    else:
        raise RuntimeError(
            f"Anchor not found in "
            f"{path.relative_to(ROOT)}:\n"
            f"{old[:500]}"
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
        f"  backup -> "
        f"{archived.relative_to(ROOT)}"
    )

    return True


def append_styles(path, marker_name, styles_block):
    text = path.read_text(
        encoding="utf-8"
    )

    if marker_name in text:
        print(
            f"UNCHANGED styles "
            f"{path.relative_to(ROOT)}"
        )
        return

    marker = "\n});"

    pos = text.rfind(marker)

    if pos == -1:
        raise RuntimeError(
            "Unable to locate final "
            f"StyleSheet closing in "
            f"{path.relative_to(ROOT)}"
        )

    b = backup(path)

    text = (
        text[:pos] +
        styles_block +
        text[pos:]
    )

    path.write_text(
        text,
        encoding="utf-8"
    )

    archived = archive_backup(b)

    print(
        f"PATCHED styles "
        f"{path.relative_to(ROOT)}"
    )

    print(
        f"  backup -> "
        f"{archived.relative_to(ROOT)}"
    )


try:

    #
    # ==========================================================
    # PORTFOLIO HUB
    #
    # Insert Portfolio Tools before SectorModal.
    # ==========================================================
    #

    hub_anchor = '''      <SectorModal
        sector={selectedSector}
        onClose={() => setSelectedSector(null)}
      />'''

    hub_block = '''      <View style={styles.specialistCard}>
        <Text style={styles.specialistTitle}>
          Portfolio Tools
        </Text>

        <Text style={styles.specialistDescription}>
          Open detailed portfolio views and specialist analytics.
        </Text>

        <View style={styles.specialistGrid}>
          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push("/holding-details")
            }
          >
            <Text style={styles.specialistButtonText}>
              Holdings Detail
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push("/performance")
            }
          >
            <Text style={styles.specialistButtonText}>
              Performance
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push("/portfolio-activity")
            }
          >
            <Text style={styles.specialistButtonText}>
              Activity
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push(
                "/unified-portfolio-analytics"
              )
            }
          >
            <Text style={styles.specialistButtonText}>
              Portfolio Analytics
            </Text>
          </Pressable>
        </View>
      </View>

''' + hub_anchor

    patch_text(
        HUB,
        hub_anchor,
        hub_block
    )

    hub_styles = ''',

  specialistCard: {
    marginTop: 18,
    marginBottom: 8,
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

    append_styles(
        HUB,
        "specialistCard:",
        hub_styles
    )

    #
    # ==========================================================
    # UNIFIED PORTFOLIO ANALYTICS
    #
    # Insert specialist drill-down immediately before the
    # Executive Analytics protection card.
    # ==========================================================
    #

    analytics_anchor = '''      <View style={styles.protectionCard}>'''

    analytics_block = '''      <Section
        title="Specialist Analysis"
        description="Open the detailed engines behind the executive portfolio view."
      >
        <View style={styles.specialistGrid}>
          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push("/portfolio-risk")
            }
          >
            <Text style={styles.specialistButtonText}>
              Risk Analytics
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push("/performance")
            }
          >
            <Text style={styles.specialistButtonText}>
              Performance
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push("/portfolio-rebalancing")
            }
          >
            <Text style={styles.specialistButtonText}>
              Rebalancing
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push("/portfolio-hub")
            }
          >
            <Text style={styles.specialistButtonText}>
              Portfolio Hub
            </Text>
          </Pressable>
        </View>
      </Section>

''' + analytics_anchor

    patch_text(
        ANALYTICS,
        analytics_anchor,
        analytics_block
    )

    analytics_styles = ''',

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

    append_styles(
        ANALYTICS,
        "specialistGrid:",
        analytics_styles
    )

    print()
    print(
        "PC-030C2A1 applied successfully."
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)
