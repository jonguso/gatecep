PC-028N LIVE — Actual Dashboard + Portfolio Hub Wiring

This patches the real files identified from your project:

app/(tabs)/dashboard.js
app/portfolio-hub.js

Dashboard
---------
- Adds portfolio source selector.
- Uses All Accounts by default when real holdings exist.
- Falls back to Practice only when no real holdings exist.
- Lets the investor switch to a broker/account or Practice view.
- Labels Practice as simulation only.

Portfolio Hub
-------------
- Keeps its existing selector.
- Lists real accounts before Practice.
- Uses All Accounts by default when real holdings exist.
- Falls back to Practice only if no real portfolio/account data exists.
- Practice is never passed into loadUnifiedPortfolio(), so All Accounts excludes Practice.

Safety
------
The patcher uses exact anchors from the code you supplied.
If an anchor is missing, it stops instead of guessing.

Backups are created:
app/(tabs)/dashboard.js.pc028n.bak
app/portfolio-hub.js.pc028n.bak

Install
-------
Copy/extract into ~/gatecep/mobile, then:

python scripts/apply-pc028n-live.py

Verify:
bash scripts/verify-pc028n-live.sh

Restart:
npx expo start -c
