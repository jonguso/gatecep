# PC-030M20AT2A — Route Contract Correction

M20AT2's pure calculation service was correct, but the apply script assumed:
`const params = useLocalSearchParams();`

The current Trade Lab actually uses direct destructuring:
`const { ... } = useLocalSearchParams();`

This correction patches that real contract instead.

It also strengthens the UX boundary:
- Decision Lab `decisionAmount` and `decisionLab` are added to the existing destructuring.
- Quantity auto-seeds only from a valid current price.
- SELL remains capped to the actual holding.
- BUY remains charge-aware.
- A manual quantity edit sets an explicit flag and is never overwritten by the auto-seed effect.
- Changing the security deliberately allows a fresh estimate for the new security.
- The quantity remains labelled as an editable scenario estimate, never execution evidence.
