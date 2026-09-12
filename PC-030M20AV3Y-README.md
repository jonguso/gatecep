# PC-030M20AV3Y — Link Broker Account Responsive Calibration

AV3W1 confirmed `/link-broker-account` is canonically reachable from
`/broker-marketplace`.

This package targets only:
- app/link-broker-account.js

Responsive changes:
- width: 100%
- maxWidth: 960
- alignSelf: center
- paddingBottom: 128

Protected behavior:
- uses the existing canonical `upsertBrokerAccount`
- preserves `defaultBroker: true`
- preserves the successful save confirmation
- preserves return to `/broker-accounts`
- preserves the identity rule that CDS is user-level and is not used as the broker account key

No broker API behavior, fee logic, portfolio mutation, or trade execution behavior is added.
