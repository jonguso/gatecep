from pathlib import Path
import shutil

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

PERFORMANCE = APP / "performance.js"

# ============================================================
# 1. PERFORMANCE BOTTOM NAVIGATION
# ============================================================

text = PERFORMANCE.read_text(encoding="utf-8")

old = '''      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >
        <Text style={styles.backText}>Back to Dashboard</Text>
      </Pressable>'''

new = '''      <Pressable
        style={styles.backButton}
        onPress={() =>
          router.replace("/unified-portfolio-analytics")
        }
      >
        <Text style={styles.backText}>
          Back to Portfolio Analytics
        </Text>
      </Pressable>'''

if old in text:
    text = text.replace(old, new, 1)
    PERFORMANCE.write_text(text, encoding="utf-8")
    print("PATCHED app/performance.js bottom navigation")
elif "Back to Portfolio Analytics" in text:
    print("UNCHANGED app/performance.js — already patched")
else:
    raise SystemExit(
        "Performance bottom navigation anchor not found."
    )

# ============================================================
# 2. ARCHIVE MANUAL BACKUPS
# ============================================================

ARCHIVE.mkdir(parents=True, exist_ok=True)

for path in [
    APP / "performance.js.bak-pc030c2b6",
    APP / "portfolio-rebalancing.js.bak-pc030c2b6"
]:
    if not path.exists():
        continue

    dest = ARCHIVE / path.name

    if dest.exists():
        i = 1

        while True:
            candidate = ARCHIVE / f"{path.name}-{i}"

            if not candidate.exists():
                dest = candidate
                break

            i += 1

    shutil.move(str(path), str(dest))

    print(
        f"ARCHIVED {path.relative_to(ROOT)} "
        f"-> {dest.relative_to(ROOT)}"
    )

print()
print("PC-030C2B6A cleanup complete.")
