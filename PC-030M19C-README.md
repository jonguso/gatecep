# PC-030M19C — Canonical REAL Activity

This update extends the broker-execution boundary across every investor-facing activity consumer.

- Coach G behavior analysis reads only validated broker executions.
- Alerts and synchronization counts exclude incomplete legacy transaction rows.
- Portfolio Activity shows broker execution dates and references.
- GateCEP's order and execution audit stores remain Practice-only and cannot become REAL evidence.
- The canonical reader revalidates stored records instead of trusting a storage-key name.

Run from `mobile`:

```bash
bash scripts/verify-pc030m19c-canonical-real-activity.sh
```
