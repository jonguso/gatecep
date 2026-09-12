from pathlib import Path
import sys

path = Path(sys.argv[1])
src = path.read_text(encoding="utf-8")
original = src

if 'goalRecoveryBasketHandoffService' not in src:
    needle = 'import {\n  requestFloatingCoachGOpen\n} from "../src/features/trading/floatingCoachGActivationService";'
    if needle not in src:
        raise SystemExit("ERROR — Floating Coach import anchor not found; no source changes written.")
    src = src.replace(
        needle,
        needle + '\n\nimport { buildRecoveryBasketExecution } from "../src/features/wealth-journey/goalRecoveryBasketHandoffService";\nimport { saveBasketExecution } from "../src/services/trade/basketExecutionStore";',
        1
    )

if 'async function reviewDiversifiedBasket()' not in src:
    anchor = 'function discussWithCoachG() {'
    idx = src.find(anchor)
    if idx < 0:
        raise SystemExit("ERROR — discussWithCoachG anchor not found; no source changes written.")
    fn = '''async function reviewDiversifiedBasket() {
    const handoff = buildRecoveryBasketExecution({
      allocation: allocation?.allocation || [],
      recoveryAmount,
      goalContext: { goalName, targetAmount, targetDate, monthlyContribution }
    });

    if (!handoff?.ok || !handoff?.execution) {
      setError("A diversified allocation with at least two priced securities is required before basket review.");
      return;
    }

    await saveBasketExecution(handoff.execution);

    router.push({
      pathname: "/basket-execution",
      params: {
        mode: "BROKER_PLAN",
        source: "GOAL_RECOVERY",
        scenarioFunding: String(recoveryAmount || 0),
        goalName
      }
    });
  }

  '''
    src = src[:idx] + fn + src[idx:]

if 'Review diversified basket simulation' not in src:
    marker = '''<Pressable
        style={styles.primary}
        onPress={discussWithCoachG}
        disabled={loading}
      >'''
    if marker not in src:
        raise SystemExit("ERROR — Coach G button anchor not found; no source changes written.")
    button = '''{allocation?.status === "AVAILABLE" ? (
        <Pressable
          style={styles.primary}
          onPress={reviewDiversifiedBasket}
          disabled={loading}
        >
          <Text style={styles.primaryText}>
            Review diversified basket simulation
          </Text>
        </Pressable>
      ) : null}

      '''
    src = src.replace(marker, button + marker, 1)

if src != original:
    path.with_suffix(path.suffix + ".pc030m20av2b.bak").write_text(original, encoding="utf-8")
    path.write_text(src, encoding="utf-8")
    print("UPDATED — AV2 allocation now hands off all recommended securities to basket review.")
    print("UPDATED — recovery funding remains scenario funding, separate from REAL cash.")
    print("UPDATED — handoff opens /basket-execution in BROKER_PLAN mode.")
else:
    print("NO CHANGE — AV2B already present.")
