PC-028U — Real Behavior History LIVE Integration

Confirmed sources:
- Coach G recommendations: recommendationHistory via recommendationLifecycleStore
- Real order evidence: executionAuditTrail via executionAuditStore
- Real trade/transaction history: transactionHistory from upload/manual transaction flow

Excluded:
- activeBasketExecution as durable history
- simulatedTrades / gatecepSimulatedTrades
- practiceDecisionJournal
- unknown or Simulation execution events

Why executionAuditTrail for orders:
activeBasketExecution is only the current basket and can be cleared/replaced. executionAuditTrail persists event history (bounded to 1,000 events). PC-028U reduces real audit events to the latest state per order.

Install:
cd ~/gatecep/mobile
python scripts/apply-pc028u-live.py
bash scripts/verify-pc028u-live.sh
npx expo start -c
