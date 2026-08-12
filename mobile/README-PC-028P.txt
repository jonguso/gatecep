PC-028P — Uniform Net Worth Formula

Rule:
NET WORTH = PORTFOLIO VALUE + AVAILABLE CASH

Applies to:
- All Accounts
- individual broker/account
- Imported Portfolio
- Practice Portfolio

Practice is still simulation only and remains excluded from:
- real Wealth Journey
- DNA reconciliation
- recommendation compliance
- All Accounts aggregation

Current examples:
All Accounts:
1,119,894.00 + 1,655.35 = 1,121,549.35

Practice:
8,344.65 + 1,655.35 = 10,000.00

PC-028P also feeds the synced real cash value into canonical All Accounts so
Goal Progress and Wealth Journey use the same real cash amount.

Install:
cd ~/gatecep/mobile
python scripts/apply-pc028p.py
bash scripts/verify-pc028p.sh
npx expo start -c
