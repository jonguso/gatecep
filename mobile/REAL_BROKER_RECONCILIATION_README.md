# GateCEP REAL Broker Reconciliation

This change connects the existing broker reconciliation workflow to the
canonical investor UI and moves its active data boundary from Practice to the
REAL All Accounts portfolio.

## Investor flow

1. Open **Portfolio Sync Center**.
2. Select **Open Broker Reconciliation**.
3. Synchronize the connected broker account to create a read-only mirror.
4. Compare that mirror with GateCEP's canonical REAL portfolio.
5. Review and approve a reconciliation action before any REAL holding changes.

Broker APIs that are not enabled remain explicitly unavailable. GateCEP does
not fabricate broker observations or fall back to Practice holdings.

## Apply

Copy this archive over the matching paths in `~/gatecep/mobile`.

## Verify

```bash
cd ~/gatecep/mobile
chmod +x scripts/verify-real-broker-reconciliation.sh
bash scripts/verify-real-broker-reconciliation.sh
```

The verification proves that Practice cannot enter reconciliation, the UI uses
connected broker adapters, approved imports use the REAL mutation boundary,
all visible routes resolve, and the Expo web export succeeds.
