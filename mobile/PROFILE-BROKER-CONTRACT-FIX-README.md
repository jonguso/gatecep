# GateCEP Profile + Broker Contract Fix

This patch fixes three connected investor-facing failures:

- Save Investor Profile threw before calling the API because its payload used
  undefined variables.
- My Profile did not consistently read locally persisted profile fields.
- Broker consumers expected `{ brokers: [] }`, while the API helper returned a
  raw array.

## Apply

Extract this archive into `~/gatecep/mobile`, preserving paths and replacing
the included files.

## Verify

```bash
cd ~/gatecep/mobile
chmod +x scripts/verify-profile-broker-contract-fix.sh
bash scripts/verify-profile-broker-contract-fix.sh
```

## Browser check

1. Open `/investor-profile-edit`.
2. Change at least one profile value and press **Save Investor Profile**.
3. Confirm `/my-profile` displays the saved values.
4. Confirm its Broker card displays the locally or cloud-saved broker.
5. Return to Dashboard and confirm the Active Account banner is consistent.

The patch does not create a new profile or broker source. It normalizes the
existing cloud and user-scoped local compatibility contracts.
