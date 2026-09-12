from pathlib import Path
import sys

root = Path(sys.argv[1])
screen = root / "mobile/app/basket-execution.js"
if not screen.exists():
    raise SystemExit(f"ERROR — required file missing: {screen}")

src = screen.read_text(encoding="utf-8")
orig = src

if 'After broker execution — Import & Verify' not in src:
    anchor = '''        <View style={styles.safeguardCard}>
          <Text style={styles.cardTitle}>Import-Gated Record</Text>
          <Text style={styles.body}>This is an advisory handoff, not an order, fill or execution confirmation. It cannot update REAL or Practice holdings, cash, cost basis, profit/loss or trade history. Only confirmed broker activity imported through reconciliation may update the REAL portfolio.</Text>
        </View>'''

    if anchor not in src:
        raise SystemExit("ERROR — Import-Gated Record anchor missing; no source changes written.")

    block = '''        <View style={styles.safeguardCard}>
          <Text style={styles.cardTitle}>Import-Gated Record</Text>
          <Text style={styles.body}>This is an advisory handoff, not an order, fill or execution confirmation. It cannot update REAL or Practice holdings, cash, cost basis, profit/loss or trade history. Only confirmed broker activity imported through reconciliation may update the REAL portfolio.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Step</Text>
          <Text style={styles.body}>
            Use or share this plan with your broker. After the broker has actually executed the trades, import and verify the broker activity before GateCEP updates any REAL portfolio record.
          </Text>

          <Pressable
            style={styles.primary}
            onPress={() => router.push("/portfolio-sync-center")}
          >
            <Text style={styles.primaryText}>After broker execution — Import & Verify</Text>
          </Pressable>

          <Pressable
            style={styles.secondary}
            onPress={() => router.replace("/wealth-journey")}
          >
            <Text style={styles.secondaryText}>Return to Wealth Journey</Text>
          </Pressable>
        </View>'''

    src = src.replace(anchor, block, 1)

if src == orig:
    print("NO CHANGE — AV2D completion path already present.")
else:
    backup = screen.with_suffix(screen.suffix + ".pc030m20av2d.bak")
    backup.write_text(orig, encoding="utf-8")
    screen.write_text(src, encoding="utf-8")
    print("UPDATED — Broker Action Plan Review now has a forward path to Sync & Reconcile.")
    print("UPDATED — investors can return to Wealth Journey without clearing the plan.")
