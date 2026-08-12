# GateCEP Profile Contract Fix

This package fixes the investor-profile edit/card mismatch and the apparently
unresponsive Save button.

## Apply

Copy the package contents over the matching paths in `~/gatecep/mobile`.

## Verify

From `~/gatecep/mobile` run:

```bash
chmod +x scripts/verify-profile-broker-contract-fix.sh
bash scripts/verify-profile-broker-contract-fix.sh
```

Expected contract results include:

- Journey codes map to the labels used by the edit form and profile card.
- the locally saved profile wins over stale cloud data;
- Save persists locally and returns to My Profile before cloud synchronization;
- existing Journey, Investor DNA, wealth blueprint, and broker fields survive edits;
- all visible routes and the Expo web export pass.
