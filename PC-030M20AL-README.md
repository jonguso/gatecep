# PC-030M20AL — Canonical Security Identity & Symbol Alias Normalization

Purpose: eliminate false reconciliation splits caused by different source symbols for the same security, while preserving immutable source evidence.

Initial canonical identity:
- GateCEP canonical symbol: `EQT`
- Accepted source aliases: `EQT`, `EQTY`, `EQTYO0000`
- Canonical name: Equity Group Holdings PLC

Rules:
- Raw source symbols remain preserved (`rawSymbol`).
- Analytical/ledger/reconciliation services use `canonicalSymbol` / canonical `symbol`.
- Existing already-imported CDSC statements are normalized when their register is rebuilt; no re-upload is required and the stored source PDF/evidence is not rewritten.
- Future CDSC rows are canonicalized during derivation while retaining source symbol provenance.
- Broker holdings and broker transactions are canonicalized before reconciliation.
- Historical FIFO and canonical portfolio-ledger services consume canonical identity.
- Alias collision detection prevents two canonical securities from claiming the same alias.
- No REAL or Practice portfolio mutation is introduced.

Expected Equity result after restart:
- one `EQT` analytical row, not separate `EQT` and `EQTY` rows;
- CDSC closing 1,800 and broker quantity 1,750 surface as the genuine dated `-50` position difference for investigation.

Install from `~/gatecep`, then verify from `~/gatecep/mobile`.
