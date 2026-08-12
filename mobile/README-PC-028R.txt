PC-028R — Canonical Cash Source

Real cash source:
userStorage["availableCash"]

Practice cash source:
practicePortfolio.availableCash

Rules:
- Real portfolio screens never fall back to Practice cash.
- Practice uses its own simulated cash.
- Shared Portfolio Engine remains the arithmetic source of truth.
- Net Worth = Portfolio Value + Available Cash.

Expected current real values:
Portfolio       KES 1,119,894.00
Available Cash  KES     1,655.35
Net Worth       KES 1,121,549.35

Install:
cd ~/gatecep/mobile
python scripts/apply-pc028r.py
bash scripts/verify-pc028r.sh
npx expo start -c

Backups:
app/(tabs)/dashboard.js.pc028r.bak
app/portfolio-hub.js.pc028r.bak
src/features/wealth-journey/canonicalRealWealthContextService.js.pc028r.bak
