from pathlib import Path
import sys

p=Path(sys.argv[1])
s=p.read_text(encoding='utf-8')
if 'PC-030M20AS goal+risk stress' in s:
    print('NO CHANGE — M20AS Trade UI already installed')
    raise SystemExit(0)

anchor='import { buildProjectedImpactReview } from "../src/features/trading/coachGProjectedImpactService";'
if anchor not in s:
    raise SystemExit('ERROR — M20AR10 import anchor not found; refusing unsafe patch')
s=s.replace(anchor, anchor+'\nimport { loadRealCurrentInvestorWealthJourney } from "../src/features/wealth-journey/realWealthJourneyRuntime";\nimport { buildGoalRiskStressImpact, extractVerifiedGoalEvidence } from "../src/features/trading/coachGGoalRiskStressImpactService";',1)

state='  const [projectedImpactOpen, setProjectedImpactOpen] = useState(false); // PC-030M20AR8 projected impact modal'
if state not in s:
    raise SystemExit('ERROR — projected-impact state anchor not found')
s=s.replace(state, state+'\n  const [goalEvidence, setGoalEvidence] = useState({ available: false, reason: "NOT_LOADED" }); // PC-030M20AS\n  const [stressLossPercent, setStressLossPercent] = useState(20); // PC-030M20AS deterministic stress',1)

old='''    const [execution, realPortfolio, lotHistory] = await Promise.all([\n      loadBasketExecution(),\n      loadUnifiedPortfolioRuntime({ broker: "ALL" }).catch(() => null),\n      loadBrokerLotHistoryEvidence().catch(() => ({ records: [] }))\n    ]);'''
new='''    const [execution, realPortfolio, lotHistory, wealthJourney] = await Promise.all([\n      loadBasketExecution(),\n      loadUnifiedPortfolioRuntime({ broker: "ALL" }).catch(() => null),\n      loadBrokerLotHistoryEvidence().catch(() => ({ records: [] })),\n      loadRealCurrentInvestorWealthJourney().catch(() => null)\n    ]);'''
if old not in s:
    raise SystemExit('ERROR — load() Promise.all anchor not found')
s=s.replace(old,new,1)

settx='''    setRealTransactions(\n      Array.isArray(lotHistory?.records) ? lotHistory.records : []\n    );'''
if settx not in s:
    raise SystemExit('ERROR — lot-history state anchor not found')
s=s.replace(settx,settx+'\n    setGoalEvidence(extractVerifiedGoalEvidence(wealthJourney || {}));',1)

memo='  [averageCostMode, realHoldings, portfolio, selectedStock, side, estimate, existingHolding, averageGuard, cash]);'
if memo not in s:
    raise SystemExit('ERROR — projectedImpact memo anchor not found')
s=s.replace(memo,memo+'''\n\n  // PC-030M20AS goal+risk stress — scenario + verified goal evidence only.\n  const goalRiskImpact = useMemo(() =>\n    buildGoalRiskStressImpact({\n      holdings: averageCostMode ? realHoldings : portfolio,\n      projectedImpact,\n      goalEvidence,\n      stressLossPercent\n    }),\n  [averageCostMode, realHoldings, portfolio, projectedImpact, goalEvidence, stressLossPercent]);''',1)

pos=s.find('PC-030M20AR10 Coach G projected interpretation')
if pos<0:
    raise SystemExit('ERROR — M20AR10 interpretation anchor not found')
close='''                  </View>\n                </>\n              )}'''
insert_at=s.find(close,pos)
if insert_at<0:
    raise SystemExit('ERROR — Projected Impact modal insertion anchor not found')

card='''                  {/* PC-030M20AS goal+risk stress */}\n                  <View style={styles.impactCoachCard}>\n                    <Text style={styles.impactCoachLabel}>COACH G — GOAL + RISK STRESS</Text>\n                    <Text style={styles.cardTitle}>What if the projected portfolio falls?</Text>\n                    <Text style={styles.small}>Deterministic stress only — no probability or return forecast is being invented.</Text>\n\n                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 12 }}>\n                      {[10, 20, 30, 40, 50].map((loss) => (\n                        <Pressable key={`stress-${loss}`} onPress={() => setStressLossPercent(loss)} style={[styles.secondary, { paddingVertical: 8, paddingHorizontal: 10, marginTop: 0 }, stressLossPercent === loss ? { borderWidth: 2 } : null]}>\n                          <Text style={styles.secondaryText}>-{loss}%</Text>\n                        </Pressable>\n                      ))}\n                    </View>\n\n                    {goalRiskImpact?.available ? (\n                      <>\n                        <Text style={styles.body}>Scenario Risk: {goalRiskImpact.risk?.classification || "N/A"}</Text>\n                        <Text style={styles.small}>Holdings stress: -{goalRiskImpact.selectedStressLossPercent}% • Required recovery on stressed holdings: {goalRiskImpact.risk?.recoveryPercent == null ? "N/A" : `${goalRiskImpact.risk.recoveryPercent}%`}</Text>\n                        <Text style={styles.small}>Modeled net worth drawdown: {goalRiskImpact.modeledNetWorthDrawdownPercent.toFixed(2)}% • Projected liquidity: {goalRiskImpact.projectedCashPercent.toFixed(2)}%</Text>\n                        {(goalRiskImpact.risk?.reasons || []).map((reason, index) => (\n                          <Text key={`risk-reason-${index}`} style={styles.small}>• {reason}</Text>\n                        ))}\n\n                        <View style={styles.impactNotice}>\n                          {goalRiskImpact.goal?.available ? (\n                            <>\n                              <Text style={styles.body}>{goalRiskImpact.goal.goalName}</Text>\n                              <Text style={styles.small}>Goal progress: {goalRiskImpact.goal.currentProgressPercent.toFixed(2)}% → {goalRiskImpact.goal.projectedProgressPercent.toFixed(2)}%</Text>\n                              <Text style={styles.small}>Under -{goalRiskImpact.selectedStressLossPercent}% holdings stress: {goalRiskImpact.goal.stressedProgressPercent.toFixed(2)}%</Text>\n                              <Text style={styles.small}>Projected remaining amount: KES {money(goalRiskImpact.goal.projectedRemainingAmount)}</Text>\n                              <Text style={styles.small}>{goalRiskImpact.goal.message}</Text>\n                            </>\n                          ) : (\n                            <Text style={styles.small}>{goalRiskImpact.goal?.message || "Verified saved goal evidence is unavailable."}</Text>\n                          )}\n                        </View>\n\n                        <Text style={styles.small}>Risk label describes this modeled scenario, not your permanent Investor DNA risk profile.</Text>\n                      </>\n                    ) : (\n                      <Text style={styles.small}>{goalRiskImpact?.message || "Complete projected-impact evidence before running stress."}</Text>\n                    )}\n                  </View>\n'''
s=s[:insert_at]+card+s[insert_at:]
p.write_text(s,encoding='utf-8')
print('UPDATED — Projected Impact now includes verified-goal sensitivity and deterministic risk/recovery stress.')
print('REUSED — M20AQ recovery/risk engine and REAL Wealth Journey goal evidence.')
print('PRESERVED — M20AR10 interpretation, FIFO SELL accounting and Broker Action Plan boundary.')
