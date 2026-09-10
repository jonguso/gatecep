# PC-030M20AO — FIFO Acquisition Date Normalization

Reuses the existing M20AJ transaction-date normalization service in FIFO reconstruction and display.

Integrity boundaries:
- Existing `lot.date`, `acquisitionDate`, and `saleDate` source values are preserved.
- New normalized ISO date metadata is derived for analysis/display.
- Trade displays `normalizedDate` when available and falls back to the original date.
- No quantities, fees, WAP, cost-basis, realized P/L, REAL portfolio or Practice portfolio values are changed.
- No second date parser is introduced.

Install from `~/gatecep`:

```bash
unzip -o ~/Downloads/gatecep-pc030m20ao-fifo-acquisition-date-normalization.zip
chmod +x scripts/apply-pc030m20ao-fifo-acquisition-date-normalization.sh
chmod +x scripts/verify-pc030m20ao-fifo-acquisition-date-normalization.sh
bash scripts/apply-pc030m20ao-fifo-acquisition-date-normalization.sh
bash scripts/verify-pc030m20ao-fifo-acquisition-date-normalization.sh
```
