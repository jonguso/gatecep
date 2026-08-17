# PC-030M5D — Sector Direction and UI Deduplication

## Corrections

- Sector arrows are now calculated from the securities' aggregated REAL invested cost and current market value.
- A gaining sector shows a green `▲` and positive return percentage.
- A losing sector shows a red `▼` and negative return percentage.
- An unchanged sector shows a neutral `—`.
- Missing cost evidence shows `N/A`; GateCEP does not infer a gain or loss.
- Sector weight remains separate from sector return.
- The duplicate **Holdings Detail** link has been removed from **More**. The Holdings tab and its **View All Holdings** action remain the single investor path.

## Verify

```bash
chmod +x scripts/verify-pc030m5d-sector-direction-dedup.sh
bash scripts/verify-pc030m5d-sector-direction-dedup.sh
```
