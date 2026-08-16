# GateCEP Broker Valuation + Cash Evidence Follow-up

Apply this ZIP after `gatecep-broker-evidence-reconciliation.zip`.

## Corrected reconciliation contract

- Broker portfolio valuation supplies holdings evidence.
- Broker cash/ledger statement supplies cash evidence.
- Both are required before full account-value reconciliation is available.
- Missing cash evidence is represented as `EVIDENCE_REQUIRED`, never KES 0.
- A valuation-only match does not create a false cash mismatch or resolution case.
- Reconciliation-mode cash upload does not change canonical REAL available cash.

## Apply and verify

```bash
cd ~/gatecep/mobile
unzip -o ~/Downloads/gatecep-broker-valuation-cash-evidence.zip
chmod +x scripts/verify-broker-evidence-reconciliation.sh
bash scripts/verify-broker-evidence-reconciliation.sh
```

Restart Metro afterward with `npx expo start --clear`.
