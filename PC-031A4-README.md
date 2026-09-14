# PC-031A4 — Mode-Aware Queue → Broker Adapter Recovery

Purpose:
- Reconnect the shared OMS queue to the broker adapter layer.
- Keep PRACTICE on GateCEP Broker.
- Route REAL orders only to a connected REAL broker account.
- Preserve pending API responses as ROUTED + MANUAL_CONFIRMATION_REQUIRED.
- Never manufacture BROKER_RECEIVED for REAL orders.
- Block manual REAL partial/fill simulation.
- Keep REAL portfolio/cash/FIFO mutation behind verified broker evidence.

Behavior:
PRACTICE:
  QUEUED/BROKER_SELECTED -> GateCEP Broker -> BROKER_RECEIVED
  Practice partial/fill controls remain available.

REAL:
  QUEUED/BROKER_SELECTED -> selected/default connected REAL broker
  -> placeBrokerOrder()
  -> current pending adapters return MANUAL_CONFIRMATION_REQUIRED
  -> order remains ROUTED, brokerOrderId remains null
  -> no simulated BROKER_RECEIVED, PARTIAL_FILL, or FILLED.

Files changed:
- mobile/src/services/brokers/brokerAdapters.js
- mobile/src/services/trade/basketExecutionStore.js
- mobile/app/queue-manager.js
- mobile/app/orders.js

Safety:
- No commit.
- No push.
- No REAL portfolio mutation.
- No REAL manual fill.
- No fake REAL broker receipt.
