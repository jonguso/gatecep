# PC-030M20AR7A — Windows UTF-8 Apply Fix

This is a packaging/apply-script correction for PC-030M20AR7.

The original M20AR7 apply script used Python `Path.read_text()` without an explicit encoding. On Windows Python 3.14 this can default to cp1252, which failed on existing UTF-8 punctuation in `mobile/app/(tabs)/trading.js` before any M20AR7 code was written.

M20AR7A changes only the apply script so it reads and writes the Trading source explicitly as UTF-8. The canonical NSE dropdown feature, verifier, Coach G logic, portfolio calculations, FIFO/WAP, Investor DNA and Broker Action Plan boundaries are unchanged.
