# PC-030M11A — Authoritative Broker Snapshot

This update simplifies verified broker imports to:

1. Verify CDS, broker, and trading/client account identity.
2. Review the broker portfolio valuation.
3. Upload and verify the matching cash/ledger statement.
4. Preview the current and incoming totals.
5. Confirm one authoritative replacement.

The confirmation uses a shared React Native modal rather than platform alert callbacks, so the action works consistently on Expo Web, Android, and iOS.

The confirmed broker snapshot replaces canonical REAL holdings and cash locally and through the existing authenticated backend contracts. An audit record and portfolio snapshot are created, then the temporary evidence is cleared so it cannot be applied twice.

The comparison engine remains available as audit information, but investors no longer document every difference. GateCEP does not originate REAL trades, so broker quantity and cost basis are authoritative. Verified market prices may subsequently change only current price, market value, and net worth.

Run:

```bash
chmod +x scripts/verify-pc030m11a-authoritative-broker-snapshot.sh
bash scripts/verify-pc030m11a-authoritative-broker-snapshot.sh
```
