from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
ARCHIVE = ROOT / "archive" / "expo-router-nonroutes" / "bak"

COACH = APP / "(tabs)" / "coach.js"
INSIGHTS = APP / "coach-insights.js"


def backup(path):
    b = path.with_suffix(path.suffix + ".pc030b1.bak")
    shutil.copy2(path, b)
    return b


def archive_backup(path):
    try:
        rel = path.relative_to(APP)
    except ValueError:
        rel = path.name

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


def patch(path, replacements):
    original = path.read_text(encoding="utf-8")
    text = original

    for old, new in replacements:
        if old in text:
            text = text.replace(old, new, 1)
        elif new in text:
            continue
        else:
            raise RuntimeError(
                f"Anchor not found in {path}: {old[:140]!r}"
            )

    if text == original:
        print(f"UNCHANGED {path.relative_to(ROOT)}")
        return

    b = backup(path)
    path.write_text(text, encoding="utf-8")
    archived = archive_backup(b)

    print(f"PATCHED {path.relative_to(ROOT)}")
    print(f"  backup -> {archived.relative_to(ROOT)}")


try:
    #
    # ----------------------------------------------------------
    # CANONICAL COACH
    # ----------------------------------------------------------
    #

    patch(
        COACH,
        [
            #
            # Remove direct AsyncStorage dependency.
            #
            (
                'import AsyncStorage from "@react-native-async-storage/async-storage";\n',
                ''
            ),

            #
            # Add canonical recommendation lifecycle service.
            #
            (
                '''import {
  userGetItem,
  userSetItem
} from "../../src/auth/userStorage";''',

                '''import {
  userGetItem
} from "../../src/auth/userStorage";

import {
  RECOMMENDATION_STATUS,
  saveRecommendationRecord
} from "../../src/coach/recommendationLifecycleStore";'''
            ),

            #
            # Normalize load() to user-scoped storage.
            #
            (
                '''    const txUploadedRaw = await AsyncStorage.getItem("gatecepTransactionsUploaded");
    const txRaw = await AsyncStorage.getItem("gatecepTransactionHistory");
    const historyRaw = await AsyncStorage.getItem("gatecepRecommendationHistory");''',

                '''    const txUploadedRaw =
      await userGetItem("transactionsUploaded");

    const txRaw =
      await userGetItem("transactionHistory");

    const historyRaw =
      await userGetItem("recommendationHistory");'''
            ),

            #
            # Replace legacy recommendation writer with lifecycle store.
            #
            (
                '''  async function saveRecommendation() {
    const raw = await AsyncStorage.getItem("gatecepRecommendationHistory");
    const history = raw ? JSON.parse(raw) : [];

    history.unshift({
      savedAt: new Date().toISOString(),
      portfolioValue: value,
      largestSector,
      amount,
      goal,
      scenario,
      intensity,
      sectorPlan,
      status: "SAVED_NOT_EXECUTED"
    });

    await AsyncStorage.setItem(
      "gatecepRecommendationHistory",
      JSON.stringify(history)
    );

    setRecommendationHistory(history);

    Alert.alert("Saved", "Coach G strategy saved to your profile.");
  }''',

                '''  async function saveRecommendation() {
    const record =
      await saveRecommendationRecord({
        portfolioValue: value,
        largestSector,
        amount,
        goal,
        scenario,
        intensity,
        sectorPlan,

        status:
          RECOMMENDATION_STATUS.SAVED,

        executionStatus:
          "NOT_STARTED",

        source:
          "CANONICAL_COACH_G"
      });

    const historyRaw =
      await userGetItem(
        "recommendationHistory"
      );

    setRecommendationHistory(
      historyRaw
        ? JSON.parse(historyRaw)
        : []
    );

    Alert.alert(
      "Saved",
      "Coach G strategy saved to your profile."
    );

    return record;
  }'''
            ),

            #
            # Give specialized execution workflow a deliberate entry.
            #
            (
                '''          <QuickCard title="Wealth Journey" desc="Review goals, progress, and Coach G check-ins" route="/wealth-journey" />
          <QuickCard title="Portfolio Hub" desc="Open your current portfolio view" route="/portfolio-hub" />''',

                '''          <QuickCard title="Wealth Journey" desc="Review goals, progress, and Coach G check-ins" route="/wealth-journey" />
          <QuickCard title="Recommendation Workspace" desc="Review saved recommendations and prepare a trade basket" route="/coach-insights" />
          <QuickCard title="Portfolio Hub" desc="Open your current portfolio view" route="/portfolio-hub" />'''
            )
        ]
    )

    #
    # ----------------------------------------------------------
    # SPECIALIZED COACH WORKSPACE
    # ----------------------------------------------------------
    #

    patch(
        INSIGHTS,
        [
            (
                '<Text style={styles.title}>Coach G Insights</Text>',
                '<Text style={styles.title}>Coach G Recommendation Workspace</Text>'
            ),

            (
                '''        <Text style={styles.section}>Coach G Portfolio Review</Text>''',

                '''        <Text style={styles.section}>Recommendation & Execution Review</Text>'''
            ),

            #
            # Add canonical Coach G return button beside Dashboard.
            #
            (
                '''          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>''',

                '''          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>

        <Pressable
          style={styles.dashboardButton}
          onPress={() =>
            router.replace("/(tabs)/coach")
          }
        >
          <Text style={styles.dashboardButtonText}>
            Coach G
          </Text>
        </Pressable>
      </View>'''
            )
        ]
    )

    print()
    print("PC-030B1 applied successfully.")

except Exception as error:
    print(f"ERROR: {error}", file=sys.stderr)
    sys.exit(1)
