# PC-030M20AU1 — Installer Correction

M20AU's selector service/component files extracted correctly, but the Trading-screen installer stopped before modifying `mobile/app/(tabs)/trading.js`.

Cause: the Python import-detection regex in the original installer was over-escaped and searched for a literal `\\s` instead of whitespace.

M20AU1 replaces that fragile import detection with a structural insertion boundary and broader current-source guards. It validates all required insertions before writing the Trading file.

No accounting, FIFO, goal, Investor DNA, portfolio mutation, execution, or Broker Action Plan logic is changed.
