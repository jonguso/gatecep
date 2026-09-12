from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]/"mobile"
p=ROOT/"app/investor-alert-review.js"

src=p.read_text(encoding="utf-8")

bad='paddingTop: 54,, gap: 16'
good='paddingTop: 54, gap: 16'

if bad in src:
    bak=p.with_suffix(p.suffix+".pc030m20av3r2.bak")
    if not bak.exists():
        bak.write_text(src,encoding="utf-8")
    p.write_text(src.replace(bad,good,1),encoding="utf-8")
    print("UPDATED — app/investor-alert-review.js")
    print("FIXED — duplicate comma introduced after paddingTop: 54.")
elif good in src and "PC-030M20AV3R RESPONSIVE CALIBRATION" in src:
    print("ALREADY FIXED — app/investor-alert-review.js")
else:
    raise SystemExit(
        "STOP — expected AV3R duplicate-comma pattern not found; "
        "no broader source rewrite attempted."
    )

print("PC-030M20AV3R2 syntax hotfix applied successfully.")
print("PRESERVED — responsive calibration and all navigation/business contracts remain unchanged.")
