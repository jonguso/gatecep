from pathlib import Path
import sys

root = Path(sys.argv[1])
choice = root / "mobile/app/goal-recovery-choice.js"
allocation = root / "mobile/app/goal-recovery-allocation.js"
preview = root / "mobile/app/goal-recovery-preview.js"

for p in (choice, allocation, preview):
    if not p.exists():
        raise SystemExit(f"ERROR — required file missing: {p}")

# 1) Preserve planner projectedValue through Recovery Choice -> Allocation.
src = choice.read_text(encoding="utf-8")
orig = src
anchor = '      projectedShortfall:fundingNeed?.futureShortfall??projectedShortfall??"",\n'
if '      projectedValue:projectedValue??"",\n' not in src:
    if anchor not in src:
        raise SystemExit("ERROR — Recovery Choice allocation handoff anchor missing.")
    src = src.replace(anchor, anchor + '      projectedValue:projectedValue??"",\n', 1)

if src != orig:
    choice.with_suffix(choice.suffix + ".pc030m20av2e2.bak").write_text(orig, encoding="utf-8")
    choice.write_text(src, encoding="utf-8")
    print("UPDATED — Recovery Choice now carries projectedValue into Diversified Allocation.")
else:
    print("NO CHANGE — projectedValue already carried by Recovery Choice.")

# 2) Preserve route evidence exactly; do not manufacture zero.
src = allocation.read_text(encoding="utf-8")
orig = src
old_short = '        projectedShortfallBeforeRecovery: String(Number(params?.projectedShortfall ?? params?.goalGap ?? 0) || 0),'
new_short = '        projectedShortfallBeforeRecovery: params?.projectedShortfall ?? params?.goalGap ?? "",'
old_value = '        projectedValueBeforeRecovery: String(Number(params?.projectedValue ?? 0) || 0),'
new_value = '        projectedValueBeforeRecovery: params?.projectedValue ?? "",'

if old_short in src:
    src = src.replace(old_short, new_short, 1)
elif new_short not in src:
    raise SystemExit("ERROR — projectedShortfallBeforeRecovery handoff anchor missing.")

if old_value in src:
    src = src.replace(old_value, new_value, 1)
elif new_value not in src:
    raise SystemExit("ERROR — projectedValueBeforeRecovery handoff anchor missing.")

if src != orig:
    allocation.with_suffix(allocation.suffix + ".pc030m20av2e2.bak").write_text(orig, encoding="utf-8")
    allocation.write_text(src, encoding="utf-8")
    print("UPDATED — Allocation preserves projection evidence without converting missing values to zero.")
else:
    print("NO CHANGE — Allocation projection evidence handoff already corrected.")

# 3) Preview treats blank/missing projection evidence as unavailable, not KES 0.00.
src = preview.read_text(encoding="utf-8")
orig = src

old_helpers = (
    'function first(v){return Array.isArray(v)?v[0]:v;}\n'
    'function num(v){const x=Number(first(v));return Number.isFinite(x)?x:0;}\n'
    'function money(v){return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}'
)
new_helpers = (
    'function first(v){return Array.isArray(v)?v[0]:v;}\n'
    'function num(v){const x=Number(first(v));return Number.isFinite(x)?x:0;}\n'
    'function maybeNum(v){\n'
    '  const raw=first(v);\n'
    '  if(raw===undefined||raw===null||String(raw).trim()==="")return null;\n'
    '  const x=Number(raw);\n'
    '  return Number.isFinite(x)?x:null;\n'
    '}\n'
    'function money(v){return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}'
)

if 'function maybeNum(v)' not in src:
    if old_helpers not in src:
        raise SystemExit("ERROR — Preview numeric helper anchor missing.")
    src = src.replace(old_helpers, new_helpers, 1)

old_proj = (
    '  const projectedValueBeforeRecovery=first(params.projectedValueBeforeRecovery)===undefined?null:num(params.projectedValueBeforeRecovery);\n'
    '  const projectedShortfallBeforeRecovery=first(params.projectedShortfallBeforeRecovery)===undefined?null:num(params.projectedShortfallBeforeRecovery);'
)
new_proj = (
    '  const projectedValueBeforeRecovery=maybeNum(params.projectedValueBeforeRecovery);\n'
    '  const projectedShortfallBeforeRecovery=maybeNum(params.projectedShortfallBeforeRecovery);'
)

if old_proj in src:
    src = src.replace(old_proj, new_proj, 1)
elif new_proj not in src:
    raise SystemExit("ERROR — Preview projection parsing anchor missing.")

if src != orig:
    preview.with_suffix(preview.suffix + ".pc030m20av2e2.bak").write_text(orig, encoding="utf-8")
    preview.write_text(src, encoding="utf-8")
    print("UPDATED — Preview no longer renders missing projection evidence as KES 0.00.")
else:
    print("NO CHANGE — Preview projection parsing already corrected.")
