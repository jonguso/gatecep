# PC-030M20AR6 — Canonical Security Picker & Conversation De-duplication

UAT correction only; portfolio mathematics are unchanged.

- Replaces free-text security identity with a searchable picker backed by the existing NSE security master.
- The scenario receives a symbol only after the investor selects a master security.
- Typed but unresolved text is blocked with a Coach G prompt instead of being analyzed as `Unknown`.
- Preserves canonical symbol/provider alias boundaries already established by M20AL–M20AN.
- Removes the duplicated `COACH G — PORTFOLIO FIT` explanation card. The conversation transcript is the single explanatory surface; accommodation controls remain immediately below it.
- Does not mutate REAL, Practice, goals, Investor DNA, FIFO, WAP, or Broker Action Plan execution boundaries.
