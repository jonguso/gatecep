# PC-030M9C — REAL Monthly Review and Timeline Alignment

This update makes Foundation the default Investor Timeline category and keeps Monthly Review inside that parent journey.

Monthly Review now reads canonical REAL All Accounts holdings, canonical REAL cash, and canonical REAL behavior history. Missing or expired authentication fails closed; Practice is never substituted.

The broker identity boundary now distinguishes the investor CDS from the broker client account. For AIB exports, the filename/account identifier is checked against CDS while Client Code is checked against the selected broker client account.

The Menu now exposes one **Sync & Reconcile** destination instead of separate Sync Center and Upload Center entries.

## Verify

```bash
chmod +x scripts/verify-pc030m9c-real-monthly-timeline-alignment.sh
bash scripts/verify-pc030m9c-real-monthly-timeline-alignment.sh
```
