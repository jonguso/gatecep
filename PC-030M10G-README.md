# PC-030M10G — Complete NSE Security Master

GateCEP now recognizes the broad NSE universe instead of the original limited set of portfolio counters.

## What changed

- Expands the canonical registry from 22 entries to more than 60 equities and listed instruments.
- Covers every counter in the supplied 50-row full-market NSE dataset.
- Adds current equities such as Family Bank and Kenya Pipeline Company.
- Registers NSE ETFs and REITs without inventing prices when a verified quote is unavailable.
- Preserves broker/provider aliases such as `EQTY -> EQT`, `IMH -> IM`, `DTB -> DTK`, and `SKL.O0000 -> SKL`.
- Keeps the verified Local EOD price boundary unchanged.

The security master identifies instruments. It does not make an instrument valuation-eligible by itself. A positive, verified quote is still required before GateCEP revalues a REAL portfolio.

## Install and verify

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m10g-complete-nse-security-master.zip

cd backend
chmod +x scripts/verify-pc030m10g-complete-nse-security-master.sh
bash scripts/verify-pc030m10g-complete-nse-security-master.sh
npm start
```

No database migration is required for M10G.
