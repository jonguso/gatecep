from pathlib import Path
import re
import sys

root = Path(sys.argv[1])

def read(rel):
    p = root / rel
    if not p.exists():
        raise SystemExit(f"ERROR — required file missing: {rel}")
    return p, p.read_text(encoding="utf-8")

def backup_and_write(p, original, updated, suffix):
    if original == updated:
        return False
    p.with_suffix(p.suffix + suffix).write_text(original, encoding="utf-8")
    p.write_text(updated, encoding="utf-8")
    return True

p, s = read("mobile/src/components/mobile/InvestorJourneyNavigation.js")
orig = s

new_map = '''export const INVESTOR_JOURNEY = {
  coach: { step: 1, title: "Coach Insights", previous: "/(tabs)/dashboard", next: "/unified-portfolio-analytics" },
  analysis: { step: 2, title: "Portfolio Analysis", previous: "/(tabs)/coach", next: "/performance" },
  performance: { step: 3, title: "Performance", previous: "/unified-portfolio-analytics", next: "/portfolio-risk" },
  risk: { step: 4, title: "Portfolio Risk", previous: "/performance", next: "/wealth-journey" },
  goals: { step: 5, title: "Goals & Wealth Journey", previous: "/portfolio-risk", next: "/goal-scenario-planner" },
  scenario: { step: 6, title: "Goal Recovery Simulation", previous: "/wealth-journey", next: "/(tabs)/dashboard" }
};'''

pattern = r'export const INVESTOR_JOURNEY = \{.*?\n\};'
if not re.search(pattern, s, flags=re.S):
    raise SystemExit("ERROR — INVESTOR_JOURNEY map anchor missing.")
s = re.sub(pattern, new_map, s, count=1, flags=re.S)

old_progress = '<Text style={styles.progress}>INVESTOR JOURNEY • {current.step} OF 8</Text>'
new_progress = '<Text style={styles.progress}>INVESTOR JOURNEY • {current.step} OF {Object.keys(INVESTOR_JOURNEY).length}</Text>'
if old_progress not in s and new_progress not in s:
    raise SystemExit("ERROR — Investor Journey progress anchor missing.")
s = s.replace(old_progress, new_progress, 1)

changed_nav = backup_and_write(p, orig, s, ".pc030m20av3.bak")

p, s = read("mobile/app/portfolio-risk.js")
orig = s
old = 'nextLabel="Continue to Holdings"'
new = 'nextLabel="Continue to Goals & Wealth Journey"'
if old not in s and new not in s:
    raise SystemExit("ERROR — Portfolio Risk next-label anchor missing.")
s = s.replace(old, new, 1)
changed_risk = backup_and_write(p, orig, s, ".pc030m20av3.bak")

p, s = read("mobile/app/menu.js")
orig = s
holdings_entry = '{ title: "Holdings", detail: "Review REAL holdings and security-level details", route: "/holding-details" },'
rebal_entry = '{ title: "Portfolio Rebalancing", detail: "Review allocation drift, targets, funding readiness, and advisory rebalance actions", route: "/portfolio-rebalancing" },'

if holdings_entry not in s or rebal_entry not in s:
    home_anchor = '{ title: "Home", detail: "Portfolio value, allocation, and holdings", route: "/(tabs)/dashboard" },'
    if home_anchor not in s:
        raise SystemExit("ERROR — menu Home anchor missing.")
    insertion = home_anchor + "\n      " + holdings_entry + "\n      " + rebal_entry
    s = s.replace(home_anchor, insertion, 1)

changed_menu = backup_and_write(p, orig, s, ".pc030m20av3.bak")

print("PC-030M20AV3 — Investor Journey Consolidation")
print("UPDATED — canonical Investor Journey reduced from 8 compulsory stages to 6.")
print("UPDATED — Portfolio Risk now continues directly to Goals & Wealth Journey.")
print("UPDATED — Holdings remains available from the main menu as a portfolio tool.")
print("UPDATED — Portfolio Rebalancing remains available from the main menu as an advisory tool.")
print("PRESERVED — Holdings screen and services.")
print("PRESERVED — Portfolio Rebalancing screen, advisor, targets, drift analysis, and recommendation services.")
print("PRESERVED — AV2 recovery flow, projected portfolio, verified fees, Broker Action Plan, and import-gated REAL updates.")
print(f"FILES CHANGED — navigation={changed_nav}, risk={changed_risk}, menu={changed_menu}")
