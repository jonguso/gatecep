# PC-031A2C — GateCEP Broker Canonical Identity

Purpose: make `GATECEP_PRACTICE` / `GateCEP Broker` the canonical Practice broker identity while preserving `SIM` and old simulation labels as legacy aliases. This patch is intentionally identity-only; it does not reconnect REAL queue routing yet.

Files changed:
- `mobile/src/services/brokers/brokerRegistry.js`
- `mobile/src/services/brokers/brokerAccountStore.js`
- `mobile/src/features/broker-sync/brokerCashEvidencePolicy.js`
- `mobile/src/features/broker-sync/brokerSyncService.js`

Safety contracts:
- `SIM` remains accepted as a legacy alias.
- `GATECEP_PRACTICE` remains excluded from REAL broker cash/sync evidence.
- No queue/order/trade execution behavior is changed.
- No Git commit or push is performed.

Apply from repo root:

```bash
chmod +x scripts/apply-pc031a2c-gatecep-broker-canonical-identity.sh
chmod +x scripts/verify-pc031a2c-gatecep-broker-canonical-identity.sh
bash scripts/apply-pc031a2c-gatecep-broker-canonical-identity.sh
bash scripts/verify-pc031a2c-gatecep-broker-canonical-identity.sh
```
