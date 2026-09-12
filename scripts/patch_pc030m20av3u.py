from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]/"mobile"
MARKER="PC-030M20AV3U RESPONSIVE CALIBRATION"

targets = {
    "app/goal-details-edit.js": {
        "anchor_re": re.compile(
            r'(?s)content\s*:\s*\{\s*width\s*:\s*"100%"\s*,\s*maxWidth\s*:\s*680\s*,(?P<body>.*?)paddingBottom\s*:\s*100\s*\}'
        ),
        "replace_width": 960,
        "required": [
            "loadCanonicalGoalDetails",
            "saveCanonicalGoalDetails",
            "Planning evidence only",
            "Practice Portfolio values are never used",
        ],
    },
    "app/goal-recovery-options.js": {
        "anchor_re": re.compile(
            r'(?s)content\s*:\s*\{\s*width\s*:\s*"100%"\s*,\s*maxWidth\s*:\s*720\s*,(?P<body>.*?)paddingBottom\s*:\s*100\s*\}'
        ),
        "replace_width": 960,
        "required": [
            "loadCurrentGoalRecoveryOptions",
            "COACH G • GOAL RECOVERY",
            "your goal, contribution, holdings, cash, or broker instructions",
        ],
    },
    "app/investor-profile-edit.js": {
        "exact_anchor": 'content: { padding: 22, paddingTop: 70, paddingBottom: 120 }',
        "required": [
            'const GOALS =',
            'const RISKS =',
            'useAuth',
            'ContainedPanel',
        ],
    },
}

for rel,cfg in targets.items():
    p=ROOT/rel
    if not p.exists():
        raise SystemExit(f"MISSING — {rel}")
    src=p.read_text(encoding="utf-8")

    for tok in cfg["required"]:
        if tok not in src:
            raise SystemExit(f"STOP — {rel} required contract token missing before patch: {tok}")

    if MARKER in src:
        for pat in [
            r'width\s*:\s*"100%"',
            r'maxWidth\s*:\s*960',
            r'alignSelf\s*:\s*"center"',
            r'paddingBottom\s*:\s*128',
        ]:
            if not re.search(pat,src):
                raise SystemExit(f"STOP — {rel} has AV3U marker but incomplete responsive calibration.")
        print(f"ALREADY APPLIED — {rel}")
        continue

    if "exact_anchor" in cfg:
        anchor=cfg["exact_anchor"]
        if src.count(anchor)!=1:
            raise SystemExit(f"STOP — {rel} expected exactly one known content style anchor; found {src.count(anchor)}.")
        replacement=(
            'content: { /* PC-030M20AV3U RESPONSIVE CALIBRATION */ '
            'width: "100%", maxWidth: 960, alignSelf: "center", '
            'padding: 22, paddingTop: 70, paddingBottom: 128 }'
        )
        out=src.replace(anchor,replacement,1)
    else:
        m=cfg["anchor_re"].search(src)
        if not m:
            raise SystemExit(f"STOP — {rel} expected existing contained content style not found.")
        whole=m.group(0)
        # Preserve all existing properties between maxWidth and paddingBottom.
        # Upgrade only containment width and bottom clearance, add marker.
        updated=re.sub(r'maxWidth\s*:\s*(680|720)', 'maxWidth: 960', whole, count=1)
        updated=re.sub(r'paddingBottom\s*:\s*100', 'paddingBottom: 128', updated, count=1)
        updated=updated.replace(
            "content: {",
            'content: { /* PC-030M20AV3U RESPONSIVE CALIBRATION */',
            1,
        )
        if 'alignSelf: "center"' not in updated:
            # Both audited goal screens were already centered; fail instead of inventing structure.
            raise SystemExit(f"STOP — {rel} existing centered containment anchor is missing.")
        out=src[:m.start()]+updated+src[m.end():]

    bak=p.with_suffix(p.suffix+".pc030m20av3u.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    p.write_text(out,encoding="utf-8")
    print(f"UPDATED — {rel}")

print("PC-030M20AV3U applied successfully.")
print("PRESERVED — canonical goal load/save evidence contract remains unchanged.")
print("PRESERVED — Goal Recovery Options remains advisory and does not mutate goal/portfolio/cash/broker instructions.")
print("PRESERVED — Investor Profile Edit goal/risk/profile behavior remains unchanged.")
