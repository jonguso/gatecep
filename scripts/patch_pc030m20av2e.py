
from pathlib import Path
import sys
root=Path(sys.argv[1])
alloc=root/"mobile/app/goal-recovery-allocation.js"
if not alloc.exists():
    raise SystemExit(f"ERROR — required file missing: {alloc}")
src=alloc.read_text(encoding="utf-8")
orig=src
if 'pathname: "/goal-recovery-preview"' not in src:
    marker="async function reviewDiversifiedBasket() {"
    idx=src.find(marker)
    if idx<0:
        raise SystemExit("ERROR — reviewDiversifiedBasket anchor missing.")
    fn="""function openProjectedPortfolioPreview() {
    router.push({
      pathname: "/goal-recovery-preview",
      params: {
        goalName,
        targetAmount: String(targetAmount || 0),
        targetDate: targetDate || "",
        monthlyContribution: String(monthlyContribution || 0),
        recoveryAmount: String(recoveryAmount || 0),
        projectedShortfallBeforeRecovery: String(projectedShortfall || 0),
        allocationJson: JSON.stringify(allocation?.allocation || [])
      }
    });
  }

  """
    src=src[:idx]+fn+src[idx:]
    if 'onPress={reviewDiversifiedBasket}' not in src:
        raise SystemExit("ERROR — diversified basket button handler anchor missing.")
    src=src.replace('onPress={reviewDiversifiedBasket}','onPress={openProjectedPortfolioPreview}',1)
    src=src.replace('Review diversified basket simulation','Review projected portfolio',1)

if src==orig:
    print("NO CHANGE — projected portfolio preview route already present.")
else:
    alloc.with_suffix(alloc.suffix+".pc030m20av2e.bak").write_text(orig,encoding="utf-8")
    alloc.write_text(src,encoding="utf-8")
    print("UPDATED — diversified recovery allocation now opens projected portfolio preview first.")
    print("PRESERVED — Broker Action Plan remains downstream of preview.")
