# PC-030M20AQ3A — Trading Subtitle Hotfix

Narrow follow-up to M20AQ3. M20AQ3 successfully moved Active Account and removed the lower Broker Evidence render, but its subtitle matcher depended on a `styles.subtitle` block before Decision Lab. This hotfix replaces only the exact obsolete sentence wherever it appears in `mobile/app/(tabs)/trading.js`.

No portfolio, FIFO, WAP, goals, risk/recovery, broker, or mutation logic is changed.
